import asyncio
import hashlib
import logging
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal, init_db
from backend.app.core.security import get_password_hash, generate_prescription_seal
from backend.app.models.enums import (
    AppointmentStatus,
    AppointmentType,
    Gender,
    JourneyEventStatus,
    JourneyEventType,
    JourneyStatus,
    LabOrderPriority,
    LabOrderStatus,
    MedicineFormulation,
    QueueState,
    UserRole,
)
from backend.app.models.user import User, PatientProfile
from backend.app.models.hospital import Hospital, Department, DoctorProfile, DoctorSchedule
from backend.app.models.appointment import Appointment, QueueTicket
from backend.app.models.clinical import Encounter, Prescription, PrescriptionItem, LabOrder, LabReport
from backend.app.models.journey import CareJourney, CareJourneyEvent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("careflow.seeder")

DEMO_PASSWORD = "password123"


async def seed_data():
    logger.info("Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(User).where(User.email == "superadmin@careflow.com"))
        if result.scalar_one_or_none():
            logger.info("Database is already seeded with demo records. Skipping seeding.")
            return

        logger.info("Seeding CareFlow Multi-Hospital Demo Environment...")

        # 1. Super Admin
        super_admin = User(
            email="superadmin@careflow.com",
            phone="9000000001",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Platform Super Administrator",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        session.add(super_admin)

        # 2. Hospitals
        h1 = Hospital(
            hfr_id="IN-DL-HFR-10492",
            name="City Care Multi-Specialty Hospital",
            slug="city-care-delhi",
            city="New Delhi",
            state="Delhi",
            address="Plot 14, Institutional Area, Saket, New Delhi - 110017",
            latitude=28.5244,
            longitude=77.2066,
            qr_checkin_token="QR-CITYCARE-DELHI-001",
            is_verified=True,
            is_active=True,
        )
        h2 = Hospital(
            hfr_id="IN-MH-HFR-20981",
            name="Apollo Grace Health City",
            slug="apollo-grace-mumbai",
            city="Mumbai",
            state="Maharashtra",
            address="Opp. Gateway Park, Powai, Mumbai - 400076",
            latitude=19.1176,
            longitude=72.9060,
            qr_checkin_token="QR-APOLLOGRACE-MUM-002",
            is_verified=True,
            is_active=True,
        )
        h3 = Hospital(
            hfr_id="IN-KA-HFR-30114",
            name="Apex Heart & Super Speciality Institute",
            slug="apex-heart-bengaluru",
            city="Bengaluru",
            state="Karnataka",
            address="100 Feet Ring Road, Indiranagar, Bengaluru - 560038",
            latitude=12.9719,
            longitude=77.6412,
            qr_checkin_token="QR-APEXHEART-BLR-003",
            is_verified=True,
            is_active=True,
        )
        session.add_all([h1, h2, h3])
        await session.flush()

        # 3. Departments for Hospital 1 (City Care)
        dept_cardio = Department(
            hospital_id=h1.id,
            name="Cardiology & Vascular Sciences",
            code="CARD",
            description="Comprehensive cardiac care, angiography, ECG, and echocardiography.",
        )
        dept_ortho = Department(
            hospital_id=h1.id,
            name="Orthopedics & Joint Reconstruction",
            code="ORTHO",
            description="Arthroscopy, joint replacements, and trauma care.",
        )
        dept_gen = Department(
            hospital_id=h1.id,
            name="General Internal Medicine",
            code="GENMED",
            description="Preventive health checks, diabetes, hypertension, and acute care.",
        )
        session.add_all([dept_cardio, dept_ortho, dept_gen])

        # Department for Hospital 3 (Apex Heart)
        dept_apex_cardio = Department(
            hospital_id=h3.id,
            name="Interventional Cardiology",
            code="CARDIO-APEX",
            description="Advanced heart care, second opinions, and cardiac rehabilitation.",
        )
        session.add(dept_apex_cardio)
        await session.flush()

        # 4. Hospital Admin, Receptionist, and Lab Tech for City Care
        h1_admin = User(
            email="admin@citycare.com",
            phone="9000000002",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Suresh Menon",
            role=UserRole.HOSPITAL_ADMIN,
            hospital_id=h1.id,
            is_active=True,
        )
        h1_receptionist = User(
            email="receptionist@citycare.com",
            phone="9000000003",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Pooja Nair",
            role=UserRole.RECEPTIONIST,
            hospital_id=h1.id,
            is_active=True,
        )
        h1_labtech = User(
            email="lab@citycare.com",
            phone="9000000004",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Amit Desai",
            role=UserRole.LAB_TECH,
            hospital_id=h1.id,
            is_active=True,
        )
        session.add_all([h1_admin, h1_receptionist, h1_labtech])

        # 5. Doctor 1: Dr. Ananya Sharma (Cardiologist, City Care)
        u_dr_ananya = User(
            email="dr.ananya@citycare.com",
            phone="9000000010",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Dr. Ananya Sharma",
            role=UserRole.DOCTOR,
            hospital_id=h1.id,
            is_active=True,
        )
        session.add(u_dr_ananya)
        await session.flush()

        doc_ananya = DoctorProfile(
            user_id=u_dr_ananya.id,
            hospital_id=h1.id,
            department_id=dept_cardio.id,
            hpr_id="HPR-IN-2012-99812",
            registration_number="MCI-2012-49821",
            qualification="MBBS, MD (Gen Med), DM (Cardiology, AIIMS)",
            specialization="Cardiology",
            experience_years=12,
            consultation_fee=800.0,
            room_number="Room 302",
            languages=["English", "Hindi"],
            is_verified=True,
        )
        session.add(doc_ananya)
        await session.flush()

        # Doctor 1 Schedule (All weekdays 09:00 - 17:00)
        for day in range(7):
            session.add(
                DoctorSchedule(
                    doctor_id=doc_ananya.id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    slot_duration_minutes=20,
                    buffer_time_minutes=5,
                    max_patients_per_session=25,
                    is_active=True,
                )
            )

        # 6. Doctor 2: Dr. Rajesh Iyer (Orthopedics, City Care)
        u_dr_rajesh = User(
            email="dr.rajesh@citycare.com",
            phone="9000000011",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Dr. Rajesh Iyer",
            role=UserRole.DOCTOR,
            hospital_id=h1.id,
            is_active=True,
        )
        session.add(u_dr_rajesh)
        await session.flush()

        doc_rajesh = DoctorProfile(
            user_id=u_dr_rajesh.id,
            hospital_id=h1.id,
            department_id=dept_ortho.id,
            hpr_id="HPR-IN-2009-84721",
            registration_number="MCI-2009-12344",
            qualification="MBBS, MS (Orthopedics), M.Ch (UK)",
            specialization="Orthopedics",
            experience_years=15,
            consultation_fee=700.0,
            room_number="Room 205",
            languages=["English", "Tamil", "Hindi"],
            is_verified=True,
        )
        session.add(doc_rajesh)
        await session.flush()

        for day in range(7):
            session.add(
                DoctorSchedule(
                    doctor_id=doc_rajesh.id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(18, 0),
                    slot_duration_minutes=15,
                    buffer_time_minutes=5,
                    is_active=True,
                )
            )

        # 7. Doctor 3: Dr. Sunita Mehta (Cardiologist, Apex Heart - for Second Opinion consent demo)
        u_dr_mehta = User(
            email="dr.mehta@apexheart.com",
            phone="9000000012",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Dr. Sunita Mehta",
            role=UserRole.DOCTOR,
            hospital_id=h3.id,
            is_active=True,
        )
        session.add(u_dr_mehta)
        await session.flush()

        doc_mehta = DoctorProfile(
            user_id=u_dr_mehta.id,
            hospital_id=h3.id,
            department_id=dept_apex_cardio.id,
            hpr_id="HPR-IN-2006-00492",
            registration_number="MCI-2006-00492",
            qualification="MBBS, MD, DM (Cardiology), FACC",
            specialization="Cardiology",
            experience_years=18,
            consultation_fee=1000.0,
            room_number="Suite 501",
            languages=["English", "Hindi", "Kannada"],
            is_verified=True,
        )
        session.add(doc_mehta)
        await session.flush()

        # 8. Patients
        # Patient 1: Rahul Verma (Primary demo persona)
        u_rahul = User(
            email="rahul@patient.com",
            phone="9876543210",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Rahul Verma",
            role=UserRole.PATIENT,
            is_active=True,
        )
        session.add(u_rahul)
        await session.flush()

        p_rahul = PatientProfile(
            user_id=u_rahul.id,
            abha_number="91-4821-3902-1849",
            abha_address="rahulverma@abdm",
            dob=date(1992, 5, 14),
            gender=Gender.MALE,
            blood_group="O+",
            emergency_contact_name="Sunil Verma (Brother)",
            emergency_contact_phone="9876543299",
            allergies=["Penicillin (Moderate rash)"],
            chronic_conditions=["Essential Hypertension", "Mild Dyslipidemia"],
        )
        session.add(p_rahul)

        # Patient 2: Neha Gupta (In queue ahead of Rahul)
        u_neha = User(
            email="neha@patient.com",
            phone="9876543211",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Neha Gupta",
            role=UserRole.PATIENT,
            is_active=True,
        )
        session.add(u_neha)
        await session.flush()

        p_neha = PatientProfile(
            user_id=u_neha.id,
            abha_number="91-5521-1209-8472",
            abha_address="nehagupta@abdm",
            dob=date(1996, 8, 22),
            gender=Gender.FEMALE,
            blood_group="B+",
            allergies=[],
            chronic_conditions=[],
        )
        session.add(p_neha)

        # Patient 3: Karan Malhotra (Currently in consultation)
        u_karan = User(
            email="karan@patient.com",
            phone="9876543212",
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Karan Malhotra",
            role=UserRole.PATIENT,
            is_active=True,
        )
        session.add(u_karan)
        await session.flush()

        p_karan = PatientProfile(
            user_id=u_karan.id,
            abha_number="91-1123-4567-8901",
            abha_address="karanm@abdm",
            dob=date(1985, 3, 10),
            gender=Gender.MALE,
            blood_group="A+",
        )
        session.add(p_karan)
        await session.flush()

        # 9. Historical Encounter & Care Journey for Rahul Verma (2 weeks ago)
        # This provides historical records for the AI Pre-Visit Briefing to synthesize
        past_date = date.today() - timedelta(days=14)
        past_appt = Appointment(
            booking_reference="CF-PAST-88120",
            patient_id=p_rahul.id,
            doctor_id=doc_ananya.id,
            hospital_id=h1.id,
            appointment_date=past_date,
            start_time=time(10, 0),
            end_time=time(10, 20),
            appointment_type=AppointmentType.NEW_CONSULT,
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Occasional chest tightness and elevated blood pressure",
        )
        session.add(past_appt)
        await session.flush()

        past_encounter = Encounter(
            appointment_id=past_appt.id,
            patient_id=p_rahul.id,
            doctor_id=doc_ananya.id,
            subjective="Patient reports episodic retrosternal discomfort on exertion for 3 weeks. Stressful work schedule. No prior cardiac events.",
            objective="BP: 148/92 mmHg, Pulse: 82 bpm, SpO2: 98% on room air. S1 S2 heard, no murmurs. Lungs clear.",
            assessment="Stage 1 Essential Hypertension with mild exertional angina symptoms.",
            plan="Initiate lifestyle modification, low-sodium diet, prescribe Telmisartan 40mg. Ordered baseline lipid panel and 12-lead ECG. Follow-up in 2 weeks.",
        )
        session.add(past_encounter)
        await session.flush()

        # Historical Prescription
        rx_created_at = datetime.now(timezone.utc) - timedelta(days=14)
        rx_time_str = rx_created_at.strftime("%Y-%m-%d %H:%M")
        med_string = "Telmisartan:40 mg:1-0-0 (Once daily morning after food):30"
        med_hash = hashlib.sha256(med_string.encode("utf-8")).hexdigest()
        rx_hash = generate_prescription_seal(
            prescription_id="RX-2026-00412",
            doctor_registration=doc_ananya.registration_number,
            patient_id=p_rahul.id,
            timestamp_iso=rx_time_str,
            medications_hash=med_hash,
        )
        past_rx = Prescription(
            encounter_id=past_encounter.id,
            patient_id=p_rahul.id,
            doctor_id=doc_ananya.id,
            prescription_number="RX-2026-00412",
            digital_signature_hash=rx_hash,
            verification_code="CF-VRX-98124A",
            instructions="Take Telmisartan every morning after breakfast. Monitor BP weekly.",
            follow_up_date=date.today(),
            created_at=rx_created_at,
        )
        session.add(past_rx)
        await session.flush()

        session.add(
            PrescriptionItem(
                prescription_id=past_rx.id,
                medicine_name="Telmisartan",
                generic_name="Telmisartan Tablets IP",
                formulation=MedicineFormulation.TABLET,
                dosage="40 mg",
                frequency="1-0-0 (Once daily morning after food)",
                duration_days=30,
                special_instructions="Do not stop abruptly without doctor advice",
            )
        )

        # Historical Lab Order & Verified Report
        past_lab_order = LabOrder(
            encounter_id=past_encounter.id,
            patient_id=p_rahul.id,
            doctor_id=doc_ananya.id,
            test_name="Lipid Profile & Serum Cholesterol Panel",
            test_code="57021-8",
            priority=LabOrderPriority.ROUTINE,
            status=LabOrderStatus.VERIFIED,
            clinical_notes="Fasting specimen required. Screen for dyslipidemia.",
        )
        session.add(past_lab_order)
        await session.flush()

        past_report = LabReport(
            lab_order_id=past_lab_order.id,
            patient_id=p_rahul.id,
            verified_by_user_id=h1_labtech.id,
            report_number="LAB-2026-78921",
            document_url="/vault/reports/LAB-2026-78921.pdf",
            file_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            summary="Total Cholesterol: 218 mg/dL (Borderline High), LDL: 138 mg/dL (Elevated), HDL: 44 mg/dL, Triglycerides: 180 mg/dL.",
            abnormal_flags=True,
            verified_at=datetime.now(timezone.utc) - timedelta(days=12),
        )
        session.add(past_report)

        # Historical Care Journey for Rahul
        journey_cardiac = CareJourney(
            patient_id=p_rahul.id,
            title="Cardiovascular Evaluation & Blood Pressure Optimization",
            status=JourneyStatus.ACTIVE,
            started_at=datetime.now(timezone.utc) - timedelta(days=14),
        )
        session.add(journey_cardiac)
        await session.flush()

        session.add_all([
            CareJourneyEvent(
                care_journey_id=journey_cardiac.id,
                event_type=JourneyEventType.CONSULTATION_HELD,
                title="Initial Cardiology Consultation",
                description="Consultation with Dr. Ananya Sharma. Diagnosed Stage 1 Hypertension.",
                provider_name="City Care Multi-Specialty Hospital",
                status=JourneyEventStatus.COMPLETED,
                event_timestamp=datetime.now(timezone.utc) - timedelta(days=14),
            ),
            CareJourneyEvent(
                care_journey_id=journey_cardiac.id,
                event_type=JourneyEventType.PRESCRIPTION_ISSUED,
                title="Digital Prescription Issued",
                description="Telmisartan 40mg (OD for 30 days).",
                provider_name="Dr. Ananya Sharma",
                reference_id=past_rx.id,
                status=JourneyEventStatus.COMPLETED,
                next_action_label="View Prescription",
                next_action_url=f"/verify/rx/{past_rx.verification_code}",
                event_timestamp=datetime.now(timezone.utc) - timedelta(days=14),
            ),
            CareJourneyEvent(
                care_journey_id=journey_cardiac.id,
                event_type=JourneyEventType.LAB_REPORT_READY,
                title="Lipid Profile Results Verified",
                description="Borderline elevated LDL (138 mg/dL). Ready for clinician review.",
                provider_name="City Care Pathology Laboratory",
                reference_id=past_report.id,
                status=JourneyEventStatus.COMPLETED,
                next_action_label="Review Report",
                event_timestamp=datetime.now(timezone.utc) - timedelta(days=12),
            ),
            CareJourneyEvent(
                care_journey_id=journey_cardiac.id,
                event_type=JourneyEventType.APPOINTMENT_BOOKED,
                title="Follow-Up Consultation Scheduled",
                description="Today's follow-up consultation with Dr. Ananya Sharma.",
                provider_name="City Care Hospital — Room 302",
                status=JourneyEventStatus.PENDING,
                next_action_label="Check-in at Hospital",
                event_timestamp=datetime.now(timezone.utc),
            ),
        ])

        # 10. Today's Live Queue for Dr. Ananya Sharma
        # Patient 1: Karan Malhotra (In Consultation)
        today = date.today()
        appt_karan = Appointment(
            booking_reference="CF-TODAY-001",
            patient_id=p_karan.id,
            doctor_id=doc_ananya.id,
            hospital_id=h1.id,
            appointment_date=today,
            start_time=time(9, 40),
            end_time=time(10, 0),
            appointment_type=AppointmentType.NEW_CONSULT,
            status=AppointmentStatus.IN_CONSULTATION,
            reason_for_visit="Routine wellness checkup",
        )
        session.add(appt_karan)
        await session.flush()

        ticket_karan = QueueTicket(
            appointment_id=appt_karan.id,
            doctor_id=doc_ananya.id,
            hospital_id=h1.id,
            ticket_number="CARD-A12",
            sequence_number=1,
            check_in_time=datetime.now(timezone.utc) - timedelta(minutes=25),
            called_time=datetime.now(timezone.utc) - timedelta(minutes=10),
            service_start_time=datetime.now(timezone.utc) - timedelta(minutes=10),
            state=QueueState.IN_CONSULTATION,
            estimated_wait_minutes=0,
        )
        session.add(ticket_karan)

        # Patient 2: Neha Gupta (Waiting in Queue ahead of Rahul)
        appt_neha = Appointment(
            booking_reference="CF-TODAY-002",
            patient_id=p_neha.id,
            doctor_id=doc_ananya.id,
            hospital_id=h1.id,
            appointment_date=today,
            start_time=time(10, 0),
            end_time=time(10, 20),
            appointment_type=AppointmentType.NEW_CONSULT,
            status=AppointmentStatus.IN_QUEUE,
            reason_for_visit="Palpitations post-caffeine intake",
        )
        session.add(appt_neha)
        await session.flush()

        ticket_neha = QueueTicket(
            appointment_id=appt_neha.id,
            doctor_id=doc_ananya.id,
            hospital_id=h1.id,
            ticket_number="CARD-A13",
            sequence_number=2,
            check_in_time=datetime.now(timezone.utc) - timedelta(minutes=15),
            state=QueueState.WAITING,
            estimated_wait_minutes=12,
        )
        session.add(ticket_neha)

        # Patient 3: Rahul Verma (Confirmed appointment for today — Ready to Check In during Demo)
        appt_rahul_today = Appointment(
            booking_reference="CF-TODAY-003",
            patient_id=p_rahul.id,
            doctor_id=doc_ananya.id,
            hospital_id=h1.id,
            appointment_date=today,
            start_time=time(10, 20),
            end_time=time(10, 40),
            appointment_type=AppointmentType.FOLLOW_UP,
            status=AppointmentStatus.CONFIRMED,
            reason_for_visit="Cardiac 2-week follow-up and Lipid panel review",
        )
        session.add(appt_rahul_today)

        await session.commit()
        logger.info("Successfully seeded demo data!")
        logger.info("Credentials summary (Password for all: %s):", DEMO_PASSWORD)
        logger.info(" - Super Admin: superadmin@careflow.com")
        logger.info(" - Hospital Admin: admin@citycare.com")
        logger.info(" - Doctor: dr.ananya@citycare.com")
        logger.info(" - Receptionist: receptionist@citycare.com")
        logger.info(" - Lab Tech: lab@citycare.com")
        logger.info(" - Patient 1 (Demo Lead): rahul@patient.com or phone: 9876543210")
        logger.info(" - Patient 2: neha@patient.com or phone: 9876543211")
        logger.info(" - Second Opinion Doctor: dr.mehta@apexheart.com")


if __name__ == "__main__":
    asyncio.run(seed_data())
