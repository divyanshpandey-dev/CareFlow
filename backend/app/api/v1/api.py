from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    admin,
    ai,
    appointments,
    auth,
    clinical,
    consent,
    discovery,
    hospital_admin,
    journey,
    lab,
    queue,
    support,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(discovery.router)
api_router.include_router(appointments.router)
api_router.include_router(queue.router)
api_router.include_router(clinical.router)
api_router.include_router(lab.router)
api_router.include_router(journey.router)
api_router.include_router(consent.router)
api_router.include_router(ai.router)
api_router.include_router(admin.router)
api_router.include_router(support.router)
api_router.include_router(hospital_admin.router, prefix="/hospital-admin", tags=["Hospital Admin"])

@api_router.get("/status", tags=["System"])
async def get_system_status():
    return {
        "status": "healthy",
        "service": "CareFlow Unified Healthcare Coordination Engine",
        "version": "1.0.0",
        "abdm_profile": "NRCeS FHIR R4 Compliant",
    }
