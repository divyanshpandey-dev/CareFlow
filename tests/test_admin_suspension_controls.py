import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.security import create_access_token


@pytest.mark.asyncio
async def test_super_admin_suspension_controls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Super Admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={
                "identifier": "edure6377@gmail.com",
                "password": "CareFlowAdmin#2026",
            },
        )
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]
        auth_header = {"Authorization": f"Bearer {admin_token}"}

        # 2. Test Hospital Suspension & Reactivation
        hosp_list_res = await client.get("/api/v1/admin/hospitals", headers=auth_header)
        assert hosp_list_res.status_code == 200
        hospitals = hosp_list_res.json()
        assert len(hospitals) > 0
        target_hosp = hospitals[0]
        hosp_id = target_hosp["id"]

        # Suspend hospital
        suspend_hosp_res = await client.put(
            f"/api/v1/admin/hospitals/{hosp_id}/suspend",
            headers=auth_header,
        )
        assert suspend_hosp_res.status_code == 200
        assert suspend_hosp_res.json()["is_active"] is False
        assert suspend_hosp_res.json()["status"] == "HOSPITAL_SUSPENDED"

        # Reactivate hospital
        reactivate_hosp_res = await client.put(
            f"/api/v1/admin/hospitals/{hosp_id}/reactivate",
            headers=auth_header,
        )
        assert reactivate_hosp_res.status_code == 200
        assert reactivate_hosp_res.json()["is_active"] is True
        assert reactivate_hosp_res.json()["status"] == "HOSPITAL_REACTIVATED"

        # 3. Test Patient / User Suspension & Reactivation
        # Create a dedicated test patient with dynamic random phone & email
        import random
        rand_suffix = random.randint(10000000, 99999999)
        test_patient_phone = f"98{rand_suffix}"
        test_patient_email = f"suspension_{rand_suffix}@careflow.test"

        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Suspension Patient",
                "phone": test_patient_phone,
                "email": test_patient_email,
                "password": "PatientPassword123!",
                "dob": "1990-01-01",
            },
        )
        assert reg_res.status_code == 201
        patient_id = reg_res.json()["user"]["id"]

        # Suspend patient
        suspend_user_res = await client.put(
            f"/api/v1/admin/users/{patient_id}/suspend",
            headers=auth_header,
        )
        assert suspend_user_res.status_code == 200
        assert suspend_user_res.json()["is_active"] is False
        assert suspend_user_res.json()["status"] == "USER_SUSPENDED"

        # Verify suspended user cannot log in (returns 403 Forbidden because account is deactivated)
        login_fail = await client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_patient_email,
                "password": "PatientPassword123!",
            },
        )
        assert login_fail.status_code == 403
        assert "deactivated" in login_fail.json()["detail"].lower()

        # Reactivate patient
        reactivate_user_res = await client.put(
            f"/api/v1/admin/users/{patient_id}/reactivate",
            headers=auth_header,
        )
        assert reactivate_user_res.status_code == 200
        assert reactivate_user_res.json()["is_active"] is True
        assert reactivate_user_res.json()["status"] == "USER_REACTIVATED"

        # Verify reactivated patient can log in now
        login_success = await client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_patient_email,
                "password": "PatientPassword123!",
            },
        )
        assert login_success.status_code == 200

        # 4. Test Doctor Suspension & Reactivation
        doctors_res = await client.get("/api/v1/admin/doctors", headers=auth_header)
        assert doctors_res.status_code == 200
        doctors = doctors_res.json()
        assert len(doctors) > 0
        target_doc = doctors[0]
        doc_id = target_doc["id"]

        # Suspend doctor
        suspend_doc_res = await client.put(
            f"/api/v1/admin/doctors/{doc_id}/suspend",
            headers=auth_header,
        )
        assert suspend_doc_res.status_code == 200
        assert suspend_doc_res.json()["status"] == "DOCTOR_SUSPENDED"
        assert suspend_doc_res.json()["is_verified"] is False

        # Reactivate doctor
        reactivate_doc_res = await client.put(
            f"/api/v1/admin/doctors/{doc_id}/reactivate",
            headers=auth_header,
        )
        assert reactivate_doc_res.status_code == 200
        assert reactivate_doc_res.json()["status"] == "DOCTOR_REACTIVATED"
        assert reactivate_doc_res.json()["is_verified"] is True

