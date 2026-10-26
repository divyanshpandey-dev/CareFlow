from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field


class TimelineDigestItem(BaseModel):
    date: str
    event: str
    provider: str
    summary: str
    source_id: str


class PreVisitBriefResponse(BaseModel):
    patient_id: str
    patient_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: List[str]
    chronic_conditions: List[str]
    recent_consultations_count: int
    recent_prescriptions_count: int
    recent_lab_reports_count: int
    clinical_timeline: List[TimelineDigestItem]
    clinical_synthesis_notes: str = Field(
        ...,
        description="Structured briefing of prior clinical observations, notable lab values, and active therapies"
    )
    is_ai_generated: bool = True
    ai_model: str = "Ollama (llama3) / Assistive Clinical Guard"
    safety_disclaimer: str = (
        "AI-Generated Administrative Synthesis for Clinical Context. "
        "Does not constitute medical diagnosis or advice. Clinician review of primary records is mandatory."
    )
