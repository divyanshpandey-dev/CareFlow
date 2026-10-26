from datetime import date, datetime, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.appointment import Appointment, QueueTicket
from backend.app.models.enums import (
    AppointmentStatus,
    JourneyEventStatus,
    JourneyEventType,
    JourneyStatus,
    QueueState,
)
from backend.app.models.hospital import Department, DoctorProfile, Hospital
from backend.app.models.journey import CareJourney, CareJourneyEvent
from backend.app.models.user import PatientProfile, User


class QueueService:
    DEFAULT_SLOT_MINUTES = 18

    @classmethod
    def calculate_estimated_wait(
        cls,
        patients_ahead_count: int,
        current_consultation_overrun_minutes: int = 0,
        average_consultation_minutes: int = DEFAULT_SLOT_MINUTES,
    ) -> int:
        if patients_ahead_count <= 0:
            return 0
        base_wait = patients_ahead_count * average_consultation_minutes
        total = base_wait + max(0, current_consultation_overrun_minutes)
        return total

    @classmethod
    async def check_in_patient(
        cls,
        db: AsyncSession,
        appointment_id: str,
        qr_token: Optional[str] = None,
        is_reception_override: bool = False,
    ) -> QueueTicket:
        stmt = (
            select(Appointment)
            .options(
                selectinload(Appointment.doctor).selectinload(DoctorProfile.department),
                selectinload(Appointment.hospital),
                selectinload(Appointment.patient).selectinload(PatientProfile.user),
                selectinload(Appointment.queue_ticket),
            )
            .where(Appointment.id == appointment_id)
        )
        res = await db.execute(stmt)
        appt = res.scalar_one_or_none()

        if not appt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

        if appt.appointment_date != date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Check-in is only permitted on the day of the appointment ({appt.appointment_date.strftime('%B %d, %Y')}).",
            )

        if appt.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot check in: Appointment status is {appt.status.value}.",
            )

        if appt.queue_ticket:
            return appt.queue_ticket

        if not is_reception_override:
            if qr_token and qr_token != appt.hospital.qr_checkin_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid hospital QR code. Please scan the official QR code at the reception desk.",
                )

        seq_stmt = select(func.count(QueueTicket.id)).where(
            and_(
                QueueTicket.doctor_id == appt.doctor_id,
                func.date(QueueTicket.check_in_time) == date.today(),
            )
        )
        seq_res = await db.execute(seq_stmt)
        sequence_num = (seq_res.scalar() or 0) + 1

        dept_code = appt.doctor.department.code if (appt.doctor and appt.doctor.department) else "OPD"
        ticket_number = f"{dept_code}-A{sequence_num:02d}"

        ahead_stmt = select(func.count(QueueTicket.id)).where(
            and_(
                QueueTicket.doctor_id == appt.doctor_id,
                QueueTicket.state.in_([QueueState.CHECKED_IN, QueueState.WAITING, QueueState.CALLED, QueueState.IN_CONSULTATION]),
            )
        )
        ahead_res = await db.execute(ahead_stmt)
        patients_ahead = ahead_res.scalar() or 0

        estimated_wait = cls.calculate_estimated_wait(patients_ahead)

        ticket = QueueTicket(
            appointment_id=appt.id,
            doctor_id=appt.doctor_id,
            hospital_id=appt.hospital_id,
            ticket_number=ticket_number,
            sequence_number=sequence_num,
            check_in_time=datetime.now(timezone.utc),
            state=QueueState.WAITING,
            estimated_wait_minutes=estimated_wait,
        )
        db.add(ticket)

        appt.status = AppointmentStatus.IN_QUEUE
        await db.flush()

        journey_stmt = select(CareJourney).where(
            and_(
                CareJourney.patient_id == appt.patient_id,
                CareJourney.status == JourneyStatus.ACTIVE,
            )
        )
        j_res = await db.execute(journey_stmt)
        active_journey = j_res.scalar_one_or_none()
        if active_journey:
            db.add(
                CareJourneyEvent(
                    care_journey_id=active_journey.id,
                    event_type=JourneyEventType.CHECKED_IN,
                    title="Checked In at Hospital",
                    description=f"Token {ticket_number} assigned. Approximately {patients_ahead} patients ahead in queue.",
                    provider_name=appt.hospital.name,
                    reference_id=ticket.id,
                    status=JourneyEventStatus.COMPLETED,
                    next_action_label="Waiting for Doctor Call",
                )
            )

        await db.commit()
        await db.refresh(ticket)

        await ws_manager.broadcast_to_room(
            room=f"doctor:{appt.doctor_id}:queue",
            event_type="QUEUE_UPDATED",
            data={
                "action": "PATIENT_CHECKED_IN",
                "ticket_number": ticket.ticket_number,
                "sequence_number": ticket.sequence_number,
                "patient_name": appt.patient.user.full_name if (appt.patient and appt.patient.user) else "Patient",
                "appointment_id": appt.id,
                "state": ticket.state.value,
            },
        )
        await ws_manager.broadcast_to_room(
            room=f"hospital:{appt.hospital_id}:queue",
            event_type="HOSPITAL_QUEUE_UPDATED",
            data={
                "doctor_id": appt.doctor_id,
                "ticket_number": ticket.ticket_number,
                "status": "WAITING",
            },
        )

        return ticket

    @classmethod
    async def call_next_patient(
        cls,
        db: AsyncSession,
        doctor_id: str,
    ) -> Optional[QueueTicket]:
        now = datetime.now(timezone.utc)

        active_stmt = select(QueueTicket).where(
            and_(
                QueueTicket.doctor_id == doctor_id,
                QueueTicket.state.in_([QueueState.IN_CONSULTATION, QueueState.CALLED]),
            )
        )
        active_res = await db.execute(active_stmt)
        active_tickets = active_res.scalars().all()
        for t in active_tickets:
            t.state = QueueState.COMPLETED
            t.service_end_time = now

        next_stmt = (
            select(QueueTicket)
            .options(
                selectinload(QueueTicket.appointment).selectinload(Appointment.patient),
            )
            .where(
                and_(
                    QueueTicket.doctor_id == doctor_id,
                    QueueTicket.state == QueueState.WAITING,
                )
            )
            .order_by(QueueTicket.sequence_number)
            .limit(1)
        )
        next_res = await db.execute(next_stmt)
        next_ticket = next_res.scalar_one_or_none()

        if not next_ticket:
            await db.commit()
            return None

        next_ticket.state = QueueState.CALLED
        next_ticket.called_time = now
        next_ticket.estimated_wait_minutes = 0

        if next_ticket.appointment:
            next_ticket.appointment.status = AppointmentStatus.IN_QUEUE

        subsequent_stmt = (
            select(QueueTicket)
            .where(
                and_(
                    QueueTicket.doctor_id == doctor_id,
                    QueueTicket.state == QueueState.WAITING,
                )
            )
            .order_by(QueueTicket.sequence_number)
        )
        sub_res = await db.execute(subsequent_stmt)
        waiting_tickets = sub_res.scalars().all()
        for idx, wt in enumerate(waiting_tickets):
            wt.estimated_wait_minutes = cls.calculate_estimated_wait(idx + 1)

        await db.commit()
        await db.refresh(next_ticket)

        doc_stmt = select(DoctorProfile).options(selectinload(DoctorProfile.user)).where(DoctorProfile.id == doctor_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one()

        await ws_manager.broadcast_to_room(
            room=f"doctor:{doctor_id}:queue",
            event_type="PATIENT_CALLED",
            data={
                "ticket_number": next_ticket.ticket_number,
                "appointment_id": next_ticket.appointment_id,
                "room_number": doc.room_number or "Room",
                "doctor_name": doc.user.full_name,
                "timestamp": now.isoformat(),
            },
        )
        await ws_manager.broadcast_to_room(
            room=f"ticket:{next_ticket.id}",
            event_type="YOUR_TURN_CALLED",
            data={
                "ticket_number": next_ticket.ticket_number,
                "room_number": doc.room_number or "Room",
                "message": f"Doctor is ready for you in {doc.room_number or 'Consultation Room'}!",
            },
        )

        return next_ticket

    @classmethod
    async def get_doctor_queue(
        cls,
        db: AsyncSession,
        doctor_id: str,
    ) -> Dict[str, Any]:
        stmt = (
            select(QueueTicket)
            .options(
                selectinload(QueueTicket.appointment).selectinload(Appointment.patient).selectinload(PatientProfile.user),
            )
            .where(
                and_(
                    QueueTicket.doctor_id == doctor_id,
                    func.date(QueueTicket.check_in_time) == date.today(),
                )
            )
            .order_by(QueueTicket.sequence_number)
        )
        res = await db.execute(stmt)
        tickets = res.scalars().all()

        current_ticket = None
        waiting_list = []
        completed_count = 0

        for t in tickets:
            patient_name = "Patient"
            if t.appointment and t.appointment.patient and t.appointment.patient.user:
                patient_name = t.appointment.patient.user.full_name

            ticket_info = {
                "id": t.id,
                "appointment_id": t.appointment_id,
                "ticket_number": t.ticket_number,
                "sequence_number": t.sequence_number,
                "patient_name": patient_name,
                "patient_id": t.appointment.patient_id if t.appointment else None,
                "state": t.state.value,
                "check_in_time": t.check_in_time.strftime("%I:%M %p"),
                "estimated_wait_minutes": t.estimated_wait_minutes,
                "reason": t.appointment.reason_for_visit if t.appointment else None,
            }

            if t.state in [QueueState.CALLED, QueueState.IN_CONSULTATION]:
                current_ticket = ticket_info
            elif t.state == QueueState.WAITING:
                waiting_list.append(ticket_info)
            elif t.state == QueueState.COMPLETED:
                completed_count += 1

        return {
            "doctor_id": doctor_id,
            "current_patient": current_ticket,
            "waiting_patients": waiting_list,
            "waiting_count": len(waiting_list),
            "completed_count": completed_count,
            "total_today": len(tickets),
        }

    @classmethod
    async def emergency_override(
        cls,
        db: AsyncSession,
        ticket_id: str,
        authorized_by_user_id: str,
        reason: str,
    ) -> QueueTicket:
        stmt = (
            select(QueueTicket)
            .options(
                selectinload(QueueTicket.doctor),
                selectinload(QueueTicket.appointment),
            )
            .where(QueueTicket.id == ticket_id)
        )
        res = await db.execute(stmt)
        ticket = res.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue ticket not found.")

        ticket.sequence_number = 0
        ticket.state = QueueState.WAITING
        ticket.estimated_wait_minutes = 0

        await ws_manager.broadcast_to_room(
            room=f"hospital:{ticket.hospital_id}:queue",
            event_type="EMERGENCY_QUEUE_OVERRIDE",
            data={
                "ticket_id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "doctor_id": ticket.doctor_id,
                "reason": reason,
            },
        )

        return ticket

