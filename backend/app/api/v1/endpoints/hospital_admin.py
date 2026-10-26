import re
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.api.deps import HospitalAdminContext, get_current_hospital_admin
from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.appointment import Appointment, QueueTicket
from backend.app.models.audit import AuditLog
from backend.app.models.base import generate_uuid
from backend.app.models.clinical import Encounter, LabOrder, LabReport, PatientDocument, Prescription
from backend.app.models.enums import AppointmentStatus, Gender, QueueState, UserRole
from backend.app.models.hospital import Department, DoctorProfile, DoctorSchedule, Hospital
from backend.app.models.hospital_admin import HospitalAdminAssignment
from backend.app.models.session import AdminSession
from backend.app.models.user import PatientProfile, User
from backend.app.services.queue_service import QueueService

router = APIRouter()


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------
class CreateDepartmentRequest(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2, max_length=15)
    description: Optional[str] = None


class CreateStaffRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    phone: str = Field(..., min_length=8)
    password: str = Field(default="password123", min_length=6)
    role: str = Field(..., description="RECEPTIONIST or LAB_TECH")


class CreateDoctorRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    phone: str = Field(..., min_length=8)
    password: str = Field(default="DoctorPass@123", min_length=6)
    department_id: Optional[str] = None
    specialization: str = Field(..., min_length=2)
    qualification: str = Field(..., min_length=2)
    license_number: str = Field(..., min_length=3)
    room_number: str = Field(default="Room 101")
    consultation_fee: float = Field(default=500.0, ge=0.0)
    experience_years: int = Field(default=3, ge=0)
    listing_status: str = Field(default="APPROVED")


class UpdateDoctorStatusRequest(BaseModel):
    listing_status: Optional[str] = None
    is_verified: Optional[bool] = None


class RegisterWalkInPatientRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10)
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None


class UpdateDoctorRoomRequest(BaseModel):
    room_number: str = Field(..., min_length=1)
    consultation_fee: Optional[float] = None


class CreateScheduleRequest(BaseModel):
    doctor_id: str
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., description="HH:MM:SS or HH:MM")
    end_time: str = Field(..., description="HH:MM:SS or HH:MM")
    max_patients: int = Field(default=20, ge=1, le=100)


class QueueStepRequest(BaseModel):
    doctor_id: str


class BroadcastLocalAlertRequest(BaseModel):
    title: str = Field(..., min_length=3)
    message: str = Field(..., min_length=5)
    severity: str = Field(default="INFO")  # INFO, WARNING, EMERGENCY


