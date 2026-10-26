import hashlib
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import get_current_doctor, get_current_patient, get_current_user
from backend.app.core.database import get_db
from backend.app.models.audit import AuditLog
from backend.app.models.base import generate_uuid
from backend.app.models.clinical import Encounter, PatientDocument, Prescription
from backend.app.models.enums import UserRole
from backend.app.models.hospital import DoctorProfile
from backend.app.models.user import PatientProfile, User
from backend.app.schemas.clinical import (
    CompleteEncounterRequest,
    PrescriptionItemResponse,
    PrescriptionVerificationResponse,
)
from backend.app.services.clinical_service import ClinicalService
from backend.app.services.pdf_service import PrescriptionPDFService

router = APIRouter(prefix="/clinical", tags=["Clinical Encounters & Prescriptions"])


@router.post("/encounters/complete")
async def complete_consultation(
    payload: CompleteEncounterRequest,
    current_doctor: DoctorProfile = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    encounter, prescription = await ClinicalService.complete_encounter(
        db=db,
        doctor_id=current_doctor.id,
        payload=payload,
    )

    return {
        "status": "COMPLETED",
        "encounter_id": encounter.id,
        "prescription_id": prescription.id if prescription else None,
        "verification_code": prescription.verification_code if prescription else None,
        "message": "Consultation completed. Cryptographic HMAC-SHA256 record integrity seal generated.",
    }


@router.get("/prescriptions/verify/{verification_code}", response_model=PrescriptionVerificationResponse)
async def public_verify_prescription(
    verification_code: str,
    db: AsyncSession = Depends(get_db),
):
    return await ClinicalService.verify_prescription(db, verification_code)


@router.get("/prescriptions/my")
async def list_my_prescriptions(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.items),
            selectinload(Prescription.doctor).selectinload(DoctorProfile.user),
            selectinload(Prescription.doctor).selectinload(DoctorProfile.hospital),
        )
        .where(Prescription.patient_id == current_patient.id)
        .order_by(desc(Prescription.created_at))
    )
    res = await db.execute(stmt)
    prescriptions = res.scalars().all()

    output = []
    for rx in prescriptions:
        output.append({
            "id": rx.id,
            "prescription_number": rx.prescription_number,
            "verification_code": rx.verification_code,
            "doctor_name": rx.doctor.user.full_name if (rx.doctor and rx.doctor.user) else "Doctor",
            "hospital_name": rx.doctor.hospital.name if (rx.doctor and rx.doctor.hospital) else "Hospital",
            "issued_at": rx.created_at.strftime("%B %d, %Y"),
            "follow_up_date": rx.follow_up_date.strftime("%B %d, %Y") if rx.follow_up_date else None,
            "instructions": rx.instructions,
            "items_count": len(rx.items),
            "items": [PrescriptionItemResponse.model_validate(it) for it in rx.items],
        })
    return output


