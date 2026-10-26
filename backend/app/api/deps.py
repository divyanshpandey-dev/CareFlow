from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.core.security import decode_token
from backend.app.models.enums import UserRole
from backend.app.models.user import User, PatientProfile
from backend.app.models.hospital import DoctorProfile

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validates the Bearer JWT access token and loads the active user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject identifier missing.",
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled or does not exist.",
        )
    
    return user


from backend.app.core.config import settings

class RoleChecker:
    """Enforces least-privilege role-based access control."""
    def __init__(self, allowed_roles: List[UserRole]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in self.allowed_roles]}. User role: {current_user.role.value}",
            )
        if current_user.role == UserRole.SUPER_ADMIN:
            if not current_user.email or current_user.email.strip().lower() not in settings.super_admin_email_list:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Super Admin email is not present in server allowlist.",
                )
        return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Strictly enforces active status, SUPER_ADMIN role, and normalized email allowlist."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super Administrator privileges required.",
        )
    if not current_user.email or current_user.email.strip().lower() not in settings.super_admin_email_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator email is not present in server allowlist.",
        )
    return current_user


async def get_current_patient(
    current_user: User = Depends(RoleChecker([UserRole.PATIENT])),
    db: AsyncSession = Depends(get_db),
) -> PatientProfile:
    """Resolves the PatientProfile for the authenticated patient."""
    stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found for current user.",
        )
    return patient


async def get_current_doctor(
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR])),
    db: AsyncSession = Depends(get_db),
) -> DoctorProfile:
    """Resolves the DoctorProfile for the authenticated clinician."""
    stmt = select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found for current clinician.",
        )
    return doctor


class HospitalAdminContext:
    def __init__(self, user: User, assignment: Optional[Any], hospital: Any):
        self.user = user
        self.assignment = assignment
        self.hospital = hospital
        self.hospital_id: str = hospital.id


async def get_current_hospital_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HospitalAdminContext:
    """
    Enforces strict ground-level isolation:
    1. Authenticated user must have UserRole.HOSPITAL_ADMIN
    2. Must be bound to an active Hospital
    3. If HospitalAdminAssignment exists, must be in ACTIVE status
    """
    if current_user.role != UserRole.HOSPITAL_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Hospital Administrator privileges required. Current role: {current_user.role.value}",
        )

    from backend.app.models.hospital_admin import HospitalAdminAssignment
    from backend.app.models.hospital import Hospital

    stmt = (
        select(HospitalAdminAssignment)
        .where(HospitalAdminAssignment.admin_user_id == current_user.id)
        .order_by(HospitalAdminAssignment.created_at.desc())
    )
    assignment = (await db.execute(stmt)).scalars().first()

    hospital_id = assignment.hospital_id if assignment else current_user.hospital_id
    if not hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. No hospital assigned to this Hospital Administrator account.",
        )

    if assignment and assignment.status in ["SUSPENDED", "REVOKED"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Hospital Administrator assignment is currently {assignment.status}.",
        )

    hosp = (await db.execute(select(Hospital).where(Hospital.id == hospital_id))).scalar_one_or_none()
    if not hosp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned hospital facility does not exist.",
        )

    if not hosp.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. The assigned hospital facility is currently inactive.",
        )

    return HospitalAdminContext(user=current_user, assignment=assignment, hospital=hosp)
