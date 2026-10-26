import pytest
import time
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_doctor_lookup_and_permanent_delete():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Super Admin login
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "edure6377@gmail.com", "password": "CareFlowAdmin#2026"},
        )
        assert admin_login.status_code == 200
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get existing hospital
        hosp_res = await ac.get("/api/v1/admin/hospitals", headers=headers)
        assert hosp_res.status_code == 200
        hosp_list = hosp_res.json()
        assert len(hosp_list) > 0
        target_hospital_id = hosp_list[0]["id"]

        # 1. Onboard a doctor
        ts = time.time_ns()
        doc_email = f"dr.test_{ts}@careflow.test"
        doc_phone = f"+9198{str(ts)[-8:]}"
        create_res = await ac.post(
            "/api/v1/admin/doctors",
            headers=headers,
            json={
                "full_name": "Dr. Test Permanent Delete",
                "phone": doc_phone,
                "email": doc_email,
                "password": "Password123!",
                "hospital_id": target_hospital_id,
                "department_name": "Cardiology",
                "specialization": "Cardiology",
                "qualification": "MBBS, MD",
                "registration_number": f"REG-{ts}",
                "consultation_fee": 650.0,
                "room_number": "Room 101",
            },
        )
        assert create_res.status_code == 201
        doc_data = create_res.json()
        doc_id = doc_data["doctor_id"]

        # 2. Test suspension using doctor_id (should not 404!)
        suspend_res = await ac.put(f"/api/v1/admin/doctors/{doc_id}/suspend", headers=headers, json={})
        assert suspend_res.status_code == 200
        assert suspend_res.json()["is_active"] is False

        # 3. Test reactivation
        reactivate_res = await ac.put(f"/api/v1/admin/doctors/{doc_id}/reactivate", headers=headers, json={})
        assert reactivate_res.status_code == 200
        assert reactivate_res.json()["is_active"] is True

        # 4. Test permanent delete (cut option)
        delete_res = await ac.delete(f"/api/v1/admin/doctors/{doc_id}", headers=headers)
        assert delete_res.status_code == 200
        assert delete_res.json()["status"] == "DOCTOR_PERMANENTLY_DELETED"

        # 5. Verify doctor no longer exists
        verify_del = await ac.put(f"/api/v1/admin/doctors/{doc_id}/suspend", headers=headers, json={})
        assert verify_del.status_code == 404


@pytest.mark.asyncio
async def test_hospital_permanent_delete():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"identifier": "edure6377@gmail.com", "password": "CareFlowAdmin#2026"},
        )
        assert admin_login.status_code == 200
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Onboard a test hospital
        ts = time.time_ns()
        create_hosp = await ac.post(
            "/api/v1/admin/hospitals",
            headers=headers,
            json={
                "name": f"Test Permanent Delete Hospital {ts}",
                "city": "Bengaluru",
                "state": "Karnataka",
                "address": "123 Test Blvd",
                "departments": ["General Medicine", "Cardiology"],
                "is_nabh": True,
            },
        )
        assert create_hosp.status_code == 201
        hosp_id = create_hosp.json()["hospital_id"]

        # 2. Suspend test hospital
        suspend_res = await ac.put(f"/api/v1/admin/hospitals/{hosp_id}/suspend", headers=headers, json={})
        assert suspend_res.status_code == 200
        assert suspend_res.json()["is_active"] is False

        # 3. Permanent delete (cut option)
        del_res = await ac.delete(f"/api/v1/admin/hospitals/{hosp_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "HOSPITAL_PERMANENTLY_DELETED"

        # 4. Verify 404
        check_res = await ac.put(f"/api/v1/admin/hospitals/{hosp_id}/reactivate", headers=headers, json={})
        assert check_res.status_code == 404

