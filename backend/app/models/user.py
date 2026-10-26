from typing import List, Optional
from datetime import date
from sqlalchemy import Boolean, Date, Enum, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid
from backend.app.models.enums import Gender, UserRole


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.PATIENT, index=True)
    hospital_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    patient_profile: Mapped[Optional["PatientProfile"]] = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile: Mapped[Optional["DoctorProfile"]] = relationship("DoctorProfile", back_populates="user", uselist=False)

    @property
    def patient_identifier(self) -> Optional[str]:
        return self.patient_profile.patient_identifier if self.patient_profile else None

    @property
    def profile_completed(self) -> Optional[bool]:
        return self.patient_profile.profile_completed if self.patient_profile else None


class PatientProfile(Base, TimestampMixin):
    __tablename__ = "patient_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Human-readable CareFlow Patient ID (CF-PAT-XXXXXX)
    patient_identifier: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    
    # ABDM / Identity integration
    abha_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True, nullable=True)
    abha_address: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[Gender]] = mapped_column(Enum(Gender), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Identity verification metadata (No plaintext sensitive IDs stored)
    id_document_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_document_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Clinical history stored as JSON lists for portable querying across SQLite & Postgres
    allergies: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)
    chronic_conditions: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)

    @property
    def date_of_birth(self) -> Optional[date]:
        return self.dob

    @date_of_birth.setter
    def date_of_birth(self, val: Optional[date]) -> None:
        self.dob = val

    @property
    def age(self) -> Optional[int]:
        if not self.dob:
            return None
        today = date.today()
        return today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="patient_profile")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="patient")
    care_journeys: Mapped[List["CareJourney"]] = relationship("CareJourney", back_populates="patient")
    documents: Mapped[List["PatientDocument"]] = relationship("PatientDocument", back_populates="patient", cascade="all, delete-orphan")
