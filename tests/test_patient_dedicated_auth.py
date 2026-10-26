import pytest
import random
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_patient_multistep_registration_and_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Generate unique patient data
        rand_num = random.randint(10000000, 99999999)
        test_phone = f"98{rand_num}"
        test_email = f"patient_{rand_num}@careflow.test"
        test_password = "Patient#Secure2026"

        # 2. Test OTP Generation for contact verification
        otp_res = await client.post(
            "/api/v1/auth/send-otp",
            json={"identifier": test_phone, "purpose": "REGISTRATION"},
        )
        assert otp_res.status_code == 200
        otp_data = otp_res.json()
        assert otp_data["status"] == "OTP_SENT"
        assert "demo_otp" in otp_data
        demo_code = otp_data["demo_otp"]

        # 3. Test OTP Verification
        verify_res = await client.post(
            "/api/v1/auth/verify-otp",
            json={
                "identifier": test_phone,
                "code": demo_code,
                "purpose": "REGISTRATION",
            },
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["status"] == "VERIFIED"

        # 4. Multi-step Patient Registration
        reg_payload = {
            "full_name": "Siddharth Narayan Rao",
            "phone": test_phone,
            "email": test_email,
            "password": test_password,
            "dob": "1994-05-20",
            "gender": "MALE",
            "blood_group": "B+",
            "address": "402, Green Meadows, Jayanagar 4th Block",
            "state": "Karnataka",
            "pincode": "560041",
            "emergency_contact_name": "Meera Rao (Spouse)",
            "emergency_contact_phone": "9811223344",
            "preferred_language": "kn",
            "id_document_type": "AADHAAR",
            "id_document_number": "987654321098",
            "terms_accepted": True,
            "dpdp_consent": True,
        }

        reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["role"] == "PATIENT"
        assert reg_data["user"]["full_name"] == "Siddharth Narayan Rao"
        assert reg_data["user"]["patient_identifier"].startswith("CF-PAT-")
        patient_token = reg_data["access_token"]

        # 5. Safe duplicate handling
        dup_res = await client.post("/api/v1/auth/register", json=reg_payload)
        assert dup_res.status_code == 400
        assert "already registered" in dup_res.json()["detail"].lower()

        # 6. Verify profile fields via /auth/me
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["role"] == "PATIENT"
        patient_profile = me_data["patient_profile"]
        assert patient_profile["dob"] == "1994-05-20"
        assert patient_profile["age"] is not None
        assert patient_profile["age"] >= 30
        assert patient_profile["id_document_masked"] == "XXXX-XXXX-1098"
        assert patient_profile["id_verified"] is True
        assert "Karnataka" in patient_profile["address"]
        assert patient_profile["preferred_language"] == "kn"

        # 7. Dedicated Patient Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": test_email, "password": test_password},
        )
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["user"]["role"] == "PATIENT"

        # 8. Password Reset Flow
        reset_otp_res = await client.post(
            "/api/v1/auth/send-otp",
            json={"identifier": test_email, "purpose": "PASSWORD_CHANGE"},
        )
        assert reset_otp_res.status_code == 200
        reset_code = reset_otp_res.json()["demo_otp"]

        new_password = "Patient#NewPass2027"
        reset_res = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "identifier": test_email,
                "code": reset_code,
                "new_password": new_password,
            },
        )
        assert reset_res.status_code == 200
        assert reset_res.json()["status"] == "SUCCESS"

        # Login with new password
        new_login_res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": test_email, "password": new_password},
        )
        assert new_login_res.status_code == 200

        # 9. Role Boundary Protection (Zero-Trust)
        admin_res = await client.get(
            "/api/v1/admin/security-summary",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert admin_res.status_code == 403

        hosp_admin_res = await client.get(
            "/api/v1/hospital-admin/scope",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert hosp_admin_res.status_code == 403

