from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import RoleChecker, get_current_user
from backend.app.core.database import get_db
from backend.app.models.enums import UserRole
from backend.app.models.user import User
from backend.app.schemas.ai import PreVisitBriefResponse
from backend.app.services.ai_brief_service import AIBriefService

router = APIRouter(prefix="/ai", tags=["Assistive Clinical AI"])


@router.get("/pre-visit-brief/{patient_id}", response_model=PreVisitBriefResponse)
async def get_pre_visit_brief(
    patient_id: str,
    current_user: User = Depends(RoleChecker([UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.PATIENT])),
    db: AsyncSession = Depends(get_db),
):
    """
    Assistive AI Pre-Visit Briefing Engine:
    Synthesizes past consultations, medications, allergies, and diagnostic markers
    into an executive clinical brief with mandatory physician review disclaimer.
    """
    try:
        return await AIBriefService.generate_pre_visit_brief(db, patient_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/status")
async def get_ai_service_status():
    """
    Live Status Check for Local Ollama Inference Engine:
    Pings Ollama running locally in the terminal (http://localhost:11434)
    and reports model availability and network latency.
    """
    return await AIBriefService.check_ollama_status()