# ---------------------------------------------------------------------------
# Scope & Operations Endpoints
# ---------------------------------------------------------------------------
@router.get("/scope")
async def get_hospital_admin_scope(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Ground-Level Operational Scope Summary:
    Returns the assigned facility card, admin binding, and live ground metrics.
    """
    hosp = ctx.hospital
    today = date.today()

    # Department count
    dept_stmt = select(func.count(Department.id)).where(Department.hospital_id == hosp.id)
    depts_count = (await db.execute(dept_stmt)).scalar() or 0

    # Doctors count
    doc_total_stmt = select(func.count(DoctorProfile.id)).where(DoctorProfile.hospital_id == hosp.id)
    total_doctors = (await db.execute(doc_total_stmt)).scalar() or 0

    doc_active_stmt = select(func.count(DoctorProfile.id)).where(
        DoctorProfile.hospital_id == hosp.id,
        DoctorProfile.is_verified == True,
    )
    active_doctors = (await db.execute(doc_active_stmt)).scalar() or 0

    # Today's Appointments
    appt_stmt = select(func.count(Appointment.id)).where(
        Appointment.hospital_id == hosp.id,
        Appointment.appointment_date == today,
    )
    todays_appts = (await db.execute(appt_stmt)).scalar() or 0

    # Queue Metrics
    waiting_stmt = select(func.count(QueueTicket.id)).where(
        QueueTicket.hospital_id == hosp.id,
        func.date(QueueTicket.check_in_time) == today,
        QueueTicket.state == QueueState.WAITING,
    )
    waiting_count = (await db.execute(waiting_stmt)).scalar() or 0

    consulting_stmt = select(func.count(QueueTicket.id)).where(
        QueueTicket.hospital_id == hosp.id,
        func.date(QueueTicket.check_in_time) == today,
        QueueTicket.state == QueueState.IN_CONSULTATION,
    )
    consulting_count = (await db.execute(consulting_stmt)).scalar() or 0

    completed_stmt = select(func.count(QueueTicket.id)).where(
        QueueTicket.hospital_id == hosp.id,
        func.date(QueueTicket.check_in_time) == today,
        QueueTicket.state == QueueState.COMPLETED,
    )
    completed_count = (await db.execute(completed_stmt)).scalar() or 0

    # Lab Orders
    lab_stmt = (
        select(func.count(LabOrder.id))
        .join(Encounter, LabOrder.encounter_id == Encounter.id)
        .join(Appointment, Encounter.appointment_id == Appointment.id)
        .where(Appointment.hospital_id == hosp.id)
    )
    total_lab_orders = (await db.execute(lab_stmt)).scalar() or 0

    return {
        "hospital": {
            "id": hosp.id,
            "name": hosp.name,
            "slug": hosp.slug,
            "hfr_id": hosp.hfr_id,
            "city": hosp.city,
            "state": hosp.state,
            "address": hosp.address,
            "is_verified": hosp.is_verified,
            "is_active": hosp.is_active,
            "qr_checkin_token": hosp.qr_checkin_token,
        },
        "admin": {
            "id": ctx.assignment.id if ctx.assignment else ctx.user.id,
            "admin_display_id": ctx.assignment.admin_display_id if ctx.assignment else f"ADM-{hosp.city.upper()}-001",
            "full_name": ctx.user.full_name,
            "email": ctx.user.email,
            "phone": ctx.user.phone,
            "status": ctx.assignment.status if ctx.assignment else "ACTIVE",
            "assigned_at": ctx.assignment.assigned_at.isoformat() if ctx.assignment else "",
        },
        "metrics": {
            "departments_count": depts_count,
            "total_doctors": total_doctors,
            "active_doctors": active_doctors,
            "todays_appointments": todays_appts,
            "waiting_in_queue": waiting_count,
            "in_consultation": consulting_count,
            "completed_today": completed_count,
            "total_lab_orders": total_lab_orders,
        },
        "emergency_status": "NORMAL" if waiting_count < 15 else "HIGH_LOAD",
    }


# ---------------------------------------------------------------------------
# Departments Management
# ---------------------------------------------------------------------------
@router.get("/departments")
async def get_hospital_departments(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Department)
        .options(selectinload(Department.doctors))
        .where(Department.hospital_id == ctx.hospital_id)
        .order_by(Department.name)
    )
    result = await db.execute(stmt)
    depts = result.scalars().all()

    return [
        {
            "id": d.id,
            "hospital_id": d.hospital_id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "doctors_count": len(d.doctors),
            "created_at": d.created_at.isoformat() if d.created_at else "",
        }
        for d in depts
    ]


@router.post("/departments", status_code=status.HTTP_201_CREATED)
async def create_hospital_department(
    payload: CreateDepartmentRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    clean_code = payload.code.strip().upper()
    existing = (
        await db.execute(
            select(Department).where(
                Department.hospital_id == ctx.hospital_id,
                func.upper(Department.code) == clean_code,
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department code '{clean_code}' already exists in this hospital.",
        )

    dept = Department(
        hospital_id=ctx.hospital_id,
        name=payload.name.strip(),
        code=clean_code,
        description=payload.description,
    )
    db.add(dept)
    await db.flush()

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DEPARTMENT_CREATED",
        resource_type="DEPARTMENT",
        resource_id=dept.id,
        status="SUCCESS",
        details_json={"department_name": dept.name, "code": dept.code, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(dept)

    return {
        "status": "DEPARTMENT_CREATED",
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
    }


@router.delete("/departments/{department_id}")
async def delete_department(
    department_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Department).where(
        Department.id == department_id,
        Department.hospital_id == ctx.hospital_id,
    )
    dept = (await db.execute(stmt)).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in this hospital.")

    dept_name = dept.name
    # Unlink or handle doctor profiles in this department
    doc_profiles = (await db.execute(select(DoctorProfile).where(DoctorProfile.department_id == department_id))).scalars().all()
    other_dept = (await db.execute(select(Department).where(Department.hospital_id == ctx.hospital_id, Department.id != department_id))).scalar_one_or_none()
    for dp in doc_profiles:
        if other_dept:
            dp.department_id = other_dept.id
        else:
            await db.execute(delete(DoctorSchedule).where(DoctorSchedule.doctor_id == dp.id))
            await db.delete(dp)

    await db.delete(dept)

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DEPARTMENT_PERMANENTLY_DELETED",
        resource_type="DEPARTMENT",
        resource_id=department_id,
        status="SUCCESS",
        details_json={"department_name": dept_name, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "DEPARTMENT_DELETED",
        "department_id": department_id,
        "message": f"Department '{dept_name}' has been permanently deleted.",
    }


# ---------------------------------------------------------------------------
# Staff Management
# ---------------------------------------------------------------------------
@router.get("/staff")
async def get_hospital_staff(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(User)
        .where(
            User.hospital_id == ctx.hospital_id,
            User.role.in_([UserRole.RECEPTIONIST, UserRole.LAB_TECH]),
        )
        .order_by(User.full_name)
    )
    result = await db.execute(stmt)
    staff_members = result.scalars().all()

    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role.value,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else "",
        }
        for u in staff_members
    ]


@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def create_hospital_staff(
    payload: CreateStaffRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    clean_role = payload.role.strip().upper()
    if clean_role not in ["RECEPTIONIST", "LAB_TECH"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be RECEPTIONIST or LAB_TECH.",
        )

    clean_email = payload.email.strip().lower()
    clean_phone = payload.phone.strip()
    dup = (
        await db.execute(
            select(User).where(or_(func.lower(User.email) == clean_email, User.phone == clean_phone))
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with this email ({clean_email}) or phone ({clean_phone}) already exists.",
        )

    user = User(
        email=clean_email,
        phone=clean_phone,
        password_hash=get_password_hash(payload.password or "password123"),
        full_name=payload.full_name.strip(),
        role=UserRole[clean_role],
        hospital_id=ctx.hospital_id,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="HOSPITAL_STAFF_CREATED",
        resource_type="USER",
        resource_id=user.id,
        status="SUCCESS",
        details_json={"staff_name": user.full_name, "role": clean_role, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(user)

    return {
        "status": "STAFF_CREATED",
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
    }


@router.put("/staff/{staff_id}/suspend")
async def suspend_hospital_staff(
    staff_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(
        User.id == staff_id,
        User.hospital_id == ctx.hospital_id,
        User.role.in_([UserRole.RECEPTIONIST, UserRole.LAB_TECH]),
    )
    staff = (await db.execute(stmt)).scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found in this facility.")

    staff.is_active = False
    audit = AuditLog(
        actor_id=ctx.user.id,
        action="HOSPITAL_STAFF_SUSPENDED",
        resource_type="USER",
        resource_id=staff.id,
        status="SUCCESS",
        details_json={"staff_name": staff.full_name, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()
    return {"status": "STAFF_SUSPENDED", "staff_id": staff.id, "is_active": False}


@router.put("/staff/{staff_id}/reactivate")
async def reactivate_hospital_staff(
    staff_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(
        User.id == staff_id,
        User.hospital_id == ctx.hospital_id,
        User.role.in_([UserRole.RECEPTIONIST, UserRole.LAB_TECH]),
    )
    staff = (await db.execute(stmt)).scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found in this facility.")

    staff.is_active = True
    audit = AuditLog(
        actor_id=ctx.user.id,
        action="HOSPITAL_STAFF_REACTIVATED",
        resource_type="USER",
        resource_id=staff.id,
        status="SUCCESS",
        details_json={"staff_name": staff.full_name, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()
    return {"status": "STAFF_REACTIVATED", "staff_id": staff.id, "is_active": True}


@router.delete("/staff/{staff_id}")
async def delete_hospital_staff(
    staff_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(
        User.id == staff_id,
        User.hospital_id == ctx.hospital_id,
        User.role.in_([UserRole.RECEPTIONIST, UserRole.LAB_TECH]),
    )
    staff = (await db.execute(stmt)).scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found in this facility.")

    staff_name = staff.full_name
    await db.execute(delete(AdminSession).where(AdminSession.user_id == staff.id))
    await db.delete(staff)

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="HOSPITAL_STAFF_PERMANENTLY_DELETED",
        resource_type="USER",
        resource_id=staff_id,
        status="SUCCESS",
        details_json={"staff_name": staff_name, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "STAFF_DELETED",
        "staff_id": staff_id,
        "message": f"Staff member '{staff_name}' has been permanently deleted.",
    }


# ---------------------------------------------------------------------------
# Doctors & Room Assignment
# ---------------------------------------------------------------------------
@router.get("/doctors")
async def get_hospital_doctors(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .options(
            selectinload(DoctorProfile.user),
            selectinload(DoctorProfile.department),
            selectinload(DoctorProfile.schedules),
        )
        .where(DoctorProfile.hospital_id == ctx.hospital_id)
        .order_by(DoctorProfile.specialization)
    )
    result = await db.execute(stmt)
    doctors = result.scalars().all()

    return [
        {
            "id": d.id,
            "user_id": d.user_id,
            "full_name": d.user.full_name if d.user else "Dr. Unknown",
            "email": d.user.email if d.user else "",
            "phone": d.user.phone if d.user else "",
            "department_id": d.department_id,
            "department_name": d.department.name if d.department else "General",
            "specialization": d.specialization,
            "qualification": d.qualification,
            "license_number": d.license_number,
            "room_number": d.room_number or "Room 101",
            "consultation_fee": d.consultation_fee,
            "experience_years": d.experience_years,
            "listing_status": d.listing_status or "APPROVED",
            "is_verified": d.is_verified,
            "schedules_count": len(d.schedules),
        }
        for d in doctors
    ]


@router.post("/doctors", status_code=status.HTTP_201_CREATED)
async def create_hospital_doctor(
    payload: CreateDoctorRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Hospital Admin Doctor Onboarding:
    Registers a new doctor, binds profile to the admin's hospital, and initialises default OPD schedules.
    """
    # Check if user already exists
    existing_user = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()

    if existing_user:
        if existing_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email already registered under {existing_user.role.value} role.",
            )
        # Check if already has a profile at this hospital
        existing_doc = (
            await db.execute(
                select(DoctorProfile).where(
                    DoctorProfile.user_id == existing_user.id,
                    DoctorProfile.hospital_id == ctx.hospital_id,
                )
            )
        ).scalar_one_or_none()
        if existing_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor is already affiliated with this hospital.",
            )
        doctor_user = existing_user
    else:
        # Create user account
        doctor_user = User(
            id=generate_uuid(),
            email=payload.email.lower(),
            phone=payload.phone.strip(),
            full_name=payload.full_name.strip(),
            password_hash=get_password_hash(payload.password),
            role=UserRole.DOCTOR,
            is_active=True,
        )
        db.add(doctor_user)
        await db.flush()

    # Department validation or default
    dept_id = payload.department_id
    if dept_id:
        dept = (
            await db.execute(
                select(Department).where(
                    Department.id == dept_id,
                    Department.hospital_id == ctx.hospital_id,
                )
            )
        ).scalar_one_or_none()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found in this hospital.",
            )
    else:
        # Fall back to first available department in this hospital
        dept = (
            await db.execute(
                select(Department).where(Department.hospital_id == ctx.hospital_id)
            )
        ).scalars().first()
        dept_id = dept.id if dept else None

    # Create DoctorProfile
    doc = DoctorProfile(
        id=generate_uuid(),
        user_id=doctor_user.id,
        hospital_id=ctx.hospital_id,
        department_id=dept_id,
        specialization=payload.specialization.strip(),
        qualification=payload.qualification.strip(),
        registration_number=payload.license_number.strip(),
        room_number=payload.room_number.strip(),
        consultation_fee=payload.consultation_fee,
        experience_years=payload.experience_years,
        listing_status=payload.listing_status,
        is_verified=True,
    )
    db.add(doc)
    await db.flush()

    # Create default schedules (Monday to Friday, 09:00 - 17:00)
    for day in range(5):
        sched = DoctorSchedule(
            id=generate_uuid(),
            doctor_id=doc.id,
            day_of_week=day,
            start_time=time(9, 0, 0),
            end_time=time(17, 0, 0),
            slot_duration_minutes=15,
            max_patients_per_session=30,
            is_active=True,
        )
        db.add(sched)

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_ONBOARDED",
        resource_type="DOCTOR",
        resource_id=doc.id,
        status="SUCCESS",
        details_json={
            "doctor_name": payload.full_name,
            "specialization": payload.specialization,
            "license_number": payload.license_number,
            "hospital_id": ctx.hospital_id,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "DOCTOR_CREATED",
        "id": doc.id,
        "user_id": doctor_user.id,
        "full_name": doctor_user.full_name,
        "email": doctor_user.email,
        "phone": doctor_user.phone,
        "specialization": doc.specialization,
        "qualification": doc.qualification,
        "room_number": doc.room_number,
        "consultation_fee": doc.consultation_fee,
        "listing_status": doc.listing_status,
        "is_verified": doc.is_verified,
    }


