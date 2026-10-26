from datetime import date
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_careflow_system_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "NRCeS FHIR R4" in data["abdm_profile"]


@pytest.mark.asyncio
async def test_patient_and_doctor_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Patient login
        patient_res = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "rahul@patient.com", "password": "password123"},
        )
        assert patient_res.status_code == 200
        patient_data = patient_res.json()
        assert "access_token" in patient_data
        assert patient_data["user"]["role"] == "PATIENT"

        # Doctor login
        doctor_res = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "dr.ananya@citycare.com", "password": "password123"},
        )
        assert doctor_res.status_code == 200
        doctor_data = doctor_res.json()
        assert "access_token" in doctor_data
        assert doctor_data["user"]["role"] == "DOCTOR"


@pytest.mark.asyncio
async def test_doctor_discovery_and_slots():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/discovery/doctors")
        assert res.status_code == 200
        doctors = res.json()
        assert len(doctors) > 0

        first_doc = doctors[0]
        assert "specialization" in first_doc

        # Query available slots for today
        today_str = date.today().isoformat()
        slot_res = await ac.get(f"/api/v1/discovery/doctors/{first_doc['id']}/slots?date={today_str}")
        assert slot_res.status_code == 200
        slot_data = slot_res.json()
        assert "slots" in slot_data


@pytest.mark.asyncio
async def test_assistive_ai_pre_visit_brief():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Log in as doctor
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "dr.ananya@citycare.com", "password": "password123"},
        )
        token = doc_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Fetch patient profile
        patient_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "rahul@patient.com", "password": "password123"},
        )
        p_token = patient_login.json()["access_token"]
        me_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {p_token}"})
        patient_id = me_res.json()["patient_profile"]["id"]

        # Call AI Pre-Visit Briefing
        ai_res = await ac.get(f"/api/v1/ai/pre-visit-brief/{patient_id}", headers=headers)
        assert ai_res.status_code == 200
        ai_data = ai_res.json()
        assert ai_data["is_ai_generated"] is True
        assert "safety_disclaimer" in ai_data
        assert len(ai_data["clinical_synthesis_notes"]) > 0

        # Verify Local Ollama AI Status endpoint
        status_res = await ac.get("/api/v1/ai/status", headers=headers)
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert "configured_model" in status_data
        assert "ollama_base_url" in status_data


@pytest.mark.asyncio
async def test_public_cryptographic_prescription_verification():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Fetch existing prescriptions from seeded demo
        patient_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "rahul@patient.com", "password": "password123"},
        )
        p_token = patient_login.json()["access_token"]
        my_rx = await ac.get("/api/v1/clinical/prescriptions/my", headers={"Authorization": f"Bearer {p_token}"})
        assert my_rx.status_code == 200
        rx_list = my_rx.json()

        if len(rx_list) > 0:
            first_rx = rx_list[0]
            verify_res = await ac.get(f"/api/v1/clinical/prescriptions/verify/{first_rx['verification_code']}")
            assert verify_res.status_code == 200
            verify_data = verify_res.json()
            assert verify_data["is_valid"] is True
            assert "cryptographic_seal" in verify_data
            assert verify_data["doctor_registration"] is not None


@pytest.mark.asyncio
async def test_hospital_analytics_and_queue_simulation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Log in as Hospital Admin
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@citycare.com", "password": "password123"},
        )
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check analytics
        analytics_res = await ac.get("/api/v1/admin/analytics", headers=headers)
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()
        assert "total_appointments_today" in analytics_data
        assert "queue_dwell_status" in analytics_data
