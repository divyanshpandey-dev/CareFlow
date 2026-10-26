from typing import Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
from backend.app.models.enums import JourneyEventStatus, JourneyEventType, JourneyStatus


class CareJourneyNextAction(BaseModel):
    stage: str
    action: str
    details: str
    suggested_date: Optional[str] = None
    url: Optional[str] = None


class CareJourneyEventResponse(BaseModel):
    id: str
    event_type: JourneyEventType
    stage: Optional[str] = None
    title: str
    description: Optional[str] = None
    provider_name: Optional[str] = None
    reference_id: Optional[str] = None
    status: JourneyEventStatus
    next_action_label: Optional[str] = None
    next_action_url: Optional[str] = None
    event_timestamp: datetime
    timestamp: Optional[str] = None
    metadata_json: Optional[Any] = None

    class Config:
        from_attributes = True


class CareJourneyResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = "Patient"
    title: str
    status: JourneyStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    next_action: Optional[CareJourneyNextAction] = None
    events: List[CareJourneyEventResponse]

    class Config:
        from_attributes = True
