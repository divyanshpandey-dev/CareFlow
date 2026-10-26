import json
import logging
import time
from datetime import date, datetime
from typing import Optional
import httpx
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.config import settings
from backend.app.models.clinical import Encounter, LabReport, Prescription
from backend.app.models.hospital import DoctorProfile
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.ai import PreVisitBriefResponse, TimelineDigestItem

logger = logging.getLogger("careflow.ai")


class AIBriefService:
    @classmethod
    async def check_ollama_status(cls) -> dict:
        """
        Pings local Ollama service to verify connection and list available models.
        """
        base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        try:
            t0 = time.perf_counter()
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{base_url}/api/tags")
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    model_found = any(settings.OLLAMA_MODEL in m for m in models)
                    return {
                        "status": "connected",
                        "ollama_base_url": base_url,
                        "configured_model": settings.OLLAMA_MODEL,
                        "model_available": model_found,
                        "installed_models": models,
                        "latency_ms": latency_ms,
                        "hint": (
                            f"Ollama is running locally with '{settings.OLLAMA_MODEL}' ready."
                            if model_found
                            else f"Ollama is online, but model '{settings.OLLAMA_MODEL}' not loaded. Run 'ollama run {settings.OLLAMA_MODEL}' in terminal."
                        ),
                    }
                return {
                    "status": "error",
                    "ollama_base_url": base_url,
                    "configured_model": settings.OLLAMA_MODEL,
                    "model_available": False,
                    "error": f"Ollama returned HTTP {res.status_code}",
                    "hint": "Check if Ollama service is healthy.",
                }
        except Exception as e:
            return {
                "status": "offline",
                "ollama_base_url": base_url,
                "configured_model": settings.OLLAMA_MODEL,
                "model_available": False,
                "error": str(e),
                "hint": f"Ollama is not running. Launch it in your terminal: 'ollama run {settings.OLLAMA_MODEL}'",
            }
    @classmethod
    async def generate_pre_visit_brief(
        cls,
        db: AsyncSession,
        patient_id: str,
    ) -> PreVisitBriefResponse:
        """
        Synthesizes a structured, safety-bounded pre-visit clinical brief for the doctor.
        Extracts verified historical encounters, prescriptions, and lab reports.
        """
        # 1. Fetch patient demographic & clinical profile
        p_stmt = (
            select(PatientProfile)
            .options(selectinload(PatientProfile.user))
            .where(PatientProfile.id == patient_id)
        )
        p_res = await db.execute(p_stmt)
        patient = p_res.scalar_one_or_none()
        if not patient:
            raise ValueError("Patient not found")

        # 2. Fetch recent encounters
        enc_stmt = (
            select(Encounter)
            .options(
                selectinload(Encounter.doctor).selectinload(DoctorProfile.user),
                selectinload(Encounter.doctor).selectinload(DoctorProfile.hospital),
            )
            .where(Encounter.patient_id == patient_id)
            .order_by(desc(Encounter.created_at))
            .limit(5)
        )
        enc_res = await db.execute(enc_stmt)
        encounters = enc_res.scalars().all()

        # 3. Fetch recent prescriptions
        rx_stmt = (
            select(Prescription)
            .options(
                selectinload(Prescription.items),
                selectinload(Prescription.doctor).selectinload(DoctorProfile.user),
            )
            .where(Prescription.patient_id == patient_id)
            .order_by(desc(Prescription.created_at))
            .limit(5)
        )
        rx_res = await db.execute(rx_stmt)
        prescriptions = rx_res.scalars().all()

        # 4. Fetch recent lab reports
        lab_stmt = (
            select(LabReport)
            .where(LabReport.patient_id == patient_id)
            .order_by(desc(LabReport.verified_at))
            .limit(5)
        )
        lab_res = await db.execute(lab_stmt)
        lab_reports = lab_res.scalars().all()

        # Calculate age
        age = None
        if patient.dob:
            today = date.today()
            age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))

        # Build timeline digest
        timeline: list[TimelineDigestItem] = []
        for e in encounters:
            doc_name = e.doctor.user.full_name if (e.doctor and e.doctor.user) else "Doctor"
            hosp_name = e.doctor.hospital.name if (e.doctor and e.doctor.hospital) else "Hospital"
            timeline.append(
                TimelineDigestItem(
                    date=e.created_at.strftime("%B %d, %Y"),
                    event="Consultation",
                    provider=f"{doc_name} ({hosp_name})",
                    summary=f"Assessment: {e.assessment}. Notes: {e.objective or 'Vitals stable'}",
                    source_id=e.id,
                )
            )

        for r in prescriptions:
            doc_name = r.doctor.user.full_name if (r.doctor and r.doctor.user) else "Doctor"
            meds_summary = ", ".join([f"{it.medicine_name} {it.dosage} ({it.frequency})" for it in r.items])
            timeline.append(
                TimelineDigestItem(
                    date=r.created_at.strftime("%B %d, %Y"),
                    event="Prescription Issued",
                    provider=doc_name,
                    summary=f"Rx #{r.prescription_number}: {meds_summary}",
                    source_id=r.id,
                )
            )

        for l in lab_reports:
            timeline.append(
                TimelineDigestItem(
                    date=l.verified_at.strftime("%B %d, %Y"),
                    event="Verified Lab Report",
                    provider="Pathology Laboratory",
                    summary=f"Report #{l.report_number}: {l.summary} (Abnormal flags: {l.abnormal_flags})",
                    source_id=l.id,
                )
            )

        # Sort combined timeline descending
        timeline.sort(key=lambda t: t.date, reverse=True)

        # 5. Synthesize summary digest
        synthesis_text = ""
        ai_model_name = f"Ollama ({settings.OLLAMA_MODEL}) / Assistive Clinical Guard"

        # Attempt Local Ollama inference (100% local terminal LLM)
        if settings.OLLAMA_BASE_URL:
            try:
                context_payload = {
                    "patient_name": patient.user.full_name if patient.user else "Patient",
                    "age": age,
                    "gender": patient.gender.value if patient.gender else "Unknown",
                    "allergies": patient.allergies or [],
                    "chronic_conditions": patient.chronic_conditions or [],
                    "timeline": [t.model_dump() for t in timeline],
                }

                system_instruction = (
                    "You are CareFlow Clinical Assistant, a strictly administrative synthesis system for doctors. "
                    "You MUST NOT diagnose conditions or alter prescriptions. Synthesize the provided timeline and patient history into a concise, 3-bullet clinical briefing: "
                    "1) Chronic Background & Known Allergies. "
                    "2) Recent Clinical Trajectory (past visits and symptoms). "
                    "3) Key Diagnostic Findings (mention specific numeric values and abnormal flags)."
                )

                prompt_content = (
                    f"Patient Clinical Context:\n{json.dumps(context_payload, indent=2)}\n\n"
                    "Provide a strictly factual 3-bullet clinical briefing for the attending physician:"
                )

                endpoint = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
                payload = {
                    "model": settings.OLLAMA_MODEL,
                    "prompt": f"{system_instruction}\n\n{prompt_content}",
                    "system": system_instruction,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                    },
                }

                async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
                    resp = await client.post(
                        endpoint,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        response_content = data.get("response", "").strip()
                        if response_content:
                            synthesis_text = response_content
                            ai_model_name = f"Ollama ({settings.OLLAMA_MODEL}) [Local Terminal Engine]"
                            logger.info("Successfully generated clinical brief via local Ollama (%s)", settings.OLLAMA_MODEL)
                    else:
                        logger.warning(
                            "Local Ollama returned HTTP %s: %s. Falling back to local clinical guard.",
                            resp.status_code,
                            resp.text,
                        )
            except httpx.ConnectError:
                logger.warning(
                    "Ollama is offline or unreachable at %s. To enable live inference, run in your terminal: 'ollama run %s'. Using local deterministic clinical fallback.",
                    settings.OLLAMA_BASE_URL,
                    settings.OLLAMA_MODEL,
                )
            except httpx.TimeoutException:
                logger.warning(
                    "Local Ollama inference timed out (> %ss). Using local deterministic clinical fallback.",
                    settings.OLLAMA_TIMEOUT,
                )
            except Exception as e:
                logger.warning(
                    "Local Ollama inference error (%s). Using local deterministic clinical fallback.",
                    e,
                )

        # Deterministic High-Fidelity Local Clinical Synthesis Fallback
        if not synthesis_text:
            allergies_str = ", ".join(patient.allergies) if patient.allergies else "No known drug allergies"
            conditions_str = ", ".join(patient.chronic_conditions) if patient.chronic_conditions else "No chronic conditions documented"
            
            recent_assessments = [e.assessment for e in encounters if e.assessment]
            assessment_str = "; ".join(recent_assessments) if recent_assessments else "Routine preventive consult"
            
            recent_meds = []
            for r in prescriptions:
                for it in r.items:
                    recent_meds.append(f"{it.medicine_name} {it.dosage}")
            meds_str = ", ".join(set(recent_meds)) if recent_meds else "None on active record"

            recent_labs = [l.summary for l in lab_reports if l.summary]
            labs_str = " | ".join(recent_labs) if recent_labs else "No recent diagnostic reports"

            synthesis_text = (
                f"• CLINICAL BACKGROUND & ALLERGIES: Documented Conditions: {conditions_str}. Allergies: {allergies_str}.\n"
                f"• PREVIOUS TRAJECTORY & ACTIVE THERAPIES: Recent Assessments: {assessment_str}. Active Prescriptions on Record: {meds_str}.\n"
                f"• KEY DIAGNOSTIC FINDINGS: {labs_str}."
            )
            ai_model_name = "CareFlow Clinical Synthesis Engine (Zero-Latency Local Guard)"

        return PreVisitBriefResponse(
            patient_id=patient.id,
            patient_name=patient.user.full_name if patient.user else "Patient",
            age=age,
            gender=patient.gender.value if patient.gender else None,
            blood_group=patient.blood_group,
            allergies=patient.allergies or [],
            chronic_conditions=patient.chronic_conditions or [],
            recent_consultations_count=len(encounters),
            recent_prescriptions_count=len(prescriptions),
            recent_lab_reports_count=len(lab_reports),
            clinical_timeline=timeline,
            clinical_synthesis_notes=synthesis_text,
            is_ai_generated=True,
            ai_model=ai_model_name,
        )