@router.get("/prescriptions/{prescription_id}/pdf")
async def download_prescription_pdf(
    prescription_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates and returns an official, cryptographically verifiable PDF prescription document.
    """
    stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.items),
            selectinload(Prescription.doctor).selectinload(DoctorProfile.user),
            selectinload(Prescription.doctor).selectinload(DoctorProfile.hospital),
            selectinload(Prescription.patient).selectinload(PatientProfile.user),
        )
        .where(Prescription.id == prescription_id)
    )
    res = await db.execute(stmt)
    rx = res.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found.")

    # Authorization verification
    if current_user.role == UserRole.PATIENT:
        p_stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        p_res = await db.execute(p_stmt)
        patient = p_res.scalar_one_or_none()
        if not patient or rx.patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only download your own prescriptions.",
            )

    pdf_bytes = PrescriptionPDFService.generate_prescription_pdf(rx)
    filename = f"Prescription_{rx.prescription_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Content-Type": "application/pdf",
        },
    )


# ---------------------------------------------------------------------------
# Patient Medical Documents (External Records & Uploads)
# ---------------------------------------------------------------------------
ALLOWED_DOC_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
MAX_DOC_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
async def upload_patient_document(
    file: UploadFile = File(...),
    document_type: str = Form(..., description="PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, OTHER"),
    title: str = Form(..., min_length=2),
    notes: Optional[str] = Form(None),
    hospital_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.PATIENT:
        p_stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        p_res = await db.execute(p_stmt)
        patient = p_res.scalar_one_or_none()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")
        target_patient_id = patient.id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authenticated patients can upload personal medical records.",
        )

    content_type = file.content_type or "application/octet-stream"
    if content_type.lower() not in ALLOWED_DOC_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type}'. Allowed types: PDF, JPEG, PNG, WEBP.",
        )

    contents = await file.read()
    if len(contents) > MAX_DOC_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10MB (actual: {len(contents) / (1024*1024):.2f}MB).",
        )

    sha256_hash = hashlib.sha256(contents).hexdigest()

    upload_dir = "uploads/documents"
    os.makedirs(upload_dir, exist_ok=True)
    clean_name = file.filename.replace("/", "_").replace("\\", "_") if file.filename else "document"
    safe_filename = f"{generate_uuid()}_{clean_name}"
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    doc = PatientDocument(
        patient_id=target_patient_id,
        hospital_id=hospital_id,
        uploaded_by_user_id=current_user.id,
        document_type=document_type.upper(),
        title=title.strip(),
        file_path=file_path,
        file_name=file.filename or clean_name,
        file_size=len(contents),
        mime_type=content_type,
        file_sha256=sha256_hash,
        is_external=True,
        verification_status="PENDING",
        notes=notes.strip() if notes else None,
    )
    db.add(doc)
    await db.flush()

    audit = AuditLog(
        actor_id=current_user.id,
        action="PATIENT_DOCUMENT_UPLOADED",
        resource_type="PATIENT_DOCUMENT",
        resource_id=doc.id,
        status="SUCCESS",
        details_json={
            "patient_id": target_patient_id,
            "document_type": doc.document_type,
            "title": doc.title,
            "sha256": sha256_hash,
            "file_size": len(contents),
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "UPLOADED",
        "id": doc.id,
        "title": doc.title,
        "document_type": doc.document_type,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "is_external": doc.is_external,
        "verification_status": doc.verification_status,
        "file_sha256": doc.file_sha256,
        "created_at": doc.created_at.isoformat() if doc.created_at else "",
    }


@router.get("/documents/my")
async def list_my_documents(
    current_patient: PatientProfile = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(PatientDocument)
        .where(PatientDocument.patient_id == current_patient.id)
        .order_by(desc(PatientDocument.created_at))
    )
    res = await db.execute(stmt)
    docs = res.scalars().all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "document_type": d.document_type,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "mime_type": d.mime_type,
            "is_external": d.is_external,
            "verification_status": d.verification_status,
            "file_sha256": d.file_sha256,
            "notes": d.notes,
            "created_at": d.created_at.isoformat() if d.created_at else "",
        }
        for d in docs
    ]


@router.get("/documents/patient/{patient_id}")
async def list_patient_documents(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.PATIENT:
        p_stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        patient = (await db.execute(p_stmt)).scalar_one_or_none()
        if not patient or patient.id != patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    stmt = (
        select(PatientDocument)
        .where(PatientDocument.patient_id == patient_id)
        .order_by(desc(PatientDocument.created_at))
    )
    res = await db.execute(stmt)
    docs = res.scalars().all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "document_type": d.document_type,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "mime_type": d.mime_type,
            "is_external": d.is_external,
            "verification_status": d.verification_status,
            "file_sha256": d.file_sha256,
            "notes": d.notes,
            "created_at": d.created_at.isoformat() if d.created_at else "",
        }
        for d in docs
    ]


@router.get("/documents/{document_id}/download")
async def download_patient_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PatientDocument).where(PatientDocument.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if current_user.role == UserRole.PATIENT:
        p_stmt = select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        patient = (await db.execute(p_stmt)).scalar_one_or_none()
        if not patient or patient.id != doc.patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not os.path.exists(doc.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical document file missing on server storage.",
        )

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type,
    )
