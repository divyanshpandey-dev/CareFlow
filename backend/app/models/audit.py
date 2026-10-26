from typing import Optional
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now
from backend.app.models.enums import AuditActionStatus


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # e.g. "RECORD_ACCESSED", "RX_SIGNED"
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    hospital_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[AuditActionStatus] = mapped_column(Enum(AuditActionStatus), default=AuditActionStatus.SUCCESS, nullable=False)
    details_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
