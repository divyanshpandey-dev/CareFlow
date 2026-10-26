from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import RoleChecker, get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment, QueueTicket
from backend.app.models.enums import QueueState, UserRole
from backend.app.models.hospital import Department, DoctorProfile
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.appointment import CheckInRequest
from backend.app.services.queue_service import QueueService

router = APIRouter(prefix="/queue", tags=["Live Queue & Check-in"])


class ReceptionCheckinRequest(BaseModel):
    appointment_id: str


@router.post("/checkin")
async def patient_checkin(
    payload: CheckInRequest,
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Appointment).where(Appointment.id == payload.appointment_id)
    res = await db.execute(stmt)
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    if appt.patient_id != current_patient.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check in for your own appointments.",
        )

    ticket = await QueueService.check_in_patient(
        db=db,
        appointment_id=payload.appointment_id,
        qr_token=payload.qr_token,
        is_reception_override=False,
    )

    return {
        "status": "CHECKED_IN",
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "sequence_number": ticket.sequence_number,
        "estimated_wait_minutes": ticket.estimated_wait_minutes,
        "message": f"Check-in successful. Your token is {ticket.ticket_number}.",
    }


@router.post("/reception-checkin")
async def reception_checkin(
    payload: ReceptionCheckinRequest,
    current_user: User = Depends(RoleChecker([UserRole.RECEPTIONIST, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    ticket = await QueueService.check_in_patient(
        db=db,
        appointment_id=payload.appointment_id,
        qr_token=None,
        is_reception_override=True,
    )
    return {
        "status": "CHECKED_IN",
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "sequence_number": ticket.sequence_number,
        "estimated_wait_minutes": ticket.estimated_wait_minutes,
        "message": f"Patient checked in successfully by reception. Token: {ticket.ticket_number}.",
    }


@router.get("/doctor/{doctor_id}")
async def get_doctor_queue(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await QueueService.get_doctor_queue(db, doctor_id)


@router.post("/doctor/{doctor_id}/call-next")
async def doctor_call_next(
    doctor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await QueueService.call_next_patient(db, doctor_id)
    if not ticket:
        return {
            "status": "QUEUE_EMPTY",
            "message": "No patients currently waiting in queue.",
        }

    return {
        "status": "PATIENT_CALLED",
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "called_time": ticket.called_time.isoformat() if ticket.called_time else None,
        "message": f"Patient {ticket.ticket_number} called to consultation room.",
    }


@router.get("/ticket/{ticket_id}")
async def get_ticket_status(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(QueueTicket)
        .options(
            selectinload(QueueTicket.doctor).selectinload(DoctorProfile.user),
            selectinload(QueueTicket.doctor).selectinload(DoctorProfile.hospital),
            selectinload(QueueTicket.doctor).selectinload(DoctorProfile.department),
        )
        .where(or_(QueueTicket.id == ticket_id, QueueTicket.appointment_id == ticket_id))
    )
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue ticket not found.")

    ahead_stmt = select(func.count(QueueTicket.id)).where(
        QueueTicket.doctor_id == ticket.doctor_id,
        QueueTicket.state.in_([QueueState.CHECKED_IN, QueueState.WAITING]),
        QueueTicket.sequence_number < ticket.sequence_number,
    )
    ahead_res = await db.execute(ahead_stmt)
    patients_ahead = ahead_res.scalar() or 0

    return {
        "id": ticket.id,
        "ticket_id": ticket.id,
        "appointment_id": ticket.appointment_id,
        "ticket_number": ticket.ticket_number,
        "sequence_number": ticket.sequence_number,
        "queue_position": patients_ahead + 1 if ticket.state in [QueueState.WAITING, QueueState.CHECKED_IN] else 0,
        "patients_ahead": patients_ahead,
        "state": ticket.state.value,
        "status": ticket.state.value,
        "estimated_wait_minutes": ticket.estimated_wait_minutes,
        "doctor_id": ticket.doctor_id,
        "doctor_name": ticket.doctor.user.full_name if (ticket.doctor and ticket.doctor.user) else "Doctor",
        "department_name": ticket.doctor.department.name if (ticket.doctor and ticket.doctor.department) else "General OPD",
        "room_number": ticket.doctor.room_number if ticket.doctor else "Room",
        "hospital_name": ticket.doctor.hospital.name if (ticket.doctor and ticket.doctor.hospital) else "Hospital",
    }


class EmergencyQueueOverrideRequest(BaseModel):
    ticket_id: str
    reason: str  # Clinical triage justification (e.g. Acute chest pain, respiratory distress, trauma)


@router.post("/emergency-override")
async def emergency_queue_override(
    payload: EmergencyQueueOverrideRequest,
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Emergency Queue Fast-Track Override:
    Allows authorized clinical staff to prioritize an urgent patient to the front of the queue.
    Requires mandatory clinical triage reason and indelibly records an audit event.
    """
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory clinical justification required for emergency queue fast-track override.",
        )

    ticket = await QueueService.emergency_override(
        db=db,
        ticket_id=payload.ticket_id,
        authorized_by_user_id=current_user.id,
        reason=payload.reason.strip(),
    )

    from backend.app.models.audit import AuditLog
    audit = AuditLog(
        actor_id=current_user.id,
        action="EMERGENCY_QUEUE_OVERRIDE",
        resource_type="QUEUE_TICKET",
        resource_id=ticket.id,
        status="SUCCESS",
        details_json={
            "ticket_number": ticket.ticket_number,
            "doctor_id": ticket.doctor_id,
            "reason": payload.reason.strip(),
            "authorized_by": current_user.full_name or current_user.email,
        },
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "EMERGENCY_OVERRIDE_APPLIED",
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "sequence_number": ticket.sequence_number,
        "reason": payload.reason.strip(),
        "message": f"Emergency priority granted to ticket {ticket.ticket_number}. Moved to front of queue.",
    }

