from typing import List, Optional
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now
from backend.app.models.enums import ConsentPurpose, ConsentStatus


class Consent(Base, TimestampMixin):
    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    consent_artefact_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)  # ABDM format
    
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    requester_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    requester_hospital_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)
    
    purpose: Mapped[ConsentPurpose] = mapped_column(Enum(ConsentPurpose), default=ConsentPurpose.CARE_MANAGEMENT, nullable=False)
    # Scopes: e.g. ["PRESCRIPTIONS", "LAB_REPORTS", "CLINICAL_NOTES"]
    scopes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[ConsentStatus] = mapped_column(Enum(ConsentStatus), default=ConsentStatus.REQUESTED, nullable=False, index=True)
    
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    valid_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    access_logs: Mapped[List["ConsentAccessLog"]] = relationship("ConsentAccessLog", back_populates="consent", cascade="all, delete-orphan")


class ConsentAccessLog(Base, TimestampMixin):
    __tablename__ = "consent_access_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    consent_id: Mapped[str] = mapped_column(String(36), ForeignKey("consents.id", ondelete="CASCADE"), nullable=False)
    accessed_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    resource_accessed: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    consent: Mapped["Consent"] = relationship("Consent", back_populates="access_logs")
