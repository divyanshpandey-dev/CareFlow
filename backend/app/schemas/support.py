from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SupportConfigResponse(BaseModel):
    support_email: str
    support_phone: Optional[str] = None
    is_phone_active: bool
    operating_hours: str
    physical_desk_location: str
    emergency_guidance: str
    senior_citizen_guidance: str

    class Config:
        from_attributes = True


class SupportConfigUpdateRequest(BaseModel):
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    is_phone_active: Optional[bool] = None
    operating_hours: Optional[str] = None
    physical_desk_location: Optional[str] = None
    emergency_guidance: Optional[str] = None
    senior_citizen_guidance: Optional[str] = None


class CreateSupportTicketRequest(BaseModel):
    subject: str = Field(..., min_length=4, max_length=200)
    category: str = Field("GENERAL", description="APPOINTMENT, QUEUE, PRESCRIPTION, LAB, GENERAL")
    description: str = Field(..., min_length=10)
    priority: str = Field("NORMAL", description="LOW, NORMAL, URGENT")


class SupportTicketResponse(BaseModel):
    id: str
    ticket_reference: str
    patient_id: str
    category: str
    subject: str
    description: str
    status: str
    priority: str
    admin_response: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

