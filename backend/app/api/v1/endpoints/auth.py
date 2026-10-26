import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from backend.app.models.enums import UserRole
from backend.app.models.user import PatientProfile, User
from backend.app.models.hospital import DoctorProfile
from backend.app.schemas.auth import (
    LoginRequest,
    PatientRegisterRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserSummary,
    SendOtpRequest,
    VerifyOtpRequest,
    PatientProfileSetupRequest,
    PatientProfileResponse,
)
from backend.app.services.otp_service import otp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_patient(
    payload: PatientRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new patient account with multi-step data support,
    generates an ABHA ID stub, and returns initial authentication tokens.
    """
    clean_phone = payload.phone.strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    clean_email = payload.email.strip().lower() if payload.email else None

    # Check if user already exists
    conditions = [User.phone == clean_phone]
    if clean_email:
        conditions.append(User.email == clean_email)
    stmt = select(User).where(or_(*conditions))
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A patient with this mobile number or email address is already registered. Please sign in or use password recovery.",
        )
    
    # Optional hospital affiliation
    hospital_uuid = None
    if payload.hospital_id and payload.hospital_id != "unlinked" and payload.hospital_id != "none":
        hosp_stmt = select(Hospital).where(Hospital.id == payload.hospital_id)
        hosp_res = await db.execute(hosp_stmt)
        hosp = hosp_res.scalar_one_or_none()
        if hosp:
            hospital_uuid = hosp.id

    # Create user
    new_user = User(
        phone=clean_phone,
        email=clean_email,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=UserRole.PATIENT,
        hospital_id=hospital_uuid,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()  # populate new_user.id
    
    # Generate simulated ABHA identifier for ABDM compliance demo
    rand_digits = "".join([str(random.randint(0, 9)) for _ in range(12)])
    abha_num = f"91-{rand_digits[:4]}-{rand_digits[4:8]}-{rand_digits[8:]}"
    clean_name = payload.full_name.lower().replace(" ", "")
    abha_addr = f"{clean_name}{random.randint(100, 999)}@abdm"

    # Human-readable CareFlow Patient ID
    patient_id_display = f"CF-PAT-{random.randint(100000, 999999)}"
    is_complete = bool(payload.dob and payload.full_name)

    # Address composition
    addr_parts = [p.strip() for p in [payload.address, payload.state, payload.pincode] if p and p.strip()]
    full_address = ", ".join(addr_parts) if addr_parts else None

    # Identity doc masking
    masked_id = None
    id_doc_type = payload.id_document_type
    if payload.id_document_number and payload.id_document_number.strip():
        raw_num = payload.id_document_number.strip()
        if id_doc_type and id_doc_type.upper() == "AADHAAR" and len(raw_num) == 12:
            masked_id = f"XXXX-XXXX-{raw_num[-4:]}"
        else:
            masked_id = "X" * max(0, len(raw_num) - 4) + raw_num[-4:]

    # Create patient profile
    patient_profile = PatientProfile(
        user_id=new_user.id,
        patient_identifier=patient_id_display,
        abha_number=abha_num,
        abha_address=abha_addr,
        dob=payload.dob,
        gender=payload.gender,
        blood_group=payload.blood_group,
        address=full_address,
        preferred_language=payload.preferred_language or "en",
        profile_completed=is_complete,
        emergency_contact_name=payload.emergency_contact_name.strip() if payload.emergency_contact_name else None,
        emergency_contact_phone=payload.emergency_contact_phone.strip() if payload.emergency_contact_phone else None,
        id_document_type=id_doc_type,
        id_document_masked=masked_id,
        id_verified=bool(masked_id),
        allergies=payload.allergies or [],
        chronic_conditions=payload.chronic_conditions or [],
    )
    db.add(patient_profile)
    await db.commit()
    new_user.patient_profile = patient_profile

    access_token = create_access_token(subject=new_user.id, role=new_user.role.value, hospital_id=hospital_uuid)
    refresh_token = create_refresh_token(subject=new_user.id)

    user_summary = UserSummary.model_validate(new_user)
    user_summary.patient_identifier = patient_id_display
    user_summary.profile_completed = is_complete

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_summary,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates a user by email or phone and returns access and refresh JWTs.
    """
    stmt = (
        select(User)
        .options(selectinload(User.patient_profile))
        .where(or_(User.email == payload.identifier, User.phone == payload.identifier))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your phone/email and password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact hospital support.",
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        hospital_id=user.hospital_id,
    )
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserSummary.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Issues a new access token using a valid refresh token.
    """
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_id = token_data.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active.",
        )

    new_access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        hospital_id=user.hospital_id,
    )
    new_refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserSummary.model_validate(user),
    )


@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the authenticated user's profile and role-specific details.
    """
    response_data = {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "hospital_id": current_user.hospital_id,
        "is_active": current_user.is_active,
    }

    if current_user.role == UserRole.PATIENT:
        stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        res = await db.execute(stmt)
        patient = res.scalar_one_or_none()
        if patient:
            response_data["patient_profile"] = {
                "id": patient.id,
                "patient_identifier": patient.patient_identifier or f"CF-PAT-{patient.id[:6].upper()}",
                "abha_number": patient.abha_number,
                "abha_address": patient.abha_address,
                "dob": patient.dob.isoformat() if patient.dob else None,
                "age": patient.age,
                "gender": patient.gender.value if patient.gender else None,
                "blood_group": patient.blood_group,
                "address": patient.address,
                "preferred_language": patient.preferred_language,
                "profile_completed": patient.profile_completed,
                "id_document_type": patient.id_document_type,
                "id_document_masked": patient.id_document_masked,
                "id_verified": patient.id_verified,
                "allergies": patient.allergies or [],
                "chronic_conditions": patient.chronic_conditions or [],
                "emergency_contact_name": patient.emergency_contact_name,
                "emergency_contact_phone": patient.emergency_contact_phone,
            }

    elif current_user.role == UserRole.DOCTOR:
        stmt = select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        res = await db.execute(stmt)
        doctor = res.scalar_one_or_none()
        if doctor:
            response_data["doctor_profile"] = {
                "id": doctor.id,
                "hospital_id": doctor.hospital_id,
                "department_id": doctor.department_id,
                "hpr_id": doctor.hpr_id,
                "registration_number": doctor.registration_number,
                "qualification": doctor.qualification,
                "specialization": doctor.specialization,
                "experience_years": doctor.experience_years,
                "consultation_fee": doctor.consultation_fee,
                "room_number": doctor.room_number,
                "languages": doctor.languages or [],
                "is_verified": doctor.is_verified,
                "listing_status": getattr(doctor, "listing_status", "APPROVED"),
            }

    return response_data


@router.post("/send-otp")
async def send_contact_otp(payload: SendOtpRequest):
    """
    Sends a cryptographically secure 6-digit OTP code for contact verification.
    Enforces rate-limiting cooldown and 10-minute expiration.
    """
    ident = payload.identifier.strip().lower()
    try:
        code, ttl = otp_service.generate_otp(
            user_id=ident,
            email=ident,
            purpose=payload.purpose,
            cooldown_seconds=45,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))

    return {
        "status": "OTP_SENT",
        "message": f"Verification code sent to {ident}.",
        "ttl_seconds": ttl,
        "cooldown_seconds": 45,
        "demo_otp": code,
    }


