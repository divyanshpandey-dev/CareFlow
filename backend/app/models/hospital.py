from typing import List, Optional
from datetime import time
from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, Numeric, String, Text, Time, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid


class Hospital(Base, TimestampMixin):
    __tablename__ = "hospitals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    hfr_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)  # ABDM Health Facility Registry ID
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    qr_checkin_token: Mapped[str] = mapped_column(String(128), unique=True, index=True, default=generate_uuid)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    departments: Mapped[List["Department"]] = relationship("Department", back_populates="hospital", cascade="all, delete-orphan")
    doctors: Mapped[List["DoctorProfile"]] = relationship("DoctorProfile", back_populates="hospital")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="hospital")


class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="departments")
    doctors: Mapped[List["DoctorProfile"]] = relationship("DoctorProfile", back_populates="department")


class DoctorProfile(Base, TimestampMixin):
    __tablename__ = "doctor_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False)
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    
    hpr_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)  # ABDM Healthcare Professional Registry ID
    registration_number: Mapped[str] = mapped_column(String(50), nullable=False)  # Medical Council Registration
    qualification: Mapped[str] = mapped_column(String(150), nullable=False)
    specialization: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consultation_fee: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    room_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    languages: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    listing_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)  # DRAFT, PENDING_REVIEW, APPROVED, SUSPENDED

    @property
    def license_number(self) -> str:
        return self.registration_number

    @license_number.setter
    def license_number(self, val: str) -> None:
        self.registration_number = val

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="doctors")
    department: Mapped["Department"] = relationship("Department", back_populates="doctors")
    schedules: Mapped[List["DoctorSchedule"]] = relationship("DoctorSchedule", back_populates="doctor", cascade="all, delete-orphan")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="doctor")


class DoctorSchedule(Base, TimestampMixin):
    __tablename__ = "doctor_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    buffer_time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    max_patients_per_session: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def max_patients(self) -> int:
        return self.max_patients_per_session

    @max_patients.setter
    def max_patients(self, val: int) -> None:
        self.max_patients_per_session = val

    # Relationships
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="schedules")
