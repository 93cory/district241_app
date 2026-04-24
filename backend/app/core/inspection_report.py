"""PNPI · Generation du rapport d'inspection de conformite PDF."""
from __future__ import annotations

import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable,
)

BLEU = colors.HexColor("#003F8F")
VERT = colors.HexColor("#006233")
ROUGE = colors.HexColor("#B42318")
OR = colors.HexColor("#F5D30F")

CONFORMITY_LABELS = {
    "conforme": ("CONFORME", VERT),
    "non_conforme": ("NON CONFORME", ROUGE),
    "partiel": ("PARTIELLEMENT CONFORME", colors.HexColor("#D97706")),
}


def generate_inspection_report(
    numero_inspection: str,
    operateur: str,
    nif: str,
    province: str,
    site: str,
    inspecteur: str,
    date_inspection: datetime,
    statut_conformite: str,
    observations: str,
    recommandations: str | None = None,
    photos: list[str] | None = None,
    score_conformite: float | None = None,
) -> bytes:
    """Generate an inspection conformity report as PDF."""

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2.5*cm, rightMargin=2.5*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    center = ParagraphStyle("center", parent=styles["Normal"], alignment=TA_CENTER)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=11, leading=16)

    story = []

    # Header
    story.append(Paragraph("REPUBLIQUE GABONAISE", ParagraphStyle("rg", parent=center, fontSize=11, textColor=colors.gray)))
    story.append(Paragraph("Ministere de l'Industrie et de la Transformation Locale", ParagraphStyle("min", parent=center, fontSize=10, textColor=BLEU, fontName="Helvetica-Bold")))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=3, color=VERT))
    story.append(HRFlowable(width="100%", thickness=1, color=OR))
    story.append(Spacer(1, 0.5*cm))

    # Title
    story.append(Paragraph("RAPPORT D'INSPECTION DE CONFORMITE", ParagraphStyle("title", parent=center, fontSize=18, textColor=BLEU, fontName="Helvetica-Bold", spaceAfter=4)))
    story.append(Paragraph(f"N\u00b0 {numero_inspection}", ParagraphStyle("num", parent=center, fontSize=14, textColor=BLEU, spaceAfter=12)))
    story.append(Spacer(1, 0.4*cm))

    # Conformity verdict
    label, color = CONFORMITY_LABELS.get(statut_conformite, ("INCONNU", colors.gray))
    verdict_table = Table(
        [[Paragraph(f"<b>{label}</b>", ParagraphStyle("verdict", parent=center, fontSize=16, textColor=colors.white))]],
        colWidths=[12*cm],
    )
    verdict_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    story.append(verdict_table)

    if score_conformite is not None:
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(f"Score de conformite : <b>{score_conformite:.0f}%</b>", ParagraphStyle("score", parent=center, fontSize=11, textColor=color)))

    story.append(Spacer(1, 0.6*cm))

    # Info table
    details = [
        ["Operateur inspecte", operateur],
        ["NIF Gabon", nif],
        ["Province", province.replace("_", " ").title()],
        ["Site / Unite", site or "\u2014"],
        ["Inspecteur", inspecteur],
        ["Date d'inspection", date_inspection.strftime("%d/%m/%Y")],
    ]

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
    story.append(Spacer(1, 0.6*cm))

    # Observations
    story.append(Paragraph("<b>Observations :</b>", ParagraphStyle("h3", parent=body, textColor=BLEU, fontSize=12, spaceAfter=6)))
    story.append(Paragraph(observations or "Aucune observation.", body))
    story.append(Spacer(1, 0.4*cm))

    # Recommendations
    if recommandations:
        story.append(Paragraph("<b>Recommandations :</b>", ParagraphStyle("h3r", parent=body, textColor=BLEU, fontSize=12, spaceAfter=6)))
        story.append(Paragraph(recommandations, body))
        story.append(Spacer(1, 0.4*cm))

    # Photos count
    if photos:
        story.append(Paragraph(f"<b>Pieces jointes :</b> {len(photos)} photo(s) d'inspection", ParagraphStyle("photos", parent=body, textColor=BLEU, fontSize=11)))
        story.append(Spacer(1, 0.4*cm))

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=VERT))
    story.append(Paragraph(
        f"Rapport genere le {datetime.utcnow().strftime('%d/%m/%Y a %H:%M UTC')}",
        ParagraphStyle("footer", parent=center, fontSize=9, textColor=colors.gray, spaceBefore=8),
    ))
    story.append(Paragraph(
        "Direction de l'Inspection Industrielle",
        ParagraphStyle("sig", parent=center, fontSize=10, textColor=BLEU, fontName="Helvetica-Bold", spaceBefore=8),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
