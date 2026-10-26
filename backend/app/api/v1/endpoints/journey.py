from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment
from backend.app.models.clinical import Prescription
from backend.app.models.enums import (
    AppointmentStatus,
    JourneyEventStatus,
    JourneyEventType,
    JourneyStatus,
)
from backend.app.models.hospital import DoctorProfile
from backend.app.models.journey import CareJourney, CareJourneyEvent
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.journey import (
    CareJourneyEventResponse,
    CareJourneyNextAction,
    CareJourneyResponse,
)

router = APIRouter(prefix="/journey", tags=["Care Journey"])


async def _resolve_patient_next_action(
    db: AsyncSession, patient_id: str
) -> Optional[CareJourneyNextAction]:
    """
    Computes genuine next recommended action based on patient's current clinical state.
    """
    # 1. Check for upcoming active appointments
    appt_stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.hospital),
        )
        .where(
            Appointment.patient_id == patient_id,
            Appointment.status.in_([
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.CHECKED_IN,
                AppointmentStatus.IN_QUEUE,
                AppointmentStatus.IN_CONSULTATION,
            ]),
        )
        .order_by(Appointment.appointment_date.asc(), Appointment.start_time.asc())
    )
    appt_res = await db.execute(appt_stmt)
    upcoming_appt = appt_res.scalars().first()

    if upcoming_appt:
        doc_name = (
            upcoming_appt.doctor.user.full_name
            if (upcoming_appt.doctor and upcoming_appt.doctor.user)
            else "Doctor"
        )
        hosp_name = upcoming_appt.hospital.name if upcoming_appt.hospital else "Hospital"
        if upcoming_appt.status == AppointmentStatus.IN_QUEUE:
            return CareJourneyNextAction(
                stage="IN_QUEUE",
                action=f"Waiting in Queue for Dr. {doc_name}",
                details=f"You are currently in queue at {hosp_name}. Keep your token notification visible.",
                suggested_date=upcoming_appt.appointment_date.isoformat(),
                url=f"/patient/appointments/{upcoming_appt.id}/checkin",
            )
        elif upcoming_appt.status == AppointmentStatus.CHECKED_IN:
            return CareJourneyNextAction(
                stage="CHECKED_IN",
                action=f"Checked In — Proceed to Dr. {doc_name}'s Room",
                details=f"Check-in verified at {hosp_name}. Watch screen for your token call.",
                suggested_date=upcoming_appt.appointment_date.isoformat(),
                url=f"/patient/appointments/{upcoming_appt.id}/checkin",
            )
        else:
            return CareJourneyNextAction(
                stage="APPOINTMENT",
                action=f"Upcoming Consultation with Dr. {doc_name}",
                details=f"Scheduled on {upcoming_appt.appointment_date.strftime('%B %d, %Y')} at {upcoming_appt.start_time.strftime('%I:%M %p')} at {hosp_name}. Complete contactless QR check-in on arrival.",
                suggested_date=upcoming_appt.appointment_date.isoformat(),
                url=f"/patient/appointments/{upcoming_appt.id}/checkin",
            )

    # 2. Check for recent prescriptions
    rx_stmt = (
        select(Prescription)
        .where(Prescription.patient_id == patient_id)
        .order_by(desc(Prescription.created_at))
    )
    rx_res = await db.execute(rx_stmt)
    latest_rx = rx_res.scalars().first()

    if latest_rx:
        follow_up_str = (
            latest_rx.follow_up_date.strftime("%B %d, %Y")
            if latest_rx.follow_up_date
            else None
        )
        return CareJourneyNextAction(
            stage="PRESCRIPTION",
            action="Active Medication Course & Regimen",
            details="Continue prescribed medications as advised by your doctor. Follow up if symptoms change.",
            suggested_date=follow_up_str,
            url="/patient/dashboard#prescriptions",
        )

    # 3. Default preventative wellness
    return CareJourneyNextAction(
        stage="WELLNESS",
        action="Schedule Routine Checkup or Preventive Consult",
        details="No active appointments or treatment pending. Discover doctors or book routine screenings anytime.",
        suggested_date=None,
        url="/patient/discover",
    )


