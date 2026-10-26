import hashlib
import random
from datetime import date, datetime, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.security import generate_prescription_seal, verify_prescription_seal
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.appointment import Appointment, QueueTicket
from backend.app.models.clinical import Encounter, LabOrder, Prescription, PrescriptionItem
from backend.app.models.enums import (
    AppointmentStatus,
    JourneyEventStatus,
    JourneyEventType,
    JourneyStatus,
    LabOrderStatus,
    QueueState,
)
from backend.app.models.hospital import DoctorProfile, Hospital
from backend.app.models.journey import CareJourney, CareJourneyEvent
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.clinical import (
    CompleteEncounterRequest,
    PrescriptionItemResponse,
    PrescriptionVerificationResponse,
)


class ClinicalService:
    @classmethod
    async def complete_encounter(
        cls,
        db: AsyncSession,
        doctor_id: str,
        payload: CompleteEncounterRequest,
    ) -> Tuple[Encounter, Optional[Prescription]]:
        stmt = (
            select(Appointment)
            .options(
                selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
                selectinload(Appointment.doctor).selectinload(DoctorProfile.hospital),
                selectinload(Appointment.patient).selectinload(PatientProfile.user),
                selectinload(Appointment.queue_ticket),
            )
            .where(Appointment.id == payload.appointment_id)
        )
        res = await db.execute(stmt)
        appt = res.scalar_one_or_none()

        if not appt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

        if appt.doctor_id != doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to complete consultations for this appointment.",
            )

        now = datetime.now(timezone.utc)

        encounter = Encounter(
            appointment_id=appt.id,
            patient_id=appt.patient_id,
            doctor_id=doctor_id,
            subjective=payload.subjective,
            objective=payload.objective,
            assessment=payload.assessment,
            plan=payload.plan,
        )
        db.add(encounter)
        await db.flush()

        prescription = None
        if payload.prescription_items:
            rand_code = f"CF-VRX-{random.randint(100000, 999999)}"
            rx_number = f"RX-{date.today().year}-{random.randint(10000, 99999)}"
            
            med_string = ";".join([
                f"{item.medicine_name}:{item.dosage}:{item.frequency}:{item.duration_days}"
                for item in payload.prescription_items
            ])
            med_hash = hashlib.sha256(med_string.encode("utf-8")).hexdigest()

            doc_reg = appt.doctor.registration_number
            timestamp_str = now.strftime("%Y-%m-%d %H:%M")
            seal = generate_prescription_seal(
                prescription_id=rx_number,
                doctor_registration=doc_reg,
                patient_id=appt.patient_id,
                timestamp_iso=timestamp_str,
                medications_hash=med_hash,
            )

            prescription = Prescription(
                encounter_id=encounter.id,
                patient_id=appt.patient_id,
                doctor_id=doctor_id,
                prescription_number=rx_number,
                digital_signature_hash=seal,
                verification_code=rand_code,
                instructions=payload.prescription_instructions,
                follow_up_date=payload.follow_up_date,
                created_at=now,
            )
            db.add(prescription)
            await db.flush()

            for item in payload.prescription_items:
                db.add(
                    PrescriptionItem(
                        prescription_id=prescription.id,
                        medicine_name=item.medicine_name,
                        generic_name=item.generic_name,
                        formulation=item.formulation,
                        dosage=item.dosage,
                        frequency=item.frequency,
                        duration_days=item.duration_days,
                        special_instructions=item.special_instructions,
                    )
                )

        if payload.lab_orders:
            for lo in payload.lab_orders:
                db.add(
                    LabOrder(
                        encounter_id=encounter.id,
                        patient_id=appt.patient_id,
                        doctor_id=doctor_id,
                        test_name=lo.test_name,
                        test_code=lo.test_code,
                        clinical_notes=lo.clinical_notes,
                        priority=lo.priority,
                        status=LabOrderStatus.ORDERED,
                    )
                )

        appt.status = AppointmentStatus.COMPLETED
        if appt.queue_ticket:
            appt.queue_ticket.state = QueueState.COMPLETED
            appt.queue_ticket.service_end_time = now

        j_stmt = select(CareJourney).where(
            and_(
                CareJourney.patient_id == appt.patient_id,
                CareJourney.status == JourneyStatus.ACTIVE,
            )
        )
        j_res = await db.execute(j_stmt)
        active_journey = j_res.scalar_one_or_none()

        if active_journey:
            db.add(
                CareJourneyEvent(
                    care_journey_id=active_journey.id,
                    event_type=JourneyEventType.CONSULTATION_HELD,
                    title=f"Consultation Completed with {appt.doctor.user.full_name}",
                    description=f"Assessment: {payload.assessment}",
                    provider_name=appt.doctor.hospital.name,
                    reference_id=encounter.id,
                    status=JourneyEventStatus.COMPLETED,
                )
            )

            if prescription:
                db.add(
                    CareJourneyEvent(
                        care_journey_id=active_journey.id,
                        event_type=JourneyEventType.PRESCRIPTION_ISSUED,
                        title=f"Prescription Issued ({prescription.prescription_number})",
                        description=f"{len(payload.prescription_items)} medication(s) prescribed. Follow-up: {payload.follow_up_date.strftime('%B %d, %Y') if payload.follow_up_date else 'As advised'}.",
                        provider_name=appt.doctor.user.full_name,
                        reference_id=prescription.id,
                        status=JourneyEventStatus.COMPLETED,
                        next_action_label="View / Verify Prescription",
                        next_action_url=f"/verify/rx/{prescription.verification_code}",
                    )
                )

            if payload.lab_orders:
                for lo in payload.lab_orders:
                    db.add(
                        CareJourneyEvent(
                            care_journey_id=active_journey.id,
                            event_type=JourneyEventType.LAB_TEST_ORDERED,
                            title=f"Diagnostic Ordered: {lo.test_name}",
                            description=f"Requisitioned by {appt.doctor.user.full_name}. Priority: {lo.priority.value}.",
                            provider_name="Hospital Diagnostic Laboratory",
                            status=JourneyEventStatus.IN_PROGRESS,
                            next_action_label="Sample Collection at Lab",
                        )
                    )

        await db.commit()
        await db.refresh(encounter)

        await ws_manager.broadcast_to_room(
            room=f"patient:{appt.patient_id}:journey",
            event_type="ENCOUNTER_COMPLETED",
            data={
                "appointment_id": appt.id,
                "prescription_issued": prescription is not None,
                "verification_code": prescription.verification_code if prescription else None,
            },
        )
        await ws_manager.broadcast_to_room(
            room=f"doctor:{doctor_id}:queue",
            event_type="QUEUE_ADVANCED",
            data={"completed_appointment_id": appt.id},
        )

        return encounter, prescription

    @classmethod
    async def verify_prescription(
        cls,
        db: AsyncSession,
        verification_code: str,
    ) -> PrescriptionVerificationResponse:
        stmt = (
            select(Prescription)
            .options(
                selectinload(Prescription.items),
                selectinload(Prescription.doctor).selectinload(DoctorProfile.user),
                selectinload(Prescription.doctor).selectinload(DoctorProfile.hospital),
                selectinload(Prescription.patient).selectinload(PatientProfile.user),
            )
            .where(Prescription.verification_code == verification_code)
        )
        res = await db.execute(stmt)
        rx = res.scalar_one_or_none()

        if not rx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prescription verification code not found or expired.",
            )

        med_string = ";".join([
            f"{item.medicine_name}:{item.dosage}:{item.frequency}:{item.duration_days}"
            for item in rx.items
        ])
        med_hash = hashlib.sha256(med_string.encode("utf-8")).hexdigest()
        
        doc_reg = rx.doctor.registration_number
        timestamp_str = rx.created_at.strftime("%Y-%m-%d %H:%M")
        is_seal_valid = verify_prescription_seal(
            prescription_id=rx.prescription_number,
            doctor_registration=doc_reg,
            patient_id=rx.patient_id,
            timestamp_iso=timestamp_str,
            medications_hash=med_hash,
            expected_seal=rx.digital_signature_hash,
        )

        p_name = rx.patient.user.full_name if (rx.patient and rx.patient.user) else "Patient"
        parts = p_name.split()
        masked_parts = [p[0] + "*" * (len(p) - 1) for p in parts if len(p) > 0]
        masked_name = " ".join(masked_parts)

        items_resp = [PrescriptionItemResponse.model_validate(item) for item in rx.items]

        return PrescriptionVerificationResponse(
            is_valid=is_seal_valid,
            verification_code=rx.verification_code,
            prescription_number=rx.prescription_number,
            doctor_name=rx.doctor.user.full_name,
            doctor_qualification=rx.doctor.qualification,
            doctor_registration=rx.doctor.registration_number,
            hospital_name=rx.doctor.hospital.name,
            patient_name_masked=masked_name,
            issued_at=rx.created_at,
            follow_up_date=rx.follow_up_date,
            instructions=rx.instructions,
            items=items_resp,
            cryptographic_seal=rx.digital_signature_hash,
            audit_status="OFFICIALLY_VERIFIED_NMC_COMPLIANT" if is_seal_valid else "TAMPER_DETECTED",
        )