@router.post("/verify-otp")
async def verify_contact_otp(payload: VerifyOtpRequest):
    """
    Verifies the submitted OTP against brute-force and expiration guards.
    """
    ident = payload.identifier.strip().lower()
    success, msg = otp_service.verify_otp(
        user_id=ident,
        code=payload.code,
        purpose=payload.purpose,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return {
        "status": "VERIFIED",
        "message": "Contact number / email successfully verified.",
    }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Resets account password using a validated verification code.
    Guards against brute-force and validates password strength.
    """
    ident = payload.identifier.strip().lower()
    success, msg = otp_service.verify_otp(
        user_id=ident,
        code=payload.code,
        purpose="PASSWORD_CHANGE",
    )
    if not success:
        # Also attempt with other purposes if code was requested for recovery
        success2, _ = otp_service.verify_otp(
            user_id=ident,
            code=payload.code,
            purpose="REGISTRATION",
        )
        if not success2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Find user by phone or email
    clean_phone = ident.replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]

    stmt = select(User).where(
        or_(
            User.email == ident,
            User.phone == ident,
            User.phone == clean_phone,
        )
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        return {
            "status": "SUCCESS",
            "message": "If an account matches those details, your password has been reset.",
        }

    user.password_hash = get_password_hash(payload.new_password)
    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Password reset successfully. You can now log in with your new password.",
    }


@router.post("/profile/setup", response_model=PatientProfileResponse)
async def setup_patient_profile(
    payload: PatientProfileSetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 3 of Onboarding: Completes the patient profile, auto-calculates age,
    masks any identity reference safely, and unlocks dashboard access.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can complete patient profile onboarding.",
        )

    stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        patient = PatientProfile(
            user_id=current_user.id,
            patient_identifier=f"CF-PAT-{random.randint(100000, 999999)}",
        )
        db.add(patient)

    if payload.full_name and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()

    target_dob = payload.dob or payload.date_of_birth
    if not target_dob:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date of birth is required to complete profile setup.",
        )
    patient.dob = target_dob
    if payload.gender:
        patient.gender = payload.gender
    if payload.blood_group:
        patient.blood_group = payload.blood_group
    if payload.preferred_language:
        patient.preferred_language = payload.preferred_language
    if payload.address is not None:
        patient.address = payload.address.strip()
    if payload.emergency_contact_name is not None:
        patient.emergency_contact_name = payload.emergency_contact_name.strip()
    if payload.emergency_contact_phone is not None:
        patient.emergency_contact_phone = payload.emergency_contact_phone.strip()
    if payload.allergies is not None:
        patient.allergies = payload.allergies
    if payload.chronic_conditions is not None:
        patient.chronic_conditions = payload.chronic_conditions

    # Safe identity handling: never store plaintext national IDs
    if payload.id_document_number and payload.id_document_number.strip():
        raw_id = payload.id_document_number.strip()
        doc_type = payload.id_document_type or "GOVT_ID"
        if doc_type.upper() == "AADHAAR" and len(raw_id) == 12:
            masked = f"XXXX-XXXX-{raw_id[-4:]}"
        else:
            masked = "X" * max(0, len(raw_id) - 4) + raw_id[-4:]
        patient.id_document_type = doc_type
        patient.id_document_masked = masked
        patient.id_verified = True

    patient.profile_completed = True
    await db.commit()
    await db.refresh(patient)
    await db.refresh(current_user)

    return PatientProfileResponse(
        id=patient.id,
        patient_identifier=patient.patient_identifier or f"CF-PAT-{patient.id[:6].upper()}",
        user_id=current_user.id,
        full_name=current_user.full_name,
        phone=current_user.phone,
        email=current_user.email,
        dob=patient.dob,
        age=patient.age,
        gender=patient.gender.value if patient.gender else None,
        blood_group=patient.blood_group,
        address=patient.address,
        preferred_language=patient.preferred_language,
        profile_completed=patient.profile_completed,
        id_document_type=patient.id_document_type,
        id_document_masked=patient.id_document_masked,
        id_verified=patient.id_verified,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        allergies=patient.allergies or [],
        chronic_conditions=patient.chronic_conditions or [],
    )

