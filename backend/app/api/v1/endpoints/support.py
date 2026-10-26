import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import RoleChecker, get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.models.enums import UserRole
from backend.app.models.support import SupportConfig, SupportTicket
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.support import (
    CreateSupportTicketRequest,
    SupportConfigResponse,
    SupportConfigUpdateRequest,
    SupportTicketResponse,
)

router = APIRouter(prefix="/support", tags=["Support & Assistance"])


async def _get_or_create_default_config(db: AsyncSession) -> SupportConfig:
    stmt = select(SupportConfig).where(SupportConfig.id == "default")
    res = await db.execute(stmt)
    cfg = res.scalar_one_or_none()
    if not cfg:
        cfg = SupportConfig(
            id="default",
            support_email="support@careflow.health",
            support_phone=None,
            is_phone_active=False,
            operating_hours="Monday to Saturday: 8:00 AM - 8:00 PM IST",
            physical_desk_location="Desk #1 (CareFlow Digital Assistance) in Main Hospital Lobby",
            emergency_guidance="For acute medical emergencies, call national emergency response at 112 immediately or proceed to the nearest emergency trauma center.",
            senior_citizen_guidance="Elderly patients (60+) receive designated seating priority and wheelchair assistance at Desk #1.",
        )
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


@router.get("/config", response_model=SupportConfigResponse)
async def get_support_config(db: AsyncSession = Depends(get_db)):
    """
    Returns verified platform support endpoints.
    Eliminates hardcoded/invented telephone numbers.
    """
    return await _get_or_create_default_config(db)


@router.put("/config", response_model=SupportConfigResponse)
async def update_support_config(
    payload: SupportConfigUpdateRequest,
    current_admin: User = Depends(RoleChecker([UserRole.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin endpoint to configure official patient support details.
    """
    cfg = await _get_or_create_default_config(db)
    if payload.support_email is not None:
        cfg.support_email = payload.support_email
    if payload.support_phone is not None:
        cfg.support_phone = payload.support_phone
    if payload.is_phone_active is not None:
        cfg.is_phone_active = payload.is_phone_active
    if payload.operating_hours is not None:
        cfg.operating_hours = payload.operating_hours
    if payload.physical_desk_location is not None:
        cfg.physical_desk_location = payload.physical_desk_location
    if payload.emergency_guidance is not None:
        cfg.emergency_guidance = payload.emergency_guidance
    if payload.senior_citizen_guidance is not None:
        cfg.senior_citizen_guidance = payload.senior_citizen_guidance

    await db.commit()
    await db.refresh(cfg)
    return cfg


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    payload: CreateSupportTicketRequest,
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Authentic ticket creation: Patients can submit real support inquiries.
    """
    # Generate unique ticket reference (e.g. CF-SUP-84729)
    random_digits = "".join(random.choices(string.digits, k=5))
    ref = f"CF-SUP-{random_digits}"

    ticket = SupportTicket(
        ticket_reference=ref,
        patient_id=current_patient.id,
        category=payload.category.upper(),
        subject=payload.subject.strip(),
        description=payload.description.strip(),
        status="OPEN",
        priority=payload.priority.upper(),
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/tickets/my", response_model=List[SupportTicketResponse])
async def list_my_support_tickets(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patients can see their genuine submitted tickets and status updates.
    """
    stmt = (
        select(SupportTicket)
        .where(SupportTicket.patient_id == current_patient.id)
        .order_by(desc(SupportTicket.created_at))
    )
    res = await db.execute(stmt)
    return res.scalars().all()

