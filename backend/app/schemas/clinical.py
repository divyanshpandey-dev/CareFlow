from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from backend.app.models.enums import LabOrderPriority, LabOrderStatus, MedicineFormulation


class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    generic_name: Optional[str] = None
    formulation: MedicineFormulation = MedicineFormulation.TABLET
    dosage: str = Field(..., description="e.g. 500 mg, 10 mg")
    frequency: str = Field(..., description="e.g. 1-0-1 after food, 1-0-0 morning")
    duration_days: int = Field(..., ge=1, le=365)
    special_instructions: Optional[str] = None


class PrescriptionItemResponse(BaseModel):
    id: str
    medicine_name: str
    generic_name: Optional[str] = None
    formulation: MedicineFormulation
    dosage: str
    frequency: str
    duration_days: int
    special_instructions: Optional[str] = None

    class Config:
        from_attributes = True


class LabOrderCreate(BaseModel):
    test_name: str
    test_code: Optional[str] = None
    clinical_notes: Optional[str] = None
    priority: LabOrderPriority = LabOrderPriority.ROUTINE


class LabOrderResponse(BaseModel):
    id: str
    encounter_id: str
    test_name: str
    test_code: Optional[str] = None
    clinical_notes: Optional[str] = None
    priority: LabOrderPriority
    status: LabOrderStatus
    created_at: datetime

    class Config:
        from_attributes = True


class CompleteEncounterRequest(BaseModel):
    appointment_id: str
    subjective: Optional[str] = Field(None, description="Chief complaints and history")
    objective: Optional[str] = Field(None, description="Vitals and physical examination")
    assessment: str = Field(..., description="Clinical diagnosis")
    plan: Optional[str] = Field(None, description="Clinical plan and dietary advice")
    
    # Prescriptions (optional)
    prescription_items: Optional[List[PrescriptionItemCreate]] = None
    prescription_instructions: Optional[str] = None
    follow_up_date: Optional[date] = None
    
    # Lab orders (optional)
    lab_orders: Optional[List[LabOrderCreate]] = None


class PrescriptionVerificationResponse(BaseModel):
    is_valid: bool
    verification_code: str
    prescription_number: str
    doctor_name: str
    doctor_qualification: str
    doctor_registration: str
    hospital_name: str
    patient_name_masked: str
    issued_at: datetime
    follow_up_date: Optional[date] = None
    instructions: Optional[str] = None
    items: List[PrescriptionItemResponse]
    cryptographic_seal: str
    audit_status: str
