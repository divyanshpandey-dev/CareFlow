import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import RoleChecker, get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.clinical import LabReport, Prescription
from backend.app.models.consent import Consent, ConsentAccessLog
from backend.app.models.enums import ConsentStatus, UserRole
from backend.app.models.hospital import Hospital
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.clinical import PrescriptionItemResponse
from backend.app.schemas.consent import (
    ConsentAccessLogResponse,
    ConsentResponse,
    CreateConsentRequest,
    RespondConsentRequest,
)

router = APIRouter(prefix="/consent", tags=["DPDP / ABDM Consent Management"])


@router.post("/request", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def request_patient_consent(
    payload: CreateConsentRequest,
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Clinician or Hospital requests consent to access a patient's historical records.
    Generates an ABDM-compliant Consent Artefact requisition with explicit purpose limitation.
    """
    # Verify patient exists
    stmt = select(PatientProfile).options(selectinload(PatientProfile.user)).where(PatientProfile.id == payload.patient_id)
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(hours=payload.duration_hours)
    artefact_id = f"CF-CA-{now.year}-{random.randint(100000, 999999)}"

    consent = Consent(
        consent_artefact_id=artefact_id,
        patient_id=patient.id,
        requester_user_id=current_user.id,
        requester_hospital_id=current_user.hospital_id,
        purpose=payload.purpose,
        scopes=payload.scopes,
        status=ConsentStatus.REQUESTED,
        valid_from=now,
        valid_to=valid_until,
    )
    db.add(consent)
    await db.commit()
    await db.refresh(consent)

    # Broadcast notification to patient
    await ws_manager.broadcast_to_room(
        room=f"patient:{patient.id}:journey",
        event_type="CONSENT_REQUESTED",
        data={
            "consent_id": consent.id,
            "artefact_id": consent.consent_artefact_id,
            "requester_name": current_user.full_name,
            "purpose": consent.purpose.value,
            "scopes": consent.scopes,
            "duration_hours": payload.duration_hours,
        },
    )

    hosp_name = "Hospital"
    if current_user.hospital_id:
        h_res = await db.execute(select(Hospital).where(Hospital.id == current_user.hospital_id))
        h = h_res.scalar_one_or_none()
        if h:
            hosp_name = h.name

    return ConsentResponse(
        id=consent.id,
        consent_artefact_id=consent.consent_artefact_id,
        patient_id=consent.patient_id,
        requester_user_id=consent.requester_user_id,
        requester_name=current_user.full_name,
        requester_hospital=hosp_name,
        purpose=consent.purpose,
        scopes=consent.scopes,
        status=consent.status,
        valid_from=consent.valid_from,
        valid_to=consent.valid_to,
        created_at=consent.created_at,
    )


@router.get("/my-requests", response_model=List[ConsentResponse])
@router.get("/my-consents", response_model=List[ConsentResponse])
async def list_my_consents(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Returns all pending and active consent artefacts for the authenticated patient."""
    stmt = (
        select(Consent)
        .options(
            selectinload(Consent.access_logs),
        )
        .where(Consent.patient_id == current_patient.id)
        .order_by(desc(Consent.created_at))
    )
    res = await db.execute(stmt)
    consents = res.scalars().all()

    output = []
    for c in consents:
        u_res = await db.execute(select(User).where(User.id == c.requester_user_id))
        requester = u_res.scalar_one_or_none()

        hosp_name = "Hospital"
        if c.requester_hospital_id:
            h_res = await db.execute(select(Hospital).where(Hospital.id == c.requester_hospital_id))
            h = h_res.scalar_one_or_none()
            if h:
                hosp_name = h.name

        output.append(
            ConsentResponse(
                id=c.id,
                consent_artefact_id=c.consent_artefact_id,
                patient_id=c.patient_id,
                requester_user_id=c.requester_user_id,
                requester_name=requester.full_name if requester else "Doctor",
                requester_hospital=hosp_name,
                purpose=c.purpose,
                scopes=c.scopes,
                status=c.status,
                valid_from=c.valid_from,
                valid_to=c.valid_to,
                created_at=c.created_at,
            )
        )
    return output


@router.post("/{consent_id}/respond", response_model=ConsentResponse)
async def respond_to_consent(
    consent_id: str,
    payload: RespondConsentRequest,
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient grants or denies requested consent.
    Granular purpose and scopes are committed to the electronic consent ledger.
    """
    stmt = select(Consent).where(
        and_(Consent.id == consent_id, Consent.patient_id == current_patient.id)
    )
    res = await db.execute(stmt)
    consent = res.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent request not found.")

    if payload.decision.upper() == "GRANT":
        consent.status = ConsentStatus.GRANTED
    else:
        consent.status = ConsentStatus.DENIED

    await db.commit()
    await db.refresh(consent)

    u_res = await db.execute(select(User).where(User.id == consent.requester_user_id))
    requester = u_res.scalar_one_or_none()

    return ConsentResponse(
        id=consent.id,
        consent_artefact_id=consent.consent_artefact_id,
        patient_id=consent.patient_id,
        requester_user_id=consent.requester_user_id,
        requester_name=requester.full_name if requester else "Doctor",
        requester_hospital=None,
        purpose=consent.purpose,
        scopes=consent.scopes,
        status=consent.status,
        valid_from=consent.valid_from,
        valid_to=consent.valid_to,
        created_at=consent.created_at,
    )


@router.post("/{consent_id}/revoke", response_model=ConsentResponse)
async def revoke_consent(
    consent_id: str,
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click Instant Consent Revocation:
    Immediately invalidates access for the requester in compliance with DPDP Act 2023.
    """
    stmt = select(Consent).where(
        and_(Consent.id == consent_id, Consent.patient_id == current_patient.id)
    )
    res = await db.execute(stmt)
    consent = res.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent not found.")

    consent.status = ConsentStatus.REVOKED
    await db.commit()
    await db.refresh(consent)

    return ConsentResponse(
        id=consent.id,
        consent_artefact_id=consent.consent_artefact_id,
        patient_id=consent.patient_id,
        requester_user_id=consent.requester_user_id,
        requester_name="Doctor",
        requester_hospital=None,
        purpose=consent.purpose,
        scopes=consent.scopes,
        status=consent.status,
        valid_from=consent.valid_from,
        valid_to=consent.valid_to,
        created_at=consent.created_at,
    )


@router.get("/access-history", response_model=List[ConsentAccessLogResponse])
@router.get("/audit-log", response_model=List[ConsentAccessLogResponse])
async def get_consent_access_history(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient Access History (Audit):
    Transparency log of every external doctor who accessed records under consent.
    """
    stmt = (
        select(ConsentAccessLog)
        .join(ConsentAccessLog.consent)
        .where(Consent.patient_id == current_patient.id)
        .order_by(desc(ConsentAccessLog.accessed_at))
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()

    output = []
    for l in logs:
        u_res = await db.execute(select(User).where(User.id == l.accessed_by_user_id))
        user_acc = u_res.scalar_one_or_none()
        output.append(
            ConsentAccessLogResponse(
                id=l.id,
                consent_id=l.consent_id,
                accessed_by_name=user_acc.full_name if user_acc else "Practitioner",
                resource_accessed=l.resource_accessed,
                ip_address=l.ip_address,
                accessed_at=l.accessed_at,
            )
        )
    return output


@router.get("/view-records/{consent_id}")
async def view_permitted_records(
    consent_id: str,
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Clinician accesses patient records using a granted Consent Artefact.
    Evaluates:
    - Artefact status == GRANTED
    - Current time <= valid_to
    - Requester identity == current_user.id
    Logs access event in consent_access_logs.
    """
    stmt = select(Consent).where(Consent.id == consent_id)
    res = await db.execute(stmt)
    consent = res.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent artefact not found.")

    now = datetime.now(timezone.utc)
    if consent.status != ConsentStatus.GRANTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Consent status is {consent.status.value}.",
        )

    valid_to = consent.valid_to
    if valid_to.tzinfo is None:
        valid_to = valid_to.replace(tzinfo=timezone.utc)

    if now > valid_to:
        consent.status = ConsentStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Consent artefact has expired.",
        )

    if consent.requester_user_id != current_user.id and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not the designated requester of this consent artefact.",
        )

    # Log access
    access_log = ConsentAccessLog(
        consent_id=consent.id,
        accessed_by_user_id=current_user.id,
        resource_accessed=",".join(consent.scopes),
    )
    db.add(access_log)
    await db.commit()

    records_data = {"scopes": consent.scopes, "patient_id": consent.patient_id}

    if "PRESCRIPTIONS" in consent.scopes:
        rx_stmt = (
            select(Prescription)
            .options(selectinload(Prescription.items))
            .where(Prescription.patient_id == consent.patient_id)
        )
        rx_res = await db.execute(rx_stmt)
        rxs = rx_res.scalars().all()
        records_data["prescriptions"] = [
            {
                "prescription_number": r.prescription_number,
                "issued_at": r.created_at.strftime("%B %d, %Y"),
                "instructions": r.instructions,
                "items": [PrescriptionItemResponse.model_validate(it) for it in r.items],
            }
            for r in rxs
        ]

    if "LAB_REPORTS" in consent.scopes:
        lab_stmt = select(LabReport).where(LabReport.patient_id == consent.patient_id)
        lab_res = await db.execute(lab_stmt)
        reports = lab_res.scalars().all()
        records_data["lab_reports"] = [
            {
                "report_number": rep.report_number,
                "summary": rep.summary,
                "abnormal_flags": rep.abnormal_flags,
                "verified_at": rep.verified_at.strftime("%B %d, %Y"),
            }
            for rep in reports
        ]

    return {
        "status": "AUTHORIZED",
        "consent_artefact_id": consent.consent_artefact_id,
        "purpose": consent.purpose.value,
        "valid_until": consent.valid_to.isoformat(),
        "records": records_data,
    }
