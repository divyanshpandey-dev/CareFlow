import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple


class OTPService:
    def __init__(self):
        # In-memory store: user_id -> dict
        self._store: Dict[str, dict] = {}

    def generate_otp(
        self,
        user_id: str,
        email: str,
        purpose: str = "PASSWORD_CHANGE",
        cooldown_seconds: int = 45,
    ) -> Tuple[str, int]:
        """
        Generates a cryptographically secure 6-digit numeric OTP code.
        Enforces a cooldown between requests to prevent spamming.
        Returns (code, ttl_seconds).
        """
        now = datetime.now(timezone.utc)

        existing = self._store.get(user_id)
        if existing and existing.get("purpose") == purpose:
            elapsed = (now - existing["created_at"]).total_seconds()
            if elapsed < cooldown_seconds:
                remaining = int(cooldown_seconds - elapsed)
                raise ValueError(
                    f"Please wait {remaining} second{'s' if remaining != 1 else ''} before requesting another verification code."
                )

        # Generate 6-digit code e.g. 583192
        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = now + timedelta(minutes=10)

        self._store[user_id] = {
            "code": code,
            "email": email.strip().lower(),
            "purpose": purpose,
            "created_at": now,
            "expires_at": expires_at,
            "attempts": 0,
        }
        return code, 600

    def verify_otp(
        self, user_id: str, code: str, purpose: str = "PASSWORD_CHANGE"
    ) -> Tuple[bool, str]:
        """
        Validates the provided OTP.
        Guards against expiration and brute-force (max 5 attempts).
        Deletes code upon successful verification to prevent replay attacks.
        """
        now = datetime.now(timezone.utc)
        record = self._store.get(user_id)

        if not record or record.get("purpose") != purpose:
            return False, "No active verification code found. Please request a code first."

        if now > record["expires_at"]:
            self._store.pop(user_id, None)
            return False, "Verification code has expired. Please request a new code."

        record["attempts"] += 1
        if record["attempts"] > 5:
            self._store.pop(user_id, None)
            return (
                False,
                "Too many failed verification attempts. This code has been invalidated for security. Please request a new one.",
            )

        if record["code"] != code.strip():
            remaining = 5 - record["attempts"]
            return False, f"Invalid verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."

        # Successfully verified: consume code immediately
        self._store.pop(user_id, None)
        return True, "Verification code confirmed."

    def get_active_otp(self, user_id: str) -> Optional[dict]:
        return self._store.get(user_id)

    def clear_otp(self, user_id: str):
        self._store.pop(user_id, None)


otp_service = OTPService()
