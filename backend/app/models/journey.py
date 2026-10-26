from typing import List, Optional
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now
from backend.app.models.enums import JourneyEventStatus, JourneyEventType, JourneyStatus


class CareJourney(Base, TimestampMixin):
    __tablename__ = "care_journeys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[JourneyStatus] = mapped_column(Enum(JourneyStatus), default=JourneyStatus.ACTIVE, nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="care_journeys")
    events: Mapped[List["CareJourneyEvent"]] = relationship("CareJourneyEvent", back_populates="care_journey", cascade="all, delete-orphan", order_by="CareJourneyEvent.event_timestamp")


class CareJourneyEvent(Base, TimestampMixin):
    __tablename__ = "care_journey_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    care_journey_id: Mapped[str] = mapped_column(String(36), ForeignKey("care_journeys.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[JourneyEventType] = mapped_column(Enum(JourneyEventType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # Pointer to appointment, Rx, or report
    status: Mapped[JourneyEventStatus] = mapped_column(Enum(JourneyEventStatus), default=JourneyEventStatus.COMPLETED, nullable=False)
    next_action_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    next_action_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    care_journey: Mapped["CareJourney"] = relationship("CareJourney", back_populates="events")