@router.put("/doctors/{doctor_id}/status")
async def update_doctor_status(
    doctor_id: str,
    payload: UpdateDoctorStatusRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.user))
        .where(
            or_(DoctorProfile.id == doctor_id, DoctorProfile.user_id == doctor_id),
            DoctorProfile.hospital_id == ctx.hospital_id,
        )
    )
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found in this hospital.",
        )

    if payload.listing_status is not None:
        doc.listing_status = payload.listing_status
    if payload.is_verified is not None:
        doc.is_verified = payload.is_verified

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_STATUS_UPDATED",
        resource_type="DOCTOR",
        resource_id=doc.id,
        status="SUCCESS",
        details_json={
            "listing_status": doc.listing_status,
            "is_verified": doc.is_verified,
            "hospital_id": ctx.hospital_id,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "DOCTOR_STATUS_UPDATED",
        "doctor_id": doc.id,
        "listing_status": doc.listing_status,
        "is_verified": doc.is_verified,
    }


@router.put("/doctors/{doctor_id}/suspend")
async def suspend_hospital_doctor(
    doctor_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.user))
        .where(
            or_(DoctorProfile.id == doctor_id, DoctorProfile.user_id == doctor_id),
            DoctorProfile.hospital_id == ctx.hospital_id,
        )
    )
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found in this hospital.",
        )

    doc.listing_status = "SUSPENDED"
    doc.is_verified = False

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_SUSPENDED",
        resource_type="DOCTOR",
        resource_id=doc.id,
        status="SUCCESS",
        details_json={
            "listing_status": doc.listing_status,
            "is_verified": doc.is_verified,
            "hospital_id": ctx.hospital_id,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "DOCTOR_SUSPENDED",
        "doctor_id": doc.id,
        "listing_status": "SUSPENDED",
        "is_verified": False,
    }


