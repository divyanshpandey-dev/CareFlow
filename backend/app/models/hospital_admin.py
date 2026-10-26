from typing import Optional
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now


class HospitalAdminAssignment(Base, TimestampMixin):
    __tablename__ = "hospital_admin_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    admin_display_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    admin_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), index=True, nullable=False)
    assigned_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True, nullable=False)  # ACTIVE, SUSPENDED, REVOKED
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revoked_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Compatibility properties
    @property
    def user_id(self) -> str:
        return self.admin_user_id

    @user_id.setter
    def user_id(self, val: str) -> None:
        self.admin_user_id = val

    @property
    def assigned_by_user_id(self) -> Optional[str]:
        return self.assigned_by

    @assigned_by_user_id.setter
    def assigned_by_user_id(self, val: Optional[str]) -> None:
        self.assigned_by = val

    # Relationships
    user = relationship("User", foreign_keys=[admin_user_id])
    hospital = relationship("Hospital", foreign_keys=[hospital_id])
    department = relationship("Department", foreign_keys=[department_id])
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])
