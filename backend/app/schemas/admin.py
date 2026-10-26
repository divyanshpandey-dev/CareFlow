from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.models.enums import UserRole


class CreateHospitalRequest(BaseModel):
    name: str = Field(..., min_length=2)
    city: str
    state: str
    address: str
    departments: List[str] = Field(default=["General Medicine", "Cardiology OPD"])
    is_nabh: bool = True


class CreateDoctorRequest(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    password: str = "password123"
    hospital_id: str
    department_name: str
    specialization: str
    qualification: str
    registration_number: str
    consultation_fee: float = 500.0
    room_number: str = "Room 101"


class UpdateUserRoleRequest(BaseModel):
    role: UserRole


class BroadcastAnnouncementRequest(BaseModel):
    title: str
    message: str
    severity: str = "INFO"


class CreateFeatureRequest(BaseModel):
    name: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    category: str = "Clinical"
    is_enabled: bool = True


class FeatureResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    category: str
    is_enabled: bool
    is_core: bool


class AdminActionItem(BaseModel):
    id: str
    severity: str  # HIGH, MEDIUM, LOW
    title: str
    description: str
    reason: str
    entity_type: str  # doctor, hospital, security, lab, feature
    entity_id: str
    cta_label: str
    cta_url: str
    timestamp: str


class SecuritySignalItem(BaseModel):
    id: str
    level: str  # CRITICAL, WARNING, INFO
    title: str
    description: str
    source_ip: Optional[str] = None
    timestamp: str


class AdminSessionResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    device_info: Optional[str]
    last_activity: str
    is_current: bool = False
    is_revoked: bool = False


class SecurityCenterSummary(BaseModel):
    successful_logins_24h: int
    failed_logins_24h: int
    suspended_accounts_count: int
    privileged_role_changes_count: int
    active_admin_sessions_count: int
    security_signals: List[SecuritySignalItem]
    active_sessions: List[AdminSessionResponse]


class SystemComponentHealth(BaseModel):
    status: str  # Healthy, Degraded, Unavailable
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class SystemHealthResponse(BaseModel):
    system_status: str  # Operational, Degraded, Critical
    timestamp: str
    backend: SystemComponentHealth
    database: SystemComponentHealth
    realtime_websocket: SystemComponentHealth
    ai_service: SystemComponentHealth
    authentication: SystemComponentHealth


class AIGovernanceResponse(BaseModel):
    model_name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_latency_ms: float
    human_reviews_required: int
    ai_generated_notes_count: int
    policy_statement: str


class ConsentSummaryResponse(BaseModel):
    total_consent_requests: int
    active_consents: int
    revoked_consents: int
    sensitive_access_events_24h: int


class ConfirmActionRequest(BaseModel):
    action: str  # SUSPEND, REACTIVATE, DELETE, ELEVATE
    confirm_phrase: Optional[str] = None
    reason: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    actor_name: Optional[str]
    actor_id: Optional[str]
    action: str
    resource_type: str
    resource_id: str
    status: str
    details: Optional[dict] = None
    timestamp: str


class RequestPasswordOtpResponse(BaseModel):
    status: str
    message: str
    email: str
    expires_in_seconds: int
    smtp_configured: bool
    dev_code: Optional[str] = None


class ChangeAdminPasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit email verification code")


class UpdateAdminProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class CreateHospitalAdminRequest(BaseModel):
    hospital_id: str
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    phone: str = Field(..., min_length=8)
    password: str = Field(default="password123", min_length=8)
    department_id: Optional[str] = None
    notes: Optional[str] = None


class HospitalAdminSummaryResponse(BaseModel):
    id: str
    admin_display_id: str
    user_id: str
    full_name: str
    email: str
    phone: str
    hospital_id: str
    hospital_name: str
    hospital_city: str
    hospital_state: str
    department_name: Optional[str] = None
    role: str = "HOSPITAL_ADMIN"
    status: str  # ACTIVE, SUSPENDED, REVOKED
    assigned_by_name: Optional[str] = None
    assigned_at: str
    created_at: str


class UpdateHospitalAdminStatusRequest(BaseModel):
    status: str  # ACTIVE, SUSPENDED, REVOKED
    reason: str = Field(..., min_length=4)
    confirm_phrase: Optional[str] = None


