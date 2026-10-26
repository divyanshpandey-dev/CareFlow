import io
import time
import pytest
from datetime import date
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_patient_registration_and_profile_setup():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ts = time.time_ns()
        email = f"testpatient_{ts}@example.com"
        phone = f"+9198{str(ts)[-8:]}"
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "phone": phone,
                "password": "SecurePass@123",
                "full_name": "Vikram Sethi",
            },
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        user_info = reg_data["user"]
        assert "patient_identifier" in user_info
        assert user_info["patient_identifier"].startswith("CF-PAT-")
        assert user_info["profile_completed"] is False

        # Login with newly registered patient
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": email, "password": "SecurePass@123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Setup Profile (Part 3)
        setup_res = await ac.post(
            "/api/v1/auth/profile/setup",
            headers=headers,
            json={
                "date_of_birth": "1994-06-15",
                "gender": "MALE",
                "blood_group": "B+",
                "address": "42 Park Street, Kolkata, West Bengal",
                "emergency_contact_name": "Rina Sethi",
                "emergency_contact_phone": "+919876543298",
                "emergency_contact_relation": "SPOUSE",
                "preferred_language": "en",
                "id_document_type": "AADHAAR",
                "id_document_number": "123456789012",
            },
        )
        assert setup_res.status_code == 200
        setup_data = setup_res.json()
        assert setup_data["profile_completed"] is True
        assert setup_data["age"] >= 30  # Auto-calculated from 1994
        assert setup_data["id_document_type"] == "AADHAAR"
        assert setup_data["id_document_masked"] == "XXXX-XXXX-9012"  # Safely masked
        assert "123456789012" not in str(setup_data)  # Never stores plain Aadhaar


@pytest.mark.asyncio
async def test_hospital_admin_doctor_workflow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Hospital Admin login
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@citycare.com", "password": "password123"},
        )
        assert admin_login.status_code == 200
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Onboard doctor at Hospital Admin level
        ts = time.time_ns()
        doc_email = f"dr.kavita_{ts}@citycare.com"
        doc_phone = f"+9197{str(ts)[-8:]}"
        license_number = f"MCI-NEURO-{str(ts)[-6:]}"
        create_doc_res = await ac.post(
            "/api/v1/hospital-admin/doctors",
            headers=headers,
            json={
                "full_name": "Dr. Kavita Verma",
                "email": doc_email,
                "phone": doc_phone,
                "password": "DoctorPass@123",
                "specialization": "Neurology",
                "qualification": "MBBS, DM Neurology",
                "license_number": license_number,
                "room_number": "OPD-302",
                "consultation_fee": 800.0,
                "experience_years": 8,
                "listing_status": "APPROVED",
            },
        )
        assert create_doc_res.status_code == 201
        doc_data = create_doc_res.json()
        doc_id = doc_data["id"]
        assert doc_data["specialization"] == "Neurology"
        assert doc_data["listing_status"] == "APPROVED"

        # List hospital doctors
        doc_list_res = await ac.get("/api/v1/hospital-admin/doctors", headers=headers)
        assert doc_list_res.status_code == 200
        docs = doc_list_res.json()
        assert any(d["id"] == doc_id for d in docs)

        # Update Doctor Listing Status
        status_update_res = await ac.put(
            f"/api/v1/hospital-admin/doctors/{doc_id}/status",
            headers=headers,
            json={"listing_status": "PENDING_REVIEW"},
        )
        assert status_update_res.status_code == 200
        assert status_update_res.json()["listing_status"] == "PENDING_REVIEW"


@pytest.mark.asyncio
async def test_hospital_admin_patient_registry_and_walkin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@citycare.com", "password": "password123"},
        )
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Register Walk-In Patient
        ts = time.time_ns()
        walkin_phone = f"+9191{str(ts)[-8:]}"
        walkin_res = await ac.post(
            "/api/v1/hospital-admin/patients/register-walkin",
            headers=headers,
            json={
                "full_name": "Ramesh Chandra Gupta",
                "phone": walkin_phone,
                "date_of_birth": "1968-03-22",
                "gender": "MALE",
                "blood_group": "O+",
                "address": "Sector 14, Rohini, New Delhi",
            },
        )
        assert walkin_res.status_code == 201
        walkin_data = walkin_res.json()
        patient_id = walkin_data["patient_id"]
        assert walkin_data["patient_identifier"].startswith("CF-PAT-")
        assert walkin_data["age"] >= 55

        # Query patient registry by identifier
        search_res = await ac.get(
            f"/api/v1/hospital-admin/patients?q={walkin_data['patient_identifier']}",
            headers=headers,
        )
        assert search_res.status_code == 200
        patients = search_res.json()
        assert len(patients) >= 1
        assert patients[0]["patient_identifier"] == walkin_data["patient_identifier"]

        # View comprehensive patient detail & care journey
        detail_res = await ac.get(
            f"/api/v1/hospital-admin/patients/{patient_id}",
            headers=headers,
        )
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["profile"]["patient_identifier"] == walkin_data["patient_identifier"]
        assert "appointments" in detail_data
        assert "prescriptions" in detail_data
        assert "timeline" in detail_data


@pytest.mark.asyncio
async def test_document_upload_and_verification():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login as patient
        patient_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "rahul@patient.com", "password": "password123"},
        )
        token = patient_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Upload External Medical Document (e.g., past prescription PDF)
        fake_pdf_content = b"%PDF-1.4 Mock Previous Hospital Prescription Record"
        files = {
            "file": ("past_rx_apollo.pdf", io.BytesIO(fake_pdf_content), "application/pdf")
        }
        data = {
            "document_type": "PRESCRIPTION",
            "title": "Previous Cardiology Prescription (Apollo)",
            "notes": "Prescribed in 2025 during annual health checkup.",
        }

        upload_res = await ac.post(
            "/api/v1/clinical/documents/upload",
            headers=headers,
            files=files,
            data=data,
        )
        assert upload_res.status_code == 201
        doc_info = upload_res.json()
        assert doc_info["status"] == "UPLOADED"
        assert doc_info["is_external"] is True
        assert doc_info["verification_status"] == "PENDING"
        assert "file_sha256" in doc_info

        # Retrieve patient documents
        my_docs_res = await ac.get("/api/v1/clinical/documents/my", headers=headers)
        assert my_docs_res.status_code == 200
        my_docs = my_docs_res.json()
        assert any(d["id"] == doc_info["id"] for d in my_docs)

        # Download document
        download_res = await ac.get(
            f"/api/v1/clinical/documents/{doc_info['id']}/download",
            headers=headers,
        )
        assert download_res.status_code == 200
        assert download_res.content == fake_pdf_content
