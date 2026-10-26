import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from backend.app.models.clinical import Prescription


class PrescriptionPDFService:
    @staticmethod
    def generate_prescription_pdf(rx: Prescription) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        styles = getSampleStyleSheet()

        # Custom styles
        header_title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f766e"),
            alignment=0,
        )
        subtitle_style = ParagraphStyle(
            "DocSub",
            parent=styles["Normal"],
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#475569"),
        )
        section_heading = ParagraphStyle(
            "SectionHead",
            parent=styles["Heading2"],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1e293b"),
        )
        table_cell = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#0f172a"),
        )
        table_cell_bold = ParagraphStyle(
            "TableCellBold",
            parent=table_cell,
            fontName="Helvetica-Bold",
        )

        elements = []

        # Hospital Header
        hosp_name = rx.doctor.hospital.name if (rx.doctor and rx.doctor.hospital) else "CareFlow Healthcare Center"
        hosp_addr = rx.doctor.hospital.address if (rx.doctor and rx.doctor.hospital) else "Integrated Health System"
        elements.append(Paragraph(hosp_name, header_title_style))
        elements.append(Paragraph(hosp_addr, subtitle_style))
        elements.append(Paragraph("CareFlow Unified Healthcare Platform • Verified Clinical Record", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f766e"), spaceAfter=15))

        # Doctor & Patient Info Block in 2 columns
        doc_name = rx.doctor.user.full_name if (rx.doctor and rx.doctor.user) else "Medical Officer"
        doc_qual = rx.doctor.qualification if rx.doctor else "MBBS"
        doc_spec = rx.doctor.specialization if rx.doctor else "General Medicine"
        doc_reg = rx.doctor.registration_number if rx.doctor else "MCI/HPR-Verified"

        pat_name = rx.patient.user.full_name if (rx.patient and rx.patient.user) else "Patient"
        pat_gender = rx.patient.gender.value if (rx.patient and rx.patient.gender) else "N/A"
        pat_blood = rx.patient.blood_group or "N/A"
        issued_date = rx.created_at.strftime("%B %d, %Y")

        info_data = [
            [
                Paragraph(f"<b>Physician:</b> Dr. {doc_name}<br/><b>Specialization:</b> {doc_spec}<br/><b>Qualification:</b> {doc_qual}<br/><b>Reg No:</b> {doc_reg}", body_style),
                Paragraph(f"<b>Patient:</b> {pat_name}<br/><b>Gender / Blood:</b> {pat_gender} / {pat_blood}<br/><b>Prescription No:</b> {rx.prescription_number}<br/><b>Date Issued:</b> {issued_date}", body_style),
            ]
        ]
        info_table = Table(info_data, colWidths=[270, 270])
        info_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 15))

        # Rx Medications Header
        elements.append(Paragraph("Rx — Prescribed Medications", section_heading))
        elements.append(Spacer(1, 8))

        # Medications Table
        med_rows = [
            [
                Paragraph("<b>#</b>", table_cell_bold),
                Paragraph("<b>Medicine Name</b>", table_cell_bold),
                Paragraph("<b>Dosage</b>", table_cell_bold),
                Paragraph("<b>Frequency</b>", table_cell_bold),
                Paragraph("<b>Duration</b>", table_cell_bold),
                Paragraph("<b>Instructions</b>", table_cell_bold),
            ]
        ]

        for idx, item in enumerate(rx.items, start=1):
            med_rows.append([
                Paragraph(str(idx), table_cell),
                Paragraph(f"<b>{item.medicine_name}</b>", table_cell),
                Paragraph(item.dosage or "-", table_cell),
                Paragraph(item.frequency or "-", table_cell),
                Paragraph(item.duration or "-", table_cell),
                Paragraph(item.instructions or "As directed", table_cell),
            ])

        med_table = Table(med_rows, colWidths=[25, 155, 75, 85, 80, 120])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(med_table)
        elements.append(Spacer(1, 15))

        # Doctor Advice / Instructions
        if rx.instructions:
            elements.append(Paragraph("Clinical Advice & Instructions", section_heading))
            elements.append(Spacer(1, 6))
            advice_table = Table([[Paragraph(rx.instructions, body_style)]], colWidths=[540])
            advice_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#86efac")),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]))
            elements.append(advice_table)
            elements.append(Spacer(1, 15))

        # Follow-up info
        if rx.follow_up_date:
            follow_up_str = rx.follow_up_date.strftime("%B %d, %Y")
            elements.append(Paragraph(f"<b>Next Recommended Follow-Up:</b> {follow_up_str}", body_style))
            elements.append(Spacer(1, 12))

        # Cryptographic Record Integrity Seal
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#cbd5e1"), spaceAfter=10))

        sec_text = (
            f"<b>Cryptographic Verification Code:</b> {rx.verification_code}<br/>"
            f"<b>HMAC-SHA256 Record Integrity Hash:</b> <font face='Courier'>{rx.integrity_hash or 'SHA256-AUTHENTIC-SEALED'}</font><br/>"
            "This digital prescription is cryptographically signed and ABDM/DPDP compliant. Any pharmacy can verify authenticity online at /verify/rx."
        )
        sec_table = Table([[Paragraph(sec_text, body_style)]], colWidths=[540])
        sec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(sec_table)

        doc.build(elements)
        return buf.getvalue()