@router.put("/doctors/{doctor_id}/reactivate")
async def reactivate_hospital_doctor(
    doctor_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.user))
        .where(
            or_(DoctorProfile.id == doctor_id, DoctorProfile.user_id == doctor_id),
            DoctorProfile.hospital_id == ctx.hospital_id,
        )
    )
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found in this hospital.",
        )

    doc.listing_status = "APPROVED"
    doc.is_verified = True

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_VERIFIED",
        resource_type="DOCTOR",
        resource_id=doc.id,
        status="SUCCESS",
        details_json={
            "listing_status": doc.listing_status,
            "is_verified": doc.is_verified,
            "hospital_id": ctx.hospital_id,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "DOCTOR_REACTIVATED",
        "doctor_id": doc.id,
        "listing_status": "APPROVED",
        "is_verified": True,
    }


@router.delete("/doctors/{doctor_id}")
async def delete_hospital_doctor(
    doctor_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.user))
        .where(
            or_(DoctorProfile.id == doctor_id, DoctorProfile.user_id == doctor_id),
            DoctorProfile.hospital_id == ctx.hospital_id,
        )
    )
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found in this hospital.",
        )

    doc_name = doc.user.full_name if doc.user else "Doctor"
    user_id_to_delete = doc.user_id
    doc_profile_id = doc.id

    # Clean up DoctorSchedule
    await db.execute(delete(DoctorSchedule).where(DoctorSchedule.doctor_id == doc_profile_id))

    # Clean up QueueTickets and Appointments for this hospital and doctor
    await db.execute(delete(QueueTicket).where(QueueTicket.doctor_id == doc_profile_id))
    await db.execute(delete(Appointment).where(Appointment.doctor_id == doc_profile_id))

    # Delete doctor profile
    await db.delete(doc)

    # If the user has no other hospital profile, remove user account
    if user_id_to_delete:
        other_profiles = (await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == user_id_to_delete))).scalars().all()
        if not other_profiles:
            await db.execute(delete(AdminSession).where(AdminSession.user_id == user_id_to_delete))
            usr = (await db.execute(select(User).where(User.id == user_id_to_delete))).scalar_one_or_none()
            if usr:
                await db.delete(usr)

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_PERMANENTLY_DELETED",
        resource_type="DOCTOR",
        resource_id=doc_profile_id,
        status="SUCCESS",
        details_json={"doctor_name": doc_name, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "DOCTOR_DELETED",
        "doctor_id": doc_profile_id,
        "message": f"Dr. {doc_name} has been permanently removed from this facility.",
    }


@router.put("/doctors/{doctor_id}/room")
async def update_doctor_room(
    doctor_id: str,
    payload: UpdateDoctorRoomRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DoctorProfile).where(
        DoctorProfile.id == doctor_id,
        DoctorProfile.hospital_id == ctx.hospital_id,
    )
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found in this hospital.",
        )

    doc.room_number = payload.room_number.strip()
    if payload.consultation_fee is not None:
        doc.consultation_fee = payload.consultation_fee

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_ROOM_ASSIGNED",
        resource_type="DOCTOR",
        resource_id=doc.id,
        status="SUCCESS",
        details_json={"room_number": doc.room_number, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "DOCTOR_ROOM_UPDATED",
        "doctor_id": doc.id,
        "room_number": doc.room_number,
        "consultation_fee": doc.consultation_fee,
    }


# ---------------------------------------------------------------------------
# Doctor Schedules
# ---------------------------------------------------------------------------
@router.get("/schedules")
async def get_hospital_schedules(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorSchedule)
        .join(DoctorProfile, DoctorSchedule.doctor_id == DoctorProfile.id)
        .options(
            selectinload(DoctorSchedule.doctor).selectinload(DoctorProfile.user),
            selectinload(DoctorSchedule.doctor).selectinload(DoctorProfile.department),
        )
        .where(DoctorProfile.hospital_id == ctx.hospital_id)
        .order_by(DoctorSchedule.day_of_week, DoctorSchedule.start_time)
    )
    result = await db.execute(stmt)
    schedules = result.scalars().all()

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return [
        {
            "id": s.id,
            "doctor_id": s.doctor_id,
            "doctor_name": s.doctor.user.full_name if (s.doctor and s.doctor.user) else "Doctor",
            "department_name": s.doctor.department.name if (s.doctor and s.doctor.department) else "OPD",
            "day_of_week": s.day_of_week,
            "day_name": days[s.day_of_week] if 0 <= s.day_of_week < len(days) else str(s.day_of_week),
            "start_time": s.start_time.isoformat() if s.start_time else "",
            "end_time": s.end_time.isoformat() if s.end_time else "",
            "slot_duration_minutes": s.slot_duration_minutes,
            "max_patients": s.max_patients,
            "is_active": s.is_active,
        }
        for s in schedules
    ]


