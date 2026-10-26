import hashlib
import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import RoleChecker, get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.clinical import Encounter, LabOrder, LabReport
from backend.app.models.enums import (
    JourneyEventStatus,
    JourneyEventType,
    JourneyStatus,
    LabOrderStatus,
    UserRole,
)
from backend.app.models.hospital import DoctorProfile, Hospital
from backend.app.models.journey import CareJourney, CareJourneyEvent
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.lab import (
    LabOrderSummary,
    UpdateLabStatusRequest,
    VerifyLabReportRequest,
)

router = APIRouter(prefix="/lab", tags=["Laboratory Diagnostics"])


@router.get("/my")
async def list_my_lab_orders(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Returns diagnostic laboratory requisitions and reports for the authenticated patient."""
    stmt = (
        select(LabOrder)
        .options(
            selectinload(LabOrder.patient).selectinload(PatientProfile.user),
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.user),
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.hospital),
            selectinload(LabOrder.report),
        )
        .where(LabOrder.patient_id == current_patient.id)
        .order_by(desc(LabOrder.created_at))
    )
    res = await db.execute(stmt)
    orders = res.scalars().all()

    output = []
    for o in orders:
        report_data = None
        if o.report:
            report_data = {
                "id": o.report.id,
                "summary": o.report.summary,
                "abnormal_flags": o.report.abnormal_flags,
                "verified_at": o.report.verified_at.isoformat() if o.report.verified_at else None,
                "document_url": o.report.document_url,
            }

        output.append({
            "id": o.id,
            "encounter_id": o.encounter_id,
            "patient_id": o.patient_id,
            "patient_name": o.patient.user.full_name if (o.patient and o.patient.user) else "Patient",
            "patient_phone": o.patient.user.phone if (o.patient and o.patient.user) else "",
            "doctor_name": o.doctor.user.full_name if (o.doctor and o.doctor.user) else "Doctor",
            "hospital_name": o.doctor.hospital.name if (o.doctor and o.doctor.hospital) else "Hospital",
            "test_name": o.test_name,
            "test_code": o.test_code,
            "priority": o.priority.value if hasattr(o.priority, "value") else str(o.priority),
            "status": o.status.value if hasattr(o.status, "value") else str(o.status),
            "clinical_notes": o.clinical_notes,
            "created_at": o.created_at,
            "report": report_data,
        })
    return output


@router.get("/orders", response_model=List[LabOrderSummary])
async def list_lab_orders(
    status_filter: Optional[LabOrderStatus] = Query(None, alias="status"),
    current_user: User = Depends(RoleChecker([UserRole.LAB_TECH, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR])),
    db: AsyncSession = Depends(get_db),
):
    """Returns incoming and pending diagnostic requisitions for the hospital laboratory."""
    stmt = (
        select(LabOrder)
        .options(
            selectinload(LabOrder.patient).selectinload(PatientProfile.user),
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.user),
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.hospital),
            selectinload(LabOrder.report),
        )
        .order_by(desc(LabOrder.created_at))
    )
    if status_filter:
        stmt = stmt.where(LabOrder.status == status_filter)

    res = await db.execute(stmt)
    orders = res.scalars().all()

    output = []
    for o in orders:
        report_data = None
        if o.report:
            report_data = {
                "id": o.report.id,
                "report_number": o.report.report_number,
                "summary": o.report.summary,
                "abnormal_flags": o.report.abnormal_flags,
                "document_url": o.report.document_url,
                "verified_at": o.report.verified_at.strftime("%B %d, %Y %I:%M %p"),
            }

        output.append(
            LabOrderSummary(
                id=o.id,
                encounter_id=o.encounter_id,
                patient_id=o.patient_id,
                patient_name=o.patient.user.full_name if (o.patient and o.patient.user) else "Patient",
                patient_phone=o.patient.user.phone if (o.patient and o.patient.user) else "",
                doctor_name=o.doctor.user.full_name if (o.doctor and o.doctor.user) else "Doctor",
                hospital_name=o.doctor.hospital.name if (o.doctor and o.doctor.hospital) else "Hospital",
                test_name=o.test_name,
                test_code=o.test_code,
                priority=o.priority,
                status=o.status,
                clinical_notes=o.clinical_notes,
                created_at=o.created_at,
                report=report_data,
            )
        )
    return output


@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: UpdateLabStatusRequest,
    current_user: User = Depends(RoleChecker([UserRole.LAB_TECH, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates specimen tracking status:
    ORDERED -> SAMPLE_COLLECTED -> PROCESSING
    """
    stmt = (
        select(LabOrder)
        .options(
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.user),
            selectinload(LabOrder.patient),
        )
        .where(LabOrder.id == order_id)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab order not found.")

    order.status = payload.status

    # If sample collected, emit to Care Journey
    if payload.status == LabOrderStatus.SAMPLE_COLLECTED:
        j_stmt = select(CareJourney).where(
            CareJourney.patient_id == order.patient_id,
            CareJourney.status == JourneyStatus.ACTIVE,
        )
        j_res = await db.execute(j_stmt)
        journey = j_res.scalar_one_or_none()
        if journey:
            db.add(
                CareJourneyEvent(
                    care_journey_id=journey.id,
                    event_type=JourneyEventType.SAMPLE_COLLECTED,
                    title=f"Sample Collected: {order.test_name}",
                    description="Blood/specimen successfully drawn at the laboratory. In process.",
                    provider_name="Hospital Diagnostic Lab",
                    reference_id=order.id,
                    status=JourneyEventStatus.COMPLETED,
                    next_action_label="Awaiting Pathologist Verification",
                )
            )

    await db.commit()
    await db.refresh(order)

    # Broadcast event
    await ws_manager.broadcast_to_room(
        room=f"patient:{order.patient_id}:journey",
        event_type="LAB_STATUS_UPDATED",
        data={
            "order_id": order.id,
            "test_name": order.test_name,
            "status": order.status.value,
        },
    )

    return {
        "order_id": order.id,
        "test_name": order.test_name,
        "status": order.status.value,
        "message": f"Specimen status updated to {order.status.value}.",
    }


@router.post("/orders/{order_id}/verify")
async def verify_and_upload_report(
    order_id: str,
    payload: VerifyLabReportRequest,
    current_user: User = Depends(RoleChecker([UserRole.LAB_TECH, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Pathologist verification:
    Attaches diagnostic report, generates cryptographic SHA-256 integrity hash,
    and publishes verified report to patient's Care Journey and Doctor's cockpit.
    """
    stmt = (
        select(LabOrder)
        .options(
            selectinload(LabOrder.doctor).selectinload(DoctorProfile.user),
            selectinload(LabOrder.patient).selectinload(PatientProfile.user),
            selectinload(LabOrder.report),
        )
        .where(LabOrder.id == order_id)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab order not found.")

    if order.report:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report already verified for this order.")

    now = datetime.now(timezone.utc)
    rep_num = f"LAB-{now.year}-{random.randint(10000, 99999)}"
    doc_url = payload.document_url or f"/vault/reports/{rep_num}.pdf"

    # Compute content SHA-256 hash for tamper prevention
    file_hash = hashlib.sha256(f"{rep_num}|{payload.summary}|{order.patient_id}".encode("utf-8")).hexdigest()

    # Deterministic reference range evaluation
    from backend.app.services.lab_evaluation_service import extract_and_evaluate_flags
    evaluated_flags = extract_and_evaluate_flags(order.test_name, payload.summary, payload.abnormal_flags)

    report = LabReport(
        lab_order_id=order.id,
        patient_id=order.patient_id,
        verified_by_user_id=current_user.id,
        report_number=rep_num,
        document_url=doc_url,
        file_sha256=file_hash,
        summary=payload.summary,
        abnormal_flags=evaluated_flags,
        verified_at=now,
    )
    db.add(report)
    order.status = LabOrderStatus.VERIFIED

    # Update Care Journey
    j_stmt = select(CareJourney).where(
        CareJourney.patient_id == order.patient_id,
        CareJourney.status == JourneyStatus.ACTIVE,
    )
    j_res = await db.execute(j_stmt)
    journey = j_res.scalar_one_or_none()
    if journey:
        db.add(
            CareJourneyEvent(
                care_journey_id=journey.id,
                event_type=JourneyEventType.LAB_REPORT_READY,
                title=f"Diagnostic Report Ready: {order.test_name}",
                description=f"Verified by Pathologist. Summary: {payload.summary}",
                provider_name="Hospital Diagnostic Laboratory",
                reference_id=report.id,
                status=JourneyEventStatus.COMPLETED,
                next_action_label="Review Results",
                next_action_url=doc_url,
            )
        )

    await db.commit()
    await db.refresh(report)

    # Broadcast event
    await ws_manager.broadcast_to_room(
        room=f"patient:{order.patient_id}:journey",
        event_type="LAB_REPORT_VERIFIED",
        data={
            "report_id": report.id,
            "report_number": report.report_number,
            "test_name": order.test_name,
            "summary": report.summary,
            "abnormal_flags": report.abnormal_flags,
        },
    )

    return {
        "status": "VERIFIED",
        "report_id": report.id,
        "report_number": report.report_number,
        "sha256_hash": report.file_sha256,
        "message": f"Diagnostic report {report.report_number} verified and published.",
    }
