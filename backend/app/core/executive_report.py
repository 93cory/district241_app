"""PNPI — Generation automatique du rapport executif hebdomadaire."""
from __future__ import annotations

import io
from datetime import timedelta
from collections import defaultdict
from typing import Dict, List

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from ..database import now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)
from ..models.core import AuditEventORM, UserAccountORM


BLEU = colors.HexColor("#003F8F")
VERT = colors.HexColor("#006233")
OR = colors.HexColor("#F5D30F")
ROUGE = colors.HexColor("#B42318")

_TERMINAL = {"approuve", "rejete", "expire"}


def generate_executive_report(db: Session) -> bytes:
    """Generate the weekly executive PDF report."""
    now = now_utc()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Fetch data
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    # KPIs
    total_atis = len(all_atis)
    active_atis = sum(1 for a in all_atis if a.statut not in _TERMINAL)
    week_submissions = sum(1 for a in all_atis if a.date_soumission >= week_ago)
    week_decisions = sum(1 for a in all_atis if a.date_decision and a.date_decision >= week_ago)
    month_approvals = sum(1 for a in all_atis if a.statut == "approuve" and a.date_decision and a.date_decision >= month_ago)

    overdue = sum(
        1 for a in all_atis
        if a.statut not in _TERMINAL and (now.date() - a.date_soumission.date()).days > a.sla_jours
    )

    # SLA compliance
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    if decided:
        compliant = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)
        sla_pct = round(compliant / len(decided) * 100, 1)
    else:
        sla_pct = 0.0

    # Operators
    ops_actifs = sum(1 for o in all_ops if o.is_active)
    emplois = sum(o.effectif_declare or 0 for o in all_ops)

    # Inspections this month
    month_inspections = sum(1 for i in all_inspections if i.date_inspection >= month_ago)
    conformes = sum(1 for i in all_inspections if i.date_inspection >= month_ago and i.statut_conformite == "conforme")
    taux_conf = round(conformes / month_inspections * 100, 1) if month_inspections else 0.0

    # Sector breakdown
    sector_counts: Dict[str, int] = defaultdict(int)
    sector_emplois: Dict[str, int] = defaultdict(int)
    for op in all_ops:
        if op.is_active:
            sector_counts[op.secteur] += 1
            sector_emplois[op.secteur] += op.effectif_declare or 0

    # Province breakdown
    province_counts: Dict[str, int] = defaultdict(int)
    for op in all_ops:
        if op.is_active:
            province_counts[op.province] += 1

    # Pipeline
    pipeline: Dict[str, int] = defaultdict(int)
    for a in all_atis:
        pipeline[a.statut] += 1

    # National Transformation Index (simplified)
    nti = _compute_national_index(all_atis, all_ops, all_inspections)

    # Build PDF
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle("header", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray)
    ministry_style = ParagraphStyle("ministry", parent=styles["Normal"], alignment=TA_CENTER, fontSize=10, textColor=BLEU, fontName="Helvetica-Bold")
    title_style = ParagraphStyle("report_title", parent=styles["Title"], textColor=BLEU, fontSize=18, spaceAfter=4)
    section_style = ParagraphStyle("section", parent=styles["Heading2"], textColor=BLEU, fontSize=13, spaceAfter=6, spaceBefore=12)
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=10, leading=14)
    footer_style = ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray)

    story = []

    # Header
    story.append(Paragraph("REPUBLIQUE GABONAISE", header_style))
    story.append(Paragraph("Union — Travail — Justice", ParagraphStyle("motto", parent=header_style, fontSize=8, fontName="Helvetica-Oblique")))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Ministere de l'Industrie et de la Transformation Locale", ministry_style))
    story.append(Paragraph("Plateforme Nationale de la Politique Industrielle", ParagraphStyle("pnpi", parent=ministry_style, fontSize=9)))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=BLEU))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("RAPPORT EXECUTIF HEBDOMADAIRE", title_style))
    story.append(Paragraph(f"Semaine du {week_ago.strftime('%d/%m/%Y')} au {now.strftime('%d/%m/%Y')}", ParagraphStyle("date", parent=body_style, textColor=colors.gray, fontSize=9)))
    story.append(Paragraph("CONFIDENTIEL — Document officiel PNPI", ParagraphStyle("conf", parent=body_style, textColor=ROUGE, fontSize=8, fontName="Helvetica-Bold")))
    story.append(Spacer(1, 0.6*cm))

    # National Index
    story.append(Paragraph("Indice National de Transformation Locale", section_style))
    nti_color = VERT if nti >= 70 else OR if nti >= 50 else ROUGE
    story.append(Paragraph(f"<font size='28' color='{nti_color}'><b>{nti}</b></font><font size='12'> / 100</font>", ParagraphStyle("nti", parent=body_style, alignment=TA_CENTER, spaceAfter=12)))

    # KPI Table
    story.append(Paragraph("Indicateurs Cles de Performance", section_style))
    kpi_data = [
        ["Indicateur", "Valeur", "Tendance"],
        ["Total ATI deposees", str(total_atis), f"+{week_submissions} cette semaine"],
        ["ATI en cours de traitement", str(active_atis), ""],
        ["Decisions cette semaine", str(week_decisions), ""],
        ["Approbations ce mois", str(month_approvals), ""],
        ["ATI en retard SLA", str(overdue), "ATTENTION" if overdue > 3 else "OK"],
        ["Taux conformite SLA", f"{sla_pct}%", ""],
        ["Operateurs actifs", str(ops_actifs), f"{emplois} emplois declares"],
        ["Inspections ce mois", str(month_inspections), f"{taux_conf}% conformes"],
    ]
    t = Table(kpi_data, colWidths=[7*cm, 4*cm, 5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLEU),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))

    # Pipeline
    story.append(Paragraph("Pipeline ATI", section_style))
    pipeline_data = [
        ["Soumis", "En instruction", "En validation", "Approuve", "Rejete", "Expire"],
        [str(pipeline.get("soumis", 0)), str(pipeline.get("en_instruction", 0)),
         str(pipeline.get("en_validation", 0)), str(pipeline.get("approuve", 0)),
         str(pipeline.get("rejete", 0)), str(pipeline.get("expire", 0))],
    ]
    t2 = Table(pipeline_data, colWidths=[2.6*cm]*6)
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VERT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.6*cm))

    # Sector table
    story.append(Paragraph("Repartition Sectorielle", section_style))
    sector_data = [["Secteur", "Operateurs", "Emplois declares"]]
    for sect in sorted(sector_counts.keys()):
        sector_data.append([sect.capitalize(), str(sector_counts[sect]), str(sector_emplois[sect])])
    t3 = Table(sector_data, colWidths=[6*cm, 4*cm, 5*cm])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLEU),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
    ]))
    story.append(t3)
    story.append(Spacer(1, 0.4*cm))

    # Province table
    story.append(Paragraph("Couverture Provinciale", section_style))
    prov_data = [["Province", "Operateurs actifs"]]
    for prov in sorted(province_counts.keys()):
        prov_data.append([prov.replace("_", " ").title(), str(province_counts[prov])])
    t4 = Table(prov_data, colWidths=[8*cm, 5*cm])
    t4.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VERT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
    ]))
    story.append(t4)

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=BLEU))
    story.append(Paragraph(f"Document genere automatiquement par la PNPI — {now.strftime('%d/%m/%Y %H:%M')} UTC", footer_style))
    story.append(Paragraph("Ministere de l'Industrie et de la Transformation Locale du Gabon", footer_style))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def _compute_national_index(atis, ops, inspections) -> float:
    """
    Calcul simplifie de l'Indice National de Transformation Locale (INTL).
    Score 0-100 base sur :
    - Taux d'approbation ATI (30%)
    - Couverture sectorielle (20%)
    - Taux de conformite inspections (25%)
    - Densite operateurs actifs (15%)
    - Dynamisme (nouvelles soumissions 30j) (10%)
    """
    now = now_utc()
    month_ago = now - timedelta(days=30)

    # 1. Taux approbation (30 pts max)
    decided = [a for a in atis if a.statut in {"approuve", "rejete"}]
    approved = sum(1 for a in decided if a.statut == "approuve")
    approbation_score = (approved / len(decided) * 30) if decided else 0

    # 2. Couverture sectorielle (20 pts max) — 7 secteurs cibles
    sectors_with_ops = len(set(o.secteur for o in ops if o.is_active))
    sector_score = min(sectors_with_ops / 7 * 20, 20)

    # 3. Taux conformite inspections (25 pts max)
    recent_insp = [i for i in inspections if i.date_inspection >= month_ago]
    if recent_insp:
        conformes = sum(1 for i in recent_insp if i.statut_conformite == "conforme")
        conformite_score = conformes / len(recent_insp) * 25
    else:
        conformite_score = 0

    # 4. Densite operateurs (15 pts max) — cible 100 operateurs actifs
    actifs = sum(1 for o in ops if o.is_active)
    densite_score = min(actifs / 100 * 15, 15)

    # 5. Dynamisme (10 pts max) — soumissions recentes
    recent_subs = sum(1 for a in atis if a.date_soumission >= month_ago)
    dynamisme_score = min(recent_subs / 20 * 10, 10)

    total = approbation_score + sector_score + conformite_score + densite_score + dynamisme_score
    return round(total, 1)
