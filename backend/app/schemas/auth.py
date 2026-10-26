from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field
from backend.app.models.enums import Gender, UserRole


class UserBase(BaseModel):
    phone: str = Field(..., description="10-digit mobile number")
    email: Optional[str] = None
    full_name: str
    role: UserRole = UserRole.PATIENT


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class PatientRegisterRequest(BaseModel):
    phone: str
    password: str = Field(..., min_length=6)
    full_name: str
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    address: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_patient_id: Optional[str] = None
    preferred_language: Optional[str] = "en"
    id_document_type: Optional[str] = None
    id_document_number: Optional[str] = None
    terms_accepted: Optional[bool] = True
    dpdp_consent: Optional[bool] = True


class ResetPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email address")
    code: str = Field(..., min_length=4, max_length=8)
    new_password: str = Field(..., min_length=6)


class DoctorRegisterRequest(BaseModel):
    phone: str
    password: str = Field(..., min_length=6)
    full_name: str
    email: Optional[str] = None
    registration_number: str = Field(..., description="State Medical Council or NMC Registration Number")
    specialization: str = Field("General Medicine", description="Primary clinical specialty")
    qualification: str = Field("MBBS", description="Degrees e.g. MBBS, MD, MS")
    experience_years: int = Field(2, ge=0)
    consultation_fee: float = Field(500.0, ge=0.0)
    hospital_id: Optional[str] = None
    department_name: Optional[str] = None
    room_number: Optional[str] = None


class HospitalAdminRegisterRequest(BaseModel):
    phone: str
    password: str = Field(..., min_length=6)
    full_name: str
    email: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    city: Optional[str] = "Bengaluru"
    state: Optional[str] = "Karnataka"
    address: Optional[str] = "Medical City Hub"


class StaffRegisterRequest(BaseModel):
    phone: str
    password: str = Field(..., min_length=6)
    full_name: str
    email: Optional[str] = None
    role: UserRole = Field(UserRole.LAB_TECH, description="LAB_TECH or RECEPTIONIST")
    hospital_id: Optional[str] = None
    department_name: Optional[str] = None


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or phone number")
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserSummary(BaseModel):
    id: str
    phone: str
    email: Optional[str] = None
    full_name: str
    role: UserRole
    hospital_id: Optional[str] = None
    is_active: bool
    patient_identifier: Optional[str] = None
    profile_completed: Optional[bool] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserSummary


class SendOtpRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email address")
    purpose: str = Field("REGISTRATION", description="REGISTRATION, LOGIN, or PASSWORD_CHANGE")


class VerifyOtpRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number or email address")
    code: str = Field(..., min_length=4, max_length=8)
    purpose: str = Field("REGISTRATION", description="REGISTRATION, LOGIN, or PASSWORD_CHANGE")


class PatientProfileSetupRequest(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = Field(None, description="Date of birth YYYY-MM-DD")
    date_of_birth: Optional[date] = Field(None, description="Alias for dob")
    gender: Optional[Gender] = Gender.OTHER
    preferred_language: str = Field("en", description="e.g. en, hi, mr")
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    id_document_type: Optional[str] = None
    id_document_number: Optional[str] = None


class PatientProfileResponse(BaseModel):
    id: str
    patient_identifier: str
    user_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    dob: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    preferred_language: str
    profile_completed: bool
    id_document_type: Optional[str] = None
    id_document_masked: Optional[str] = None
    id_verified: bool
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []

    class Config:
        from_attributes = True

