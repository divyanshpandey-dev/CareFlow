from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.database import get_db
from backend.app.models.hospital import Department, DoctorProfile, Hospital
from backend.app.models.user import User
from backend.app.schemas.discovery import (
    AvailableSlotsResponse,
    DepartmentSummary,
    DoctorSummary,
    HospitalSummary,
)
from backend.app.services.scheduling_service import SchedulingService

router = APIRouter(prefix="/discovery", tags=["Discovery"])


@router.get("/hospitals", response_model=List[HospitalSummary])
async def list_hospitals(
    city: Optional[str] = Query(None, description="Filter by city name"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Hospital).where(Hospital.is_active == True)
    if city:
        stmt = stmt.where(Hospital.city.ilike(f"%{city}%"))
    stmt = stmt.order_by(Hospital.name)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/departments", response_model=List[DepartmentSummary])
async def list_departments(
    hospital_id: Optional[str] = Query(None, description="Filter by hospital UUID"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Department)
    if hospital_id:
        stmt = stmt.where(Department.hospital_id == hospital_id)
    stmt = stmt.order_by(Department.name)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/doctors", response_model=List[DoctorSummary])
async def search_doctors(
    specialty: Optional[str] = Query(None, description="Clinical specialty, e.g. Cardiology"),
    hospital_id: Optional[str] = Query(None, description="Hospital identifier"),
    city: Optional[str] = Query(None, description="City name"),
    query: Optional[str] = Query(None, description="Search term across doctor name or qualification"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .join(DoctorProfile.user)
        .join(DoctorProfile.hospital)
        .join(DoctorProfile.department)
        .options(
            selectinload(DoctorProfile.user),
            selectinload(DoctorProfile.hospital),
            selectinload(DoctorProfile.department),
        )
        .where(DoctorProfile.is_verified == True)
    )

    if specialty:
        stmt = stmt.where(DoctorProfile.specialization.ilike(f"%{specialty}%"))
    if hospital_id:
        stmt = stmt.where(DoctorProfile.hospital_id == hospital_id)
    if city:
        stmt = stmt.where(Hospital.city.ilike(f"%{city}%"))
    if query:
        stmt = stmt.where(
            or_(
                User.full_name.ilike(f"%{query}%"),
                DoctorProfile.qualification.ilike(f"%{query}%"),
                DoctorProfile.specialization.ilike(f"%{query}%"),
            )
        )

    res = await db.execute(stmt)
    doctors = res.scalars().all()

    output = []
    for d in doctors:
        output.append(
            DoctorSummary(
                id=d.id,
                user_id=d.user_id,
                full_name=d.user.full_name,
                hospital_id=d.hospital_id,
                hospital_name=d.hospital.name,
                department_id=d.department_id,
                department_name=d.department.name,
                hpr_id=d.hpr_id,
                registration_number=d.registration_number,
                qualification=d.qualification,
                specialization=d.specialization,
                experience_years=d.experience_years,
                consultation_fee=d.consultation_fee,
                room_number=d.room_number,
                languages=d.languages or [],
                is_verified=d.is_verified,
            )
        )
    return output


@router.get("/doctors/{doctor_id}", response_model=DoctorSummary)
async def get_doctor_details(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(DoctorProfile)
        .options(
            selectinload(DoctorProfile.user),
            selectinload(DoctorProfile.hospital),
            selectinload(DoctorProfile.department),
        )
        .where(DoctorProfile.id == doctor_id)
    )
    res = await db.execute(stmt)
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

    return DoctorSummary(
        id=d.id,
        user_id=d.user_id,
        full_name=d.user.full_name,
        hospital_id=d.hospital_id,
        hospital_name=d.hospital.name,
        department_id=d.department_id,
        department_name=d.department.name,
        hpr_id=d.hpr_id,
        registration_number=d.registration_number,
        qualification=d.qualification,
        specialization=d.specialization,
        experience_years=d.experience_years,
        consultation_fee=d.consultation_fee,
        room_number=d.room_number,
        languages=d.languages or [],
        is_verified=d.is_verified,
    )


@router.get("/doctors/{doctor_id}/slots", response_model=AvailableSlotsResponse)
async def get_doctor_slots(
    doctor_id: str,
    target_date: date = Query(..., alias="date", description="Target appointment date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    if target_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check slot availability for past dates.",
        )

    duration, slots = await SchedulingService.get_available_slots(db, doctor_id, target_date)
    return AvailableSlotsResponse(
        doctor_id=doctor_id,
        date=target_date,
        slot_duration_minutes=duration,
        slots=slots,
    )
