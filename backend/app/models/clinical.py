from typing import List, Optional
from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now
from backend.app.models.enums import LabOrderPriority, LabOrderStatus, MedicineFormulation


class Encounter(Base, TimestampMixin):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False)

    # Standard Clinical SOAP Notes
    subjective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Chief complaints, symptoms history
    objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # Vitals: BP, Pulse, SpO2, physical findings
    assessment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Clinical impression / diagnosis
    plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)        # Management plan & recommendations

    # Relationships
    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="encounter")
    patient: Mapped["PatientProfile"] = relationship("PatientProfile")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile")
    prescription: Mapped[Optional["Prescription"]] = relationship("Prescription", back_populates="encounter", uselist=False, cascade="all, delete-orphan")
    lab_orders: Mapped[List["LabOrder"]] = relationship("LabOrder", back_populates="encounter", cascade="all, delete-orphan")


class Prescription(Base, TimestampMixin):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    encounter_id: Mapped[str] = mapped_column(String(36), ForeignKey("encounters.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False)
    
    prescription_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    # Cryptographic integrity seal (HMAC-SHA256)
    digital_signature_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    verification_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    encounter: Mapped["Encounter"] = relationship("Encounter", back_populates="prescription")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile")
    patient: Mapped["PatientProfile"] = relationship("PatientProfile")
    items: Mapped[List["PrescriptionItem"]] = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base, TimestampMixin):
    __tablename__ = "prescription_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    prescription_id: Mapped[str] = mapped_column(String(36), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    generic_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    formulation: Mapped[MedicineFormulation] = mapped_column(Enum(MedicineFormulation), default=MedicineFormulation.TABLET, nullable=False)
    dosage: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "500 mg"
    frequency: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "1-0-1 after meals"
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="items")


class LabOrder(Base, TimestampMixin):
    __tablename__ = "lab_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    encounter_id: Mapped[str] = mapped_column(String(36), ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False)
    
    test_name: Mapped[str] = mapped_column(String(200), nullable=False)
    test_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Standard LOINC code
    clinical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[LabOrderPriority] = mapped_column(Enum(LabOrderPriority), default=LabOrderPriority.ROUTINE, nullable=False)
    status: Mapped[LabOrderStatus] = mapped_column(Enum(LabOrderStatus), default=LabOrderStatus.ORDERED, nullable=False, index=True)

    # Relationships
    encounter: Mapped["Encounter"] = relationship("Encounter", back_populates="lab_orders")
    patient: Mapped["PatientProfile"] = relationship("PatientProfile")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile")
    report: Mapped[Optional["LabReport"]] = relationship("LabReport", back_populates="lab_order", uselist=False, cascade="all, delete-orphan")


class LabReport(Base, TimestampMixin):
    __tablename__ = "lab_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    lab_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("lab_orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    verified_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    report_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    document_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    abnormal_flags: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    lab_order: Mapped["LabOrder"] = relationship("LabOrder", back_populates="report")


class PatientDocument(Base, TimestampMixin):
    """
    Secure patient medical document storage for external prescriptions, lab reports,
    and patient-uploaded health records. Clearly distinguished from clinician-authored records.
    """
    __tablename__ = "patient_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)
    uploaded_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, OTHER
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # Crucial distinction: External records cannot be labeled as digitally signed clinician prescriptions
    is_external: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED
    verified_by_user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by_user_id])
    verifier = relationship("User", foreign_keys=[verified_by_user_id])
    hospital = relationship("Hospital", foreign_keys=[hospital_id])