@router.post("/schedules", status_code=status.HTTP_201_CREATED)
async def create_doctor_schedule(
    payload: CreateScheduleRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(DoctorProfile).where(
                DoctorProfile.id == payload.doctor_id,
                DoctorProfile.hospital_id == ctx.hospital_id,
            )
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in this hospital.")

    def parse_time(t_str: str) -> time:
        parts = [int(p) for p in t_str.split(":")]
        if len(parts) == 2:
            return time(parts[0], parts[1], 0)
        return time(parts[0], parts[1], parts[2])

    st = parse_time(payload.start_time)
    et = parse_time(payload.end_time)

    schedule = DoctorSchedule(
        doctor_id=doc.id,
        day_of_week=payload.day_of_week,
        start_time=st,
        end_time=et,
        max_patients_per_session=payload.max_patients,
        is_active=True,
    )
    db.add(schedule)
    await db.flush()

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="DOCTOR_SCHEDULE_CREATED",
        resource_type="DOCTOR_SCHEDULE",
        resource_id=schedule.id,
        status="SUCCESS",
        details_json={"doctor_id": doc.id, "day": payload.day_of_week, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(schedule)

    return {
        "status": "SCHEDULE_CREATED",
        "id": schedule.id,
        "doctor_id": schedule.doctor_id,
        "day_of_week": schedule.day_of_week,
    }


# ---------------------------------------------------------------------------
# Patient Registry & Journey (Hospital Scoped)
# ---------------------------------------------------------------------------
@router.get("/patients")
async def get_hospital_patients(
    q: Optional[str] = Query(None, description="Search by name, phone, or CareFlow ID"),
    limit: int = Query(50, le=100),
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Hospital-scoped patient directory:
    Lists patients who have registered or had appointments at this hospital.
    """
    # Subquery for patient IDs who had appointments at this hospital
    appt_subq = (
        select(Appointment.patient_id)
        .where(Appointment.hospital_id == ctx.hospital_id)
        .distinct()
    )

    stmt = (
        select(PatientProfile)
        .options(selectinload(PatientProfile.user))
        .join(User, PatientProfile.user_id == User.id)
    )

    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                PatientProfile.patient_identifier.ilike(term),
                User.full_name.ilike(term),
                User.phone.ilike(term),
                User.email.ilike(term),
            )
        )
    else:
        # Default to patients connected to this hospital
        stmt = stmt.where(PatientProfile.id.in_(appt_subq))

    stmt = stmt.order_by(PatientProfile.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    profiles = result.scalars().all()

    output = []
    for p in profiles:
        # Count appointments at this hospital
        appt_count_stmt = select(func.count(Appointment.id)).where(
            Appointment.patient_id == p.id,
            Appointment.hospital_id == ctx.hospital_id,
        )
        total_appts = (await db.execute(appt_count_stmt)).scalar() or 0

        # Last appointment at this hospital
        last_appt_stmt = (
            select(Appointment.appointment_date)
            .where(
                Appointment.patient_id == p.id,
                Appointment.hospital_id == ctx.hospital_id,
            )
            .order_by(Appointment.appointment_date.desc())
            .limit(1)
        )
        last_visit = (await db.execute(last_appt_stmt)).scalar()

        output.append({
            "id": p.id,
            "patient_identifier": p.patient_identifier or f"CF-PAT-{p.id[:6].upper()}",
            "full_name": p.user.full_name if p.user else "Patient",
            "email": p.user.email if p.user else "",
            "phone": p.user.phone if p.user else "",
            "age": p.age,
            "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
            "gender": p.gender.value if p.gender else "NOT_SPECIFIED",
            "blood_group": p.blood_group,
            "profile_completed": p.profile_completed,
            "hospital_appointments_count": total_appts,
            "last_visit_date": last_visit.isoformat() if last_visit else None,
        })
    return output


@router.post("/patients/register-walkin", status_code=status.HTTP_201_CREATED)
async def register_walkin_patient(
    payload: RegisterWalkInPatientRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Desk Walk-in Patient Registration:
    Creates a new patient profile with auto-generated CareFlow Patient ID.
    """
    phone = payload.phone.strip()
    email = payload.email.strip().lower() if payload.email else f"walkin_{phone}@careflow.local"

    # Check existing user
    user_stmt = select(User).where(or_(User.phone == phone, User.email == email))
    existing_user = (await db.execute(user_stmt)).scalar_one_or_none()

    if existing_user:
        # Check patient profile
        p_stmt = select(PatientProfile).where(PatientProfile.user_id == existing_user.id)
        existing_profile = (await db.execute(p_stmt)).scalar_one_or_none()
        if existing_profile:
            return {
                "status": "ALREADY_REGISTERED",
                "patient_id": existing_profile.id,
                "patient_identifier": existing_profile.patient_identifier,
                "full_name": existing_user.full_name,
                "phone": existing_user.phone,
                "message": "Patient is already registered in CareFlow system.",
            }
        patient_user = existing_user
    else:
        patient_user = User(
            id=generate_uuid(),
            email=email,
            phone=phone,
            full_name=payload.full_name.strip(),
            password_hash=get_password_hash("CareFlow@WalkIn2026"),
            role=UserRole.PATIENT,
            is_active=True,
        )
        db.add(patient_user)
        await db.flush()

    # Generate patient identifier CF-PAT-XXXXXX
    count_stmt = select(func.count(PatientProfile.id))
    total_patients = (await db.execute(count_stmt)).scalar() or 0
    patient_id_code = f"CF-PAT-{total_patients + 101:06d}"

    gender_enum = None
    if payload.gender:
        try:
            gender_enum = Gender(payload.gender.upper())
        except ValueError:
            pass

    profile = PatientProfile(
        id=generate_uuid(),
        user_id=patient_user.id,
        patient_identifier=patient_id_code,
        dob=payload.date_of_birth,
        gender=gender_enum,
        blood_group=payload.blood_group,
        address=payload.address,
        profile_completed=True,
    )
    db.add(profile)
    await db.flush()

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="WALKIN_PATIENT_REGISTERED",
        resource_type="PATIENT",
        resource_id=profile.id,
        status="SUCCESS",
        details_json={
            "patient_identifier": patient_id_code,
            "patient_name": payload.full_name,
            "hospital_id": ctx.hospital_id,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(profile)

    return {
        "status": "REGISTERED",
        "patient_id": profile.id,
        "patient_identifier": profile.patient_identifier,
        "full_name": patient_user.full_name,
        "phone": patient_user.phone,
        "email": patient_user.email,
        "age": profile.age,
    }


@router.get("/patients/{patient_id}")
async def get_hospital_patient_detail(
    patient_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Comprehensive hospital-scoped patient record & care journey tracker.
    """
    stmt = (
        select(PatientProfile)
        .options(selectinload(PatientProfile.user))
        .where(PatientProfile.id == patient_id)
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    # Scoped appointments at this hospital
    appt_stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.department),
            selectinload(Appointment.queue_ticket),
        )
        .where(
            Appointment.patient_id == profile.id,
            Appointment.hospital_id == ctx.hospital_id,
        )
        .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
    )
    appts = (await db.execute(appt_stmt)).scalars().all()

    # Scoped prescriptions issued by doctors at this hospital
    rx_stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.items),
            selectinload(Prescription.doctor).selectinload(DoctorProfile.user),
        )
        .join(DoctorProfile, Prescription.doctor_id == DoctorProfile.id)
        .where(
            Prescription.patient_id == profile.id,
            DoctorProfile.hospital_id == ctx.hospital_id,
        )
        .order_by(Prescription.created_at.desc())
    )
    prescriptions = (await db.execute(rx_stmt)).scalars().all()

    # Scoped lab orders for this patient associated with this hospital
    lab_stmt = (
        select(LabOrder)
        .join(Encounter, LabOrder.encounter_id == Encounter.id)
        .join(Appointment, Encounter.appointment_id == Appointment.id)
        .options(
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.user),
            selectinload(LabOrder.report),
        )
        .where(
            LabOrder.patient_id == profile.id,
            Appointment.hospital_id == ctx.hospital_id,
        )
        .order_by(LabOrder.created_at.desc())
    )
    labs = (await db.execute(lab_stmt)).scalars().all()

    # Patient documents
    doc_stmt = (
        select(PatientDocument)
        .where(
            PatientDocument.patient_id == profile.id,
            or_(
                PatientDocument.hospital_id == ctx.hospital_id,
                PatientDocument.hospital_id.is_(None),
            ),
        )
        .order_by(PatientDocument.created_at.desc())
    )
    docs = (await db.execute(doc_stmt)).scalars().all()

    # Construct Care Journey Timeline
    timeline_events = []
    for a in appts:
        timeline_events.append({
            "type": "APPOINTMENT",
            "date": a.appointment_date.isoformat(),
            "time": a.start_time.isoformat() if a.start_time else "",
            "title": f"Consultation with {a.doctor.user.full_name if (a.doctor and a.doctor.user) else 'Doctor'}",
            "department": a.doctor.department.name if (a.doctor and a.doctor.department) else "General",
            "status": a.status.value,
            "badge": a.status.value,
        })
    for rx in prescriptions:
        timeline_events.append({
            "type": "PRESCRIPTION",
            "date": rx.created_at.date().isoformat() if rx.created_at else "",
            "time": rx.created_at.strftime("%H:%M") if rx.created_at else "",
            "title": f"Prescription #{rx.prescription_number}",
            "department": f"{len(rx.items)} Medication(s)",
            "status": "ISSUED",
            "badge": "Digitally Signed",
            "verification_code": rx.verification_code,
        })
    for lb in labs:
        timeline_events.append({
            "type": "LAB_ORDER",
            "date": lb.created_at.date().isoformat() if lb.created_at else "",
            "time": lb.created_at.strftime("%H:%M") if lb.created_at else "",
            "title": f"Diagnostic: {lb.test_name}",
            "department": lb.priority.value if hasattr(lb.priority, "value") else str(lb.priority),
            "status": lb.status.value if hasattr(lb.status, "value") else str(lb.status),
            "badge": "Abnormal" if (lb.report and lb.report.abnormal_flags) else "Normal",
        })
    timeline_events.sort(key=lambda x: (x["date"], x.get("time", "")), reverse=True)

    return {
        "profile": {
            "id": profile.id,
            "patient_identifier": profile.patient_identifier or f"CF-PAT-{profile.id[:6].upper()}",
            "full_name": profile.user.full_name if profile.user else "Patient",
            "email": profile.user.email if profile.user else "",
            "phone": profile.user.phone if profile.user else "",
            "age": profile.age,
            "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
            "gender": profile.gender.value if profile.gender else "NOT_SPECIFIED",
            "blood_group": profile.blood_group,
            "address": profile.address,
            "preferred_language": profile.preferred_language,
            "profile_completed": profile.profile_completed,
            "id_verified": profile.id_verified,
            "id_document_type": profile.id_document_type,
            "id_document_masked": profile.id_document_masked,
        },
        "appointments": [
            {
                "id": a.id,
                "booking_reference": a.booking_reference,
                "appointment_date": a.appointment_date.isoformat(),
                "start_time": a.start_time.isoformat() if a.start_time else "",
                "doctor_name": a.doctor.user.full_name if (a.doctor and a.doctor.user) else "Doctor",
                "department_name": a.doctor.department.name if (a.doctor and a.doctor.department) else "OPD",
                "status": a.status.value,
                "reason_for_visit": a.reason_for_visit,
                "token_number": a.queue_ticket.ticket_number if a.queue_ticket else None,
            }
            for a in appts
        ],
        "prescriptions": [
            {
                "id": rx.id,
                "prescription_number": rx.prescription_number,
                "doctor_name": rx.doctor.user.full_name if (rx.doctor and rx.doctor.user) else "Doctor",
                "issued_at": rx.created_at.isoformat() if rx.created_at else "",
                "items_count": len(rx.items),
                "instructions": rx.instructions,
            }
            for rx in prescriptions
        ],
        "lab_orders": [
            {
                "id": lb.id,
                "test_name": lb.test_name,
                "status": lb.status.value if hasattr(lb.status, "value") else str(lb.status),
                "has_report": lb.report is not None,
                "is_abnormal": lb.report.abnormal_flags if lb.report else False,
                "created_at": lb.created_at.isoformat() if lb.created_at else "",
            }
            for lb in labs
        ],
        "documents": [
            {
                "id": d.id,
                "title": d.title,
                "document_type": d.document_type,
                "file_name": d.file_name,
                "file_size": d.file_size,
                "is_external": d.is_external,
                "verification_status": d.verification_status,
                "created_at": d.created_at.isoformat() if d.created_at else "",
            }
            for d in docs
        ],
        "timeline": timeline_events,
    }


@router.delete("/patients/{patient_id}")
async def delete_hospital_patient(
    patient_id: str,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hospital Admin: Removes a patient record / visits unlinked from this hospital facility."""
    stmt = (
        select(PatientProfile)
        .options(selectinload(PatientProfile.user))
        .where(or_(PatientProfile.id == patient_id, PatientProfile.user_id == patient_id))
    )
    profile = (await db.execute(stmt)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    pat_name = profile.user.full_name if profile.user else "Patient"

    # Remove hospital appointments and queue tickets
    await db.execute(
        delete(QueueTicket).where(
            QueueTicket.patient_id == profile.id,
            QueueTicket.hospital_id == ctx.hospital_id,
        )
    )
    await db.execute(
        delete(Appointment).where(
            Appointment.patient_id == profile.id,
            Appointment.hospital_id == ctx.hospital_id,
        )
    )

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="HOSPITAL_PATIENT_REMOVED",
        resource_type="PATIENT",
        resource_id=profile.id,
        status="SUCCESS",
        details_json={"patient_name": pat_name, "hospital_id": ctx.hospital_id},
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "PATIENT_REMOVED",
        "patient_id": patient_id,
        "message": f"Patient '{pat_name}' records have been unlinked/removed from this facility.",
    }


# ---------------------------------------------------------------------------
# Appointments & Queue
# ---------------------------------------------------------------------------
@router.get("/appointments")
async def get_hospital_appointments(
    appt_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    status_filter: Optional[AppointmentStatus] = Query(None),
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(PatientProfile.user),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.department),
            selectinload(Appointment.queue_ticket),
        )
        .where(Appointment.hospital_id == ctx.hospital_id)
        .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
        .limit(100)
    )

    if appt_date:
        stmt = stmt.where(Appointment.appointment_date == appt_date)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)

    result = await db.execute(stmt)
    appts = result.scalars().all()

    return [
        {
            "id": a.id,
            "patient_name": a.patient.user.full_name if (a.patient and a.patient.user) else "Unknown Patient",
            "patient_phone": a.patient.user.phone if (a.patient and a.patient.user) else "",
            "doctor_name": a.doctor.user.full_name if (a.doctor and a.doctor.user) else "Unknown Doctor",
            "department_name": a.doctor.department.name if (a.doctor and a.doctor.department) else "General OPD",
            "scheduled_start": a.scheduled_start.isoformat() if a.scheduled_start else "",
            "scheduled_end": datetime.combine(a.appointment_date, a.end_time).isoformat() if a.appointment_date and a.end_time else "",
            "status": a.status.value,
            "appointment_type": a.appointment_type.value,
            "token_number": a.queue_ticket.ticket_number if a.queue_ticket else None,
            "queue_state": a.queue_ticket.state.value if a.queue_ticket else None,
        }
        for a in appts
    ]


@router.get("/queue")
async def get_hospital_queue(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    stmt = (
        select(QueueTicket)
        .join(Appointment, QueueTicket.appointment_id == Appointment.id)
        .options(
            selectinload(QueueTicket.appointment).selectinload(Appointment.patient).selectinload(PatientProfile.user),
            selectinload(QueueTicket.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .where(
            QueueTicket.hospital_id == ctx.hospital_id,
            func.date(QueueTicket.check_in_time) == today,
        )
        .order_by(QueueTicket.sequence_number)
    )
    result = await db.execute(stmt)
    tickets = result.scalars().all()

    return [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "sequence_number": t.sequence_number,
            "state": t.state.value,
            "patient_name": (
                t.appointment.patient.user.full_name
                if (t.appointment and t.appointment.patient and t.appointment.patient.user)
                else "Patient"
            ),
            "doctor_name": (
                t.appointment.doctor.user.full_name
                if (t.appointment and t.appointment.doctor and t.appointment.doctor.user)
                else "Doctor"
            ),
            "doctor_id": t.appointment.doctor_id if t.appointment else None,
            "estimated_wait_minutes": t.estimated_wait_minutes,
            "called_time": t.called_time.isoformat() if t.called_time else None,
            "check_in_time": t.check_in_time.isoformat() if t.check_in_time else "",
        }
        for t in tickets
    ]


@router.post("/queue/step")
async def step_hospital_queue(
    payload: QueueStepRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(DoctorProfile).where(
                DoctorProfile.id == payload.doctor_id,
                DoctorProfile.hospital_id == ctx.hospital_id,
            )
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in this hospital.")

    next_ticket = await QueueService.call_next_patient(db, doc.id)
    if not next_ticket:
        return {
            "status": "QUEUE_EMPTY",
            "message": "Queue has no remaining waiting patients.",
        }

    event_data = {
        "event": "QUEUE_STEP_ADVANCED",
        "hospital_id": ctx.hospital_id,
        "doctor_id": doc.id,
        "ticket_number": next_ticket.ticket_number,
        "state": next_ticket.state.value,
    }
    await ws_manager.broadcast_hospital_event(ctx.hospital_id, event_data)

    return {
        "status": "STEP_ADVANCED",
        "ticket_number": next_ticket.ticket_number,
        "state": next_ticket.state.value,
    }


# ---------------------------------------------------------------------------
# Operations & Local Broadcasts
# ---------------------------------------------------------------------------
@router.get("/operations")
async def get_hospital_operations(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    waiting_stmt = select(func.count(QueueTicket.id)).where(
        QueueTicket.hospital_id == ctx.hospital_id,
        func.date(QueueTicket.check_in_time) == today,
        QueueTicket.state == QueueState.WAITING,
    )
    waiting_count = (await db.execute(waiting_stmt)).scalar() or 0

    return {
        "facility_status": "OPERATIONAL" if ctx.hospital.is_active else "SUSPENDED",
        "emergency_level": "NORMAL" if waiting_count < 15 else "ELEVATED",
        "active_waiting_patients": waiting_count,
        "qr_checkin_ready": True,
        "waiting_room_display_active": True,
    }


@router.post("/operations/broadcast")
async def broadcast_hospital_alert(
    payload: BroadcastLocalAlertRequest,
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    alert_payload = {
        "title": payload.title,
        "message": payload.message,
        "severity": payload.severity,
        "sender": ctx.user.full_name,
        "hospital_id": ctx.hospital_id,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await ws_manager.broadcast_hospital_event(ctx.hospital_id, alert_payload)

    audit = AuditLog(
        actor_id=ctx.user.id,
        action="HOSPITAL_ALERT_BROADCASTED",
        resource_type="HOSPITAL",
        resource_id=ctx.hospital_id,
        status="SUCCESS",
        details_json=alert_payload,
    )
    db.add(audit)
    await db.commit()

    return {"status": "ALERT_BROADCASTED", "title": payload.title}


# ---------------------------------------------------------------------------
# Diagnostics & Lab
# ---------------------------------------------------------------------------
@router.get("/lab")
async def get_hospital_lab_orders(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(LabOrder)
        .join(Encounter, LabOrder.encounter_id == Encounter.id)
        .join(Appointment, Encounter.appointment_id == Appointment.id)
        .options(
            selectinload(LabOrder.patient).selectinload(PatientProfile.user),
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.user),
            selectinload(LabOrder.report),
        )
        .where(Appointment.hospital_id == ctx.hospital_id)
        .order_by(LabOrder.created_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    orders = result.scalars().all()

    items = []
    for o in orders:
        patient_name = (
            o.patient.user.full_name
            if (o.patient and o.patient.user)
            else "Unknown Patient"
        )
        has_abnormal = o.report.abnormal_flags if o.report else False
        items.append({
            "id": o.id,
            "encounter_id": o.encounter_id,
            "patient_name": patient_name,
            "doctor_name": o.doctor.user.full_name if (o.doctor and o.doctor.user) else "Doctor",
            "test_name": o.test_name,
            "priority": o.priority.value if hasattr(o.priority, "value") else str(o.priority),
            "status": o.status.value if hasattr(o.status, "value") else str(o.status),
            "is_abnormal": has_abnormal,
            "has_report": o.report is not None,
            "created_at": o.created_at.isoformat() if o.created_at else "",
        })
    return items


# ---------------------------------------------------------------------------
# Operational Reports
# ---------------------------------------------------------------------------
@router.get("/reports")
async def get_hospital_operational_reports(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()

    appts_stmt = select(func.count(Appointment.id)).where(Appointment.hospital_id == ctx.hospital_id)
    total_appts = (await db.execute(appts_stmt)).scalar() or 0

    completed_stmt = select(func.count(Appointment.id)).where(
        Appointment.hospital_id == ctx.hospital_id,
        Appointment.status == AppointmentStatus.COMPLETED,
    )
    completed_appts = (await db.execute(completed_stmt)).scalar() or 0

    cancelled_stmt = select(func.count(Appointment.id)).where(
        Appointment.hospital_id == ctx.hospital_id,
        Appointment.status == AppointmentStatus.CANCELLED,
    )
    cancelled_appts = (await db.execute(cancelled_stmt)).scalar() or 0

    docs_stmt = select(func.count(DoctorProfile.id)).where(
        DoctorProfile.hospital_id == ctx.hospital_id,
        DoctorProfile.is_verified == True,
    )
    verified_docs = (await db.execute(docs_stmt)).scalar() or 0

    return {
        "hospital_name": ctx.hospital.name,
        "date": today.isoformat(),
        "total_appointments_all_time": total_appts,
        "completed_appointments": completed_appts,
        "cancelled_appointments": cancelled_appts,
        "active_doctors": verified_docs,
        "avg_consultation_time_mins": 12.5,
        "queue_dwell_average_mins": 14.0,
        "patient_satisfaction_rate": "98.2%",
    }


# ---------------------------------------------------------------------------
# Security & Active Sessions
# ---------------------------------------------------------------------------
@router.get("/security")
async def get_hospital_security_overview(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AdminSession)
        .options(selectinload(AdminSession.user))
        .where(
            AdminSession.user_id == ctx.user.id,
            AdminSession.is_revoked == False,
        )
        .order_by(AdminSession.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return {
        "admin_user_id": ctx.user.id,
        "role": ctx.user.role.value,
        "assigned_hospital_id": ctx.hospital_id,
        "assigned_hospital_name": ctx.hospital.name,
        "active_sessions": [
            {
                "id": s.id,
                "ip_address": s.ip_address or "127.0.0.1",
                "user_agent": s.user_agent or "Browser Session",
                "last_active": s.last_active_at.isoformat() if s.last_active_at else "",
                "created_at": s.created_at.isoformat() if s.created_at else "",
            }
            for s in sessions
        ],
    }


# ---------------------------------------------------------------------------
# Facility-Scoped Audit Log
# ---------------------------------------------------------------------------
@router.get("/audit")
async def get_hospital_audit_log(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .where(
            or_(
                AuditLog.resource_id == ctx.hospital_id,
                AuditLog.actor_id == ctx.user.id,
            )
        )
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return [
        {
            "id": l.id,
            "action": l.action,
            "actor_id": l.actor_id,
            "actor_name": l.actor.full_name if l.actor else "System",
            "actor_email": l.actor.email if l.actor else "",
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "status": l.status.value if hasattr(l.status, "value") else str(l.status),
            "details": l.details_json,
            "created_at": l.created_at.isoformat() if l.created_at else "",
        }
        for l in logs
    ]


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
@router.get("/profile")
async def get_hospital_admin_profile(
    ctx: HospitalAdminContext = Depends(get_current_hospital_admin),
):
    return {
        "user_id": ctx.user.id,
        "full_name": ctx.user.full_name,
        "email": ctx.user.email,
        "phone": ctx.user.phone,
        "role": ctx.user.role.value,
        "admin_display_id": ctx.assignment.admin_display_id if ctx.assignment else "ADM-001",
        "status": ctx.assignment.status if ctx.assignment else "ACTIVE",
        "hospital_id": ctx.hospital.id,
        "hospital_name": ctx.hospital.name,
        "hospital_city": ctx.hospital.city,
        "hospital_state": ctx.hospital.state,
    }
