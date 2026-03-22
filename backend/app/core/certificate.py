"""PNPI — Generation du certificat officiel ATI avec QR code."""
from __future__ import annotations

import io
import os
import qrcode
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image,
)

BLEU = colors.HexColor("#003F8F")
VERT = colors.HexColor("#006233")
OR = colors.HexColor("#F5D30F")


def generate_ati_certificate(
    numero_ati: str,
    operateur: str,
    nif: str,
    secteur: str,
    province: str,
    type_activite: str,
    date_soumission: datetime,
    date_decision: datetime,
    date_expiration: datetime | None,
    reference_decision: str | None,
    sla_jours: int,
) -> bytes:
    """Generate an official ATI approval certificate PDF with QR code."""

    # Generate QR code
    qr_data = f"https://pnpi-gabon.ga/verify/ati/{numero_ati}"
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#003F8F", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2.5*cm, rightMargin=2.5*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    center_style = ParagraphStyle("center", parent=styles["Normal"], alignment=TA_CENTER)

    story = []

    # Header
    story.append(Paragraph("REPUBLIQUE GABONAISE", ParagraphStyle("rg", parent=center_style, fontSize=11, textColor=colors.gray)))
    story.append(Paragraph("Union — Travail — Justice", ParagraphStyle("motto", parent=center_style, fontSize=9, textColor=colors.gray, fontName="Helvetica-Oblique")))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("MINISTERE DE L'INDUSTRIE ET DE LA TRANSFORMATION LOCALE", ParagraphStyle("ministry", parent=center_style, fontSize=10, textColor=BLEU, fontName="Helvetica-Bold")))
    story.append(Paragraph("Direction Generale de l'Industrie", ParagraphStyle("dgi", parent=center_style, fontSize=9, textColor=BLEU)))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=3, color=VERT))
    story.append(Spacer(1, 0.2*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=OR))
    story.append(Spacer(1, 0.6*cm))

    # Title
    story.append(Paragraph("AGREMENT TECHNIQUE INDUSTRIEL", ParagraphStyle("title", parent=center_style, fontSize=20, textColor=BLEU, fontName="Helvetica-Bold", spaceAfter=4)))
    story.append(Paragraph("CERTIFICAT D'APPROBATION", ParagraphStyle("subtitle", parent=center_style, fontSize=14, textColor=VERT, fontName="Helvetica-Bold", spaceAfter=12)))
    story.append(Spacer(1, 0.4*cm))

    # Certificate number
    story.append(Paragraph(f"N° <b>{numero_ati}</b>", ParagraphStyle("num", parent=center_style, fontSize=16, textColor=BLEU, spaceAfter=8)))
    if reference_decision:
        story.append(Paragraph(f"Reference decision : {reference_decision}", ParagraphStyle("ref", parent=center_style, fontSize=9, textColor=colors.gray, spaceAfter=12)))
    story.append(Spacer(1, 0.6*cm))

    # Body
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=11, leading=16)
    story.append(Paragraph(
        f"Le Ministere de l'Industrie et de la Transformation Locale certifie que l'agrement technique "
        f"industriel <b>N° {numero_ati}</b> a ete delivre a :",
        body_style,
    ))
    story.append(Spacer(1, 0.4*cm))

    # Operator details table
    details = [
        ["Operateur", operateur],
        ["NIF Gabon", nif],
        ["Secteur industriel", secteur.capitalize()],
        ["Province", province.replace("_", " ").title()],
        ["Activite agreee", type_activite[:120]],
        ["Date de soumission", date_soumission.strftime("%d/%m/%Y")],
        ["Date d'approbation", date_decision.strftime("%d/%m/%Y")],
    ]
    if date_expiration:
        details.append(["Date d'expiration", date_expiration.strftime("%d/%m/%Y")])

    t = Table(details, colWidths=[5*cm, 10*cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), BLEU),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e5e7eb")),
        ("LINEBELOW", (0, -1), (-1, -1), 1, BLEU),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.8*cm))

    story.append(Paragraph(
        "Cet agrement atteste de la conformite de l'operateur aux normes et reglementations "
        "en vigueur en matiere d'activite industrielle sur le territoire de la Republique Gabonaise.",
        body_style,
    ))
    story.append(Spacer(1, 0.6*cm))

    # QR Code + verification
    qr_image = Image(qr_buf, width=3*cm, height=3*cm)
    qr_table = Table(
        [[qr_image, Paragraph(
            f"<b>Verification numerique</b><br/>"
            f"Scannez ce QR code ou visitez :<br/>"
            f"<font color='blue'>{qr_data}</font><br/><br/>"
            f"<font size='8' color='gray'>Document genere par la Plateforme Nationale<br/>"
            f"de la Politique Industrielle (PNPI)</font>",
            ParagraphStyle("qr_text", parent=styles["Normal"], fontSize=9, leading=12),
        )]],
        colWidths=[3.5*cm, 12*cm],
    )
    qr_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(qr_table)

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=VERT))
    story.append(Paragraph(
        f"Fait a Libreville, le {date_decision.strftime('%d/%m/%Y')}",
        ParagraphStyle("footer", parent=center_style, fontSize=9, textColor=colors.gray, spaceBefore=8),
    ))
    story.append(Paragraph(
        "Le Directeur General de l'Industrie",
        ParagraphStyle("signatory", parent=center_style, fontSize=10, textColor=BLEU, fontName="Helvetica-Bold", spaceBefore=8),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