async def _get_or_create_patient_journey(
    db: AsyncSession, patient: PatientProfile
) -> CareJourneyResponse:
    # Look for existing journey
    stmt = (
        select(CareJourney)
        .options(selectinload(CareJourney.events))
        .where(CareJourney.patient_id == patient.id)
        .order_by(desc(CareJourney.started_at))
    )
    res = await db.execute(stmt)
    journey = res.scalars().first()

    # Get patient's full name
    patient_user_stmt = select(User).where(User.id == patient.user_id)
    u_res = await db.execute(patient_user_stmt)
    user_obj = u_res.scalar_one_or_none()
    patient_name = user_obj.full_name if user_obj else "Patient"

    if not journey:
        # Create a new CareJourney for patient
        journey = CareJourney(
            patient_id=patient.id,
            title="Unified Longitudinal Healthcare Journey",
            status=JourneyStatus.ACTIVE,
            started_at=datetime.now(timezone.utc),
        )
        db.add(journey)
        await db.flush()

        # Populate initial events from any existing appointments
        appts_stmt = (
            select(Appointment)
            .options(
                selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
                selectinload(Appointment.hospital),
            )
            .where(Appointment.patient_id == patient.id)
            .order_by(Appointment.created_at.asc())
        )
        appts = (await db.execute(appts_stmt)).scalars().all()
        for a in appts:
            doc_name = a.doctor.user.full_name if (a.doctor and a.doctor.user) else "Doctor"
            ev = CareJourneyEvent(
                care_journey_id=journey.id,
                event_type=JourneyEventType.APPOINTMENT_SCHEDULED,
                title=f"Appointment Booked: Dr. {doc_name}",
                description=f"Consultation scheduled for {a.appointment_date} at {a.start_time.strftime('%H:%M')}",
                provider_name=doc_name,
                reference_id=a.id,
                status=JourneyEventStatus.COMPLETED if a.status == AppointmentStatus.COMPLETED else JourneyEventStatus.PENDING,
                next_action_label="View Appointment",
                next_action_url=f"/patient/appointments/{a.id}/checkin",
                event_timestamp=datetime.combine(a.appointment_date, a.start_time, tzinfo=timezone.utc),
            )
            db.add(ev)

        # Populate events from prescriptions
        rx_stmt = (
            select(Prescription)
            .options(selectinload(Prescription.doctor).selectinload(DoctorProfile.user))
            .where(Prescription.patient_id == patient.id)
            .order_by(Prescription.created_at.asc())
        )
        rxs = (await db.execute(rx_stmt)).scalars().all()
        for rx in rxs:
            doc_name = rx.doctor.user.full_name if (rx.doctor and rx.doctor.user) else "Doctor"
            ev = CareJourneyEvent(
                care_journey_id=journey.id,
                event_type=JourneyEventType.PRESCRIPTION_DISPENSED,
                title=f"Prescription Issued by Dr. {doc_name}",
                description=f"Prescription {rx.prescription_number} signed with HMAC-SHA256 seal.",
                provider_name=doc_name,
                reference_id=rx.id,
                status=JourneyEventStatus.COMPLETED,
                next_action_label="Review Medications",
                next_action_url="/patient/dashboard#prescriptions",
                event_timestamp=rx.created_at,
            )
            db.add(ev)

        await db.commit()
        await db.refresh(journey)
        # Reload with events
        stmt_reload = (
            select(CareJourney)
            .options(selectinload(CareJourney.events))
            .where(CareJourney.id == journey.id)
        )
        journey = (await db.execute(stmt_reload)).scalar_one()

    sorted_events = sorted(journey.events, key=lambda e: e.event_timestamp)
    next_action = await _resolve_patient_next_action(db, patient.id)

    mapped_events = []
    for e in sorted_events:
        item = CareJourneyEventResponse.model_validate(e)
        item.stage = e.event_type.value
        item.timestamp = e.event_timestamp.isoformat()
        mapped_events.append(item)

    return CareJourneyResponse(
        id=journey.id,
        patient_id=journey.patient_id,
        patient_name=patient_name,
        title=journey.title,
        status=journey.status,
        started_at=journey.started_at,
        completed_at=journey.completed_at,
        next_action=next_action,
        events=mapped_events,
    )


@router.get("/my", response_model=CareJourneyResponse)
async def get_my_active_journey(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the patient's active, connected Care Journey timeline.
    Shows past encounters, prescriptions, lab tests, and next actions.
    """
    return await _get_or_create_patient_journey(db, current_patient)


@router.get("/patient/{patient_id}", response_model=CareJourneyResponse)
async def get_patient_journey(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Clinician view: Loads the patient's care journey timeline for clinical context.
    """
    p_stmt = select(PatientProfile).where(PatientProfile.id == patient_id)
    p_res = await db.execute(p_stmt)
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    return await _get_or_create_patient_journey(db, patient)
