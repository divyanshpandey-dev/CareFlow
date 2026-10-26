from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.models.enums import LabOrderPriority, LabOrderStatus


class LabOrderSummary(BaseModel):
    id: str
    encounter_id: str
    patient_id: str
    patient_name: str
    patient_phone: str
    doctor_name: str
    hospital_name: str
    test_name: str
    test_code: Optional[str] = None
    priority: LabOrderPriority
    status: LabOrderStatus
    clinical_notes: Optional[str] = None
    created_at: datetime
    report: Optional[dict] = None

    class Config:
        from_attributes = True


class UpdateLabStatusRequest(BaseModel):
    status: LabOrderStatus


class VerifyLabReportRequest(BaseModel):
    summary: str = Field(..., description="Pathologist diagnostic summary")
    abnormal_flags: bool = False
    document_url: Optional[str] = None  # Or vault reference
