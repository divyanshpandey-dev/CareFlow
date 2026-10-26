from typing import Any, Optional
from datetime import date, datetime, time
from pydantic import BaseModel, Field, model_validator
from backend.app.models.enums import AppointmentStatus, AppointmentType, QueueState


class BookAppointmentRequest(BaseModel):
    doctor_id: str
    appointment_date: Optional[date] = None
    start_time: Optional[str] = Field(None, description="Format: HH:MM or HH:MM:SS, e.g. 10:20")
    scheduled_start: Optional[str] = None
    appointment_type: AppointmentType = AppointmentType.NEW_CONSULT
    reason_for_visit: Optional[str] = None
    chief_complaint: Optional[str] = None
    hospital_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            sched = data.get("scheduled_start")
            if sched and "T" in str(sched):
                parts = str(sched).split("T")
                if not data.get("appointment_date"):
                    data["appointment_date"] = parts[0]
                if not data.get("start_time"):
                    data["start_time"] = parts[1][:5]

            if not data.get("reason_for_visit") and data.get("chief_complaint"):
                data["reason_for_visit"] = data["chief_complaint"]

            appt_type = data.get("appointment_type")
            if appt_type in ["IN_PERSON", "ONLINE", "CONSULTATION", None]:
                data["appointment_type"] = AppointmentType.NEW_CONSULT
        return data


class QueueTicketSummary(BaseModel):
    id: str
    ticket_number: str
    sequence_number: int
    check_in_time: datetime
    called_time: Optional[datetime] = None
    state: QueueState
    estimated_wait_minutes: int
    patients_ahead: Optional[int] = 0

    class Config:
        from_attributes = True


class AppointmentResponse(BaseModel):
    id: str
    booking_reference: str
    patient_id: str
    doctor_id: str
    doctor_name: str
    doctor_specialization: str
    hospital_id: str
    hospital_name: str
    hospital_address: str
    room_number: Optional[str] = None
    appointment_date: date
    start_time: time
    end_time: time
    scheduled_start: Optional[str] = None
    appointment_type: AppointmentType
    status: AppointmentStatus
    reason_for_visit: Optional[str] = None
    created_at: datetime
    queue_ticket: Optional[QueueTicketSummary] = None

    class Config:
        from_attributes = True


class CheckInRequest(BaseModel):
    appointment_id: str
    qr_token: Optional[str] = None
