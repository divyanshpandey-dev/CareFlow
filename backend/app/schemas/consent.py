from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.models.enums import ConsentPurpose, ConsentStatus


class CreateConsentRequest(BaseModel):
    patient_id: str
    purpose: ConsentPurpose = ConsentPurpose.SECOND_OPINION
    scopes: List[str] = Field(
        default=["PRESCRIPTIONS", "LAB_REPORTS"],
        description="Allowed medical record categories"
    )
    duration_hours: int = Field(default=24, ge=1, le=72)


class RespondConsentRequest(BaseModel):
    decision: str = Field(..., description="'GRANT' or 'DENY'")


class ConsentResponse(BaseModel):
    id: str
    consent_artefact_id: str
    patient_id: str
    requester_user_id: str
    requester_name: str
    requester_hospital: Optional[str] = None
    purpose: ConsentPurpose
    scopes: List[str]
    status: ConsentStatus
    valid_from: datetime
    valid_to: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ConsentAccessLogResponse(BaseModel):
    id: str
    consent_id: str
    accessed_by_name: str
    resource_accessed: str
    ip_address: Optional[str] = None
    accessed_at: datetime

    class Config:
        from_attributes = True
