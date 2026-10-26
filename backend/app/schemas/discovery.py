from typing import List, Optional
from datetime import date
from pydantic import BaseModel


class HospitalSummary(BaseModel):
    id: str
    hfr_id: Optional[str] = None
    name: str
    slug: str
    city: str
    state: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool

    class Config:
        from_attributes = True


class DepartmentSummary(BaseModel):
    id: str
    hospital_id: str
    name: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class DoctorSummary(BaseModel):
    id: str
    user_id: str
    full_name: str
    hospital_id: str
    hospital_name: str
    department_id: str
    department_name: str
    hpr_id: Optional[str] = None
    registration_number: str
    qualification: str
    specialization: str
    experience_years: int
    consultation_fee: float
    room_number: Optional[str] = None
    languages: List[str]
    is_verified: bool

    class Config:
        from_attributes = True


class SlotItem(BaseModel):
    start_time: str
    end_time: str
    is_available: bool


class AvailableSlotsResponse(BaseModel):
    doctor_id: str
    date: date
    slot_duration_minutes: int
    slots: List[SlotItem]
