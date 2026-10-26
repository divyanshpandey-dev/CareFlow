from typing import Optional
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now


class AIDecisionTrace(Base, TimestampMixin):
    """
    AI Governance & Safety Audit Trail:
    Tracks lifecycle of AI-generated clinical suggestions:
    DRAFT -> REVIEWED -> CONFIRMED / MODIFIED.
    Maintains transparency, latency, clinician edits, and safety disclaimers.
    """
    __tablename__ = "ai_decision_traces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )

    model_name: Mapped[str] = mapped_column(String(100), default="ollama-llama3", nullable=False)
    trace_type: Mapped[str] = mapped_column(String(50), default="CLINICAL_SCRIBE_SOAP", nullable=False)
    
    # AI raw proposal vs Final clinician-approved output
    raw_output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    clinician_output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Lifecycle state: DRAFT | REVIEWED | CONFIRMED | REJECTED
    review_status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False, index=True)
    modified_by_clinician: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disclaimer: Mapped[str] = mapped_column(
        String(255), default="AI-ASSISTED DRAFT — Clinician Review Required", nullable=False
    )

    latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
