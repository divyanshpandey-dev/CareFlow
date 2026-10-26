from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now


class SupportConfig(Base, TimestampMixin):
    """
    Platform support configuration managed by Super Admin.
    Replaces hardcoded telephone numbers with verified operational endpoints.
    """
    __tablename__ = "support_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    support_email: Mapped[str] = mapped_column(String(255), default="support@careflow.health", nullable=False)
    support_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    is_phone_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    operating_hours: Mapped[str] = mapped_column(String(255), default="Monday to Saturday: 8:00 AM - 8:00 PM IST", nullable=False)
    physical_desk_location: Mapped[str] = mapped_column(String(255), default="Desk #1 (CareFlow Digital Assistance) in Main Hospital Lobby", nullable=False)
    emergency_guidance: Mapped[str] = mapped_column(
        Text,
        default="For acute medical emergencies, call national emergency response at 112 immediately or proceed to the nearest emergency trauma center.",
        nullable=False,
    )
    senior_citizen_guidance: Mapped[str] = mapped_column(
        Text,
        default="Elderly patients (60+) receive designated seating priority and wheelchair assistance at Desk #1.",
        nullable=False,
    )


class SupportTicket(Base, TimestampMixin):
    """
    Genuine patient support requests submitted through the CareFlow platform.
    """
    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_reference: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False)  # APPOINTMENT, QUEUE, PRESCRIPTION, LAB, GENERAL
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)  # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # LOW, NORMAL, URGENT
    admin_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped["PatientProfile"] = relationship("PatientProfile", lazy="selectin")

