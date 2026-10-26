from typing import Optional
from datetime import date, datetime, time
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, generate_uuid, utc_now
from backend.app.models.enums import AppointmentStatus, AppointmentType, QueueState


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    booking_reference: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False)
    
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    
    appointment_type: Mapped[AppointmentType] = mapped_column(Enum(AppointmentType), default=AppointmentType.NEW_CONSULT, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.CONFIRMED, nullable=False, index=True)
    reason_for_visit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    @property
    def scheduled_start(self) -> datetime:
        return datetime.combine(self.appointment_date, self.start_time)

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="appointments")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="appointments")
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="appointments")
    queue_ticket: Mapped[Optional["QueueTicket"]] = relationship("QueueTicket", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    encounter: Mapped[Optional["Encounter"]] = relationship("Encounter", back_populates="appointment", uselist=False)


class QueueTicket(Base, TimestampMixin):
    __tablename__ = "queue_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False)
    
    ticket_number: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # e.g., "CARD-A14"
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    check_in_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    called_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    service_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    service_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    state: Mapped[QueueState] = mapped_column(Enum(QueueState), default=QueueState.CHECKED_IN, nullable=False, index=True)
    estimated_wait_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="queue_ticket")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile")
    hospital: Mapped["Hospital"] = relationship("Hospital")

