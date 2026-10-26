import random
from datetime import date, datetime, time
from typing import List, Tuple
from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.appointment import Appointment
from backend.app.models.enums import AppointmentStatus, AppointmentType, JourneyEventStatus, JourneyEventType, JourneyStatus
from backend.app.models.hospital import DoctorProfile, DoctorSchedule
from backend.app.models.journey import CareJourney, CareJourneyEvent
from backend.app.schemas.discovery import SlotItem


class SchedulingService:
    @staticmethod
    def _time_to_minutes(t: time) -> int:
        return t.hour * 60 + t.minute

    @staticmethod
    def _minutes_to_time(m: int) -> time:
        return time(m // 60, m % 60)

    @classmethod
    async def get_available_slots(
        cls,
        db: AsyncSession,
        doctor_id: str,
        target_date: date,
    ) -> Tuple[int, List[SlotItem]]:
        weekday = target_date.weekday()
        stmt = select(DoctorSchedule).where(
            and_(
                DoctorSchedule.doctor_id == doctor_id,
                DoctorSchedule.day_of_week == weekday,
                DoctorSchedule.is_active == True,
            )
        )
        res = await db.execute(stmt)
        schedule = res.scalar_one_or_none()

        if not schedule:
            return 15, []

        duration = schedule.slot_duration_minutes
        buffer_time = schedule.buffer_time_minutes
        step = duration + buffer_time

        start_min = cls._time_to_minutes(schedule.start_time)
        end_min = cls._time_to_minutes(schedule.end_time)

        appt_stmt = select(Appointment).where(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == target_date,
                Appointment.status.not_in([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
            )
        )
        appt_res = await db.execute(appt_stmt)
        existing_appts = appt_res.scalars().all()
        booked_times = {cls._time_to_minutes(a.start_time) for a in existing_appts}

        slots: List[SlotItem] = []
        current = start_min

        now = datetime.now()
        is_today = (target_date == now.date())
        current_time_min = now.hour * 60 + now.minute

        while current + duration <= end_min:
            slot_start = cls._minutes_to_time(current)
            slot_end = cls._minutes_to_time(current + duration)
            
            is_booked = current in booked_times
            is_past = is_today and (current <= current_time_min)
            is_available = (not is_booked) and (not is_past)

            slots.append(
                SlotItem(
                    start_time=slot_start.strftime("%H:%M"),
                    end_time=slot_end.strftime("%H:%M"),
                    is_available=is_available,
                )
            )
            current += step

        return duration, slots

    @classmethod
    async def book_appointment(
        cls,
        db: AsyncSession,
        patient_id: str,
        doctor_id: str,
        target_date: date,
        start_time_str: str,
        appointment_type: AppointmentType,
        reason_for_visit: str = None,
    ) -> Appointment:
        time_parts = [int(p) for p in start_time_str.split(":")[:2]]
        start_t = time(time_parts[0], time_parts[1])

        doc_stmt = (
            select(DoctorProfile)
            .options(selectinload(DoctorProfile.user), selectinload(DoctorProfile.hospital))
            .where(DoctorProfile.id == doctor_id)
        )
        doc_res = await db.execute(doc_stmt)
        doctor = doc_res.scalar_one_or_none()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

        weekday = target_date.weekday()
        sched_stmt = select(DoctorSchedule).where(
            and_(
                DoctorSchedule.doctor_id == doctor_id,
                DoctorSchedule.day_of_week == weekday,
                DoctorSchedule.is_active == True,
            )
        )
        sched_res = await db.execute(sched_stmt)
        schedule = sched_res.scalar_one_or_none()
        duration = schedule.slot_duration_minutes if schedule else 20

        start_min = cls._time_to_minutes(start_t)
        end_t = cls._minutes_to_time(start_min + duration)

        conflict_stmt = select(Appointment).where(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == target_date,
                Appointment.start_time == start_t,
                Appointment.status.not_in([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
            )
        )
        conflict_res = await db.execute(conflict_stmt)
        if conflict_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This appointment slot was just reserved by another patient. Please choose another available time.",
            )

        ref = f"CF-{target_date.year}-{random.randint(10000, 99999)}"

        new_appt = Appointment(
            booking_reference=ref,
            patient_id=patient_id,
            doctor_id=doctor_id,
            hospital_id=doctor.hospital_id,
            appointment_date=target_date,
            start_time=start_t,
            end_time=end_t,
            appointment_type=appointment_type,
            status=AppointmentStatus.CONFIRMED,
            reason_for_visit=reason_for_visit,
        )
        db.add(new_appt)
        await db.flush()

        journey_stmt = select(CareJourney).where(
            and_(
                CareJourney.patient_id == patient_id,
                CareJourney.status == JourneyStatus.ACTIVE,
            )
        )
        j_res = await db.execute(journey_stmt)
        active_journey = j_res.scalar_one_or_none()

        if not active_journey:
            active_journey = CareJourney(
                patient_id=patient_id,
                title=f"{doctor.specialization} Care Journey",
                status=JourneyStatus.ACTIVE,
            )
            db.add(active_journey)
            await db.flush()

        journey_event = CareJourneyEvent(
            care_journey_id=active_journey.id,
            event_type=JourneyEventType.APPOINTMENT_BOOKED,
            title=f"Consultation Confirmed with {doctor.user.full_name if doctor.user else 'Doctor'}",
            description=f"Scheduled for {target_date.strftime('%B %d, %Y')} at {start_t.strftime('%I:%M %p')}.",
            provider_name=doctor.hospital.name if doctor.hospital else "CareFlow Partner Hospital",
            reference_id=new_appt.id,
            status=JourneyEventStatus.COMPLETED,
            next_action_label="Digital Check-in upon arrival",
            next_action_url=f"/appointments/{new_appt.id}/checkin",
        )
        db.add(journey_event)
        await db.commit()
        await db.refresh(new_appt)

        return new_appt
