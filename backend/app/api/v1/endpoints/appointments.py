from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.appointment import Appointment, QueueTicket
from backend.app.models.enums import AppointmentStatus, UserRole
from backend.app.models.hospital import DoctorProfile, Hospital
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.appointment import (
    AppointmentResponse,
    BookAppointmentRequest,
    QueueTicketSummary,
)
from backend.app.services.scheduling_service import SchedulingService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _map_appointment_response(appt: Appointment) -> AppointmentResponse:
    ticket_summary = None
    if appt.queue_ticket:
        ticket_summary = QueueTicketSummary(
            id=appt.queue_ticket.id,
            ticket_number=appt.queue_ticket.ticket_number,
            sequence_number=appt.queue_ticket.sequence_number,
            check_in_time=appt.queue_ticket.check_in_time,
            called_time=appt.queue_ticket.called_time,
            state=appt.queue_ticket.state,
            estimated_wait_minutes=appt.queue_ticket.estimated_wait_minutes,
        )

    return AppointmentResponse(
        id=appt.id,
        booking_reference=appt.booking_reference,
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        doctor_name=appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor",
        doctor_specialization=appt.doctor.specialization if appt.doctor else "Specialist",
        hospital_id=appt.hospital_id,
        hospital_name=appt.hospital.name if appt.hospital else "Hospital",
        hospital_address=appt.hospital.address if appt.hospital else "",
        room_number=appt.doctor.room_number if appt.doctor else None,
        appointment_date=appt.appointment_date,
        start_time=appt.start_time,
        end_time=appt.end_time,
        appointment_type=appt.appointment_type,
        status=appt.status,
        reason_for_visit=appt.reason_for_visit,
        created_at=appt.created_at,
        scheduled_start=f"{appt.appointment_date.isoformat()}T{appt.start_time.strftime('%H:%M:%S')}",
        queue_ticket=ticket_summary,
    )


@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    payload: BookAppointmentRequest,
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    if not payload.appointment_date or not payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment date and start time are required.",
        )

    if payload.appointment_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book appointments in the past.",
        )

    appt = await SchedulingService.book_appointment(
        db=db,
        patient_id=current_patient.id,
        doctor_id=payload.doctor_id,
        target_date=payload.appointment_date,
        start_time_str=payload.start_time,
        appointment_type=payload.appointment_type,
        reason_for_visit=payload.reason_for_visit,
    )

    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.hospital),
            selectinload(Appointment.queue_ticket),
        )
        .where(Appointment.id == appt.id)
    )
    res = await db.execute(stmt)
    full_appt = res.scalar_one()

    await ws_manager.broadcast_to_room(
        room=f"doctor:{appt.doctor_id}:queue",
        event_type="NEW_APPOINTMENT_BOOKED",
        data={
            "appointment_id": full_appt.id,
            "booking_reference": full_appt.booking_reference,
            "appointment_date": full_appt.appointment_date.isoformat(),
            "start_time": full_appt.start_time.strftime("%H:%M"),
        },
    )

    return _map_appointment_response(full_appt)


@router.get("/my", response_model=List[AppointmentResponse])
async def list_my_appointments(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.hospital),
            selectinload(Appointment.queue_ticket),
        )
        .where(Appointment.patient_id == current_patient.id)
        .order_by(desc(Appointment.appointment_date), desc(Appointment.start_time))
    )
    res = await db.execute(stmt)
    appts = res.scalars().all()
    return [_map_appointment_response(a) for a in appts]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment_details(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.hospital),
            selectinload(Appointment.queue_ticket),
        )
        .where(Appointment.id == appointment_id)
    )
    res = await db.execute(stmt)
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    if current_user.role == UserRole.PATIENT:
        stmt_p = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        p_res = await db.execute(stmt_p)
        patient = p_res.scalar_one_or_none()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this appointment.")

    return _map_appointment_response(appt)


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.hospital),
            selectinload(Appointment.queue_ticket),
        )
        .where(Appointment.id == appointment_id)
    )
    res = await db.execute(stmt)
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    if current_user.role == UserRole.PATIENT:
        stmt_p = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        p_res = await db.execute(stmt_p)
        patient = p_res.scalar_one_or_none()
        if not patient or appt.patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only cancel your own appointments.",
            )
    elif current_user.role == UserRole.DOCTOR:
        stmt_d = select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        d_res = await db.execute(stmt_d)
        doctor = d_res.scalar_one_or_none()
        if not doctor or appt.doctor_id != doctor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only cancel appointments assigned to your clinic.",
            )

    if appt.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel appointment with status {appt.status.value}.",
        )

    appt.status = AppointmentStatus.CANCELLED
    if appt.queue_ticket:
        from backend.app.models.enums import QueueState
        appt.queue_ticket.state = QueueState.CANCELLED

    await db.commit()
    await db.refresh(appt)

    return _map_appointment_response(appt)
