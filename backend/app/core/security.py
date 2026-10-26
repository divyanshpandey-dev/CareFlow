import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
from pwdlib import PasswordHash
from backend.app.core.config import settings

# Initialize Argon2 password hasher
password_hash = PasswordHash.recommended()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored Argon2 hash."""
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generates an Argon2id hash for the given password."""
    return password_hash.hash(password)


def create_access_token(
    subject: Union[str, Any],
    role: str,
    hospital_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a short-lived signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    if hospital_id:
        payload["hospital_id"] = str(hospital_id)
        
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Union[str, Any]) -> str:
    """Generates a long-lived signed JWT refresh token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": True},
        )
        return payload
    except jwt.PyJWTError:
        return None


def generate_prescription_seal(
    prescription_id: str,
    doctor_registration: str,
    patient_id: str,
    timestamp_iso: str,
    medications_hash: str,
) -> str:
    """
    Computes a cryptographic HMAC-SHA256 seal for a digital prescription.
    Guarantees non-repudiation and tamper detection.
    """
    raw_payload = f"{prescription_id}|{doctor_registration}|{patient_id}|{timestamp_iso}|{medications_hash}"
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return signature


def verify_prescription_seal(
    prescription_id: str,
    doctor_registration: str,
    patient_id: str,
    timestamp_iso: str,
    medications_hash: str,
    expected_seal: str,
) -> bool:
    """Verifies whether a prescription's cryptographic seal is authentic."""
    actual_seal = generate_prescription_seal(
        prescription_id, doctor_registration, patient_id, timestamp_iso, medications_hash
    )
    return hmac.compare_digest(actual_seal, expected_seal)
