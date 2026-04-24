"""PNPI · Detection d'anomalies et alertes intelligentes.

Detecte les situations anormales basees sur les ecarts statistiques:
- Pic de soumissions (>2x la moyenne)
- Chute du taux d'approbation
- Concentration anormale dans un secteur
- Instructeur avec charge desequilibree
- Operateur avec rejets repetitifs
"""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM


def detect_anomalies(db: Session) -> list[dict]:
    """Run all anomaly detectors and return alerts."""
    try:
        now = now_utc()
        all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
        alerts = []

        # 1. Submission spike
        last_7d = [a for a in all_atis if (now - a.date_soumission).days <= 7]
        prev_7d = [a for a in all_atis if 7 < (now - a.date_soumission).days <= 14]
        if prev_7d and len(last_7d) > len(prev_7d) * 2:
            alerts.append(
                {
                    "type": "submission_spike",
                    "severity": "warning",
                    "title": "Pic de soumissions detecte",
                    "detail": f"{len(last_7d)} soumissions cette semaine vs {len(prev_7d)} la semaine precedente ({len(last_7d) / max(len(prev_7d), 1):.1f}x).",
                    "recommendation": "Verifier si un evenement externe explique ce pic. Anticiper la charge de travail.",
                }
            )

        # 2. Approval rate drop
        last_30d = [
            a
            for a in all_atis
            if a.statut in ("approuve", "rejete") and a.date_decision and (now - a.date_decision).days <= 30
        ]
        prev_30d = [
            a
            for a in all_atis
            if a.statut in ("approuve", "rejete") and a.date_decision and 30 < (now - a.date_decision).days <= 60
        ]
        if len(last_30d) >= 5 and len(prev_30d) >= 5:
            recent_rate = sum(1 for a in last_30d if a.statut == "approuve") / max(len(last_30d), 1) * 100
            prev_rate = sum(1 for a in prev_30d if a.statut == "approuve") / max(len(prev_30d), 1) * 100
            if recent_rate < prev_rate - 20:
                alerts.append(
                    {
                        "type": "approval_rate_drop",
                        "severity": "high",
                        "title": "Chute du taux d'approbation",
                        "detail": f"Taux passe de {prev_rate:.0f}% a {recent_rate:.0f}% (-{prev_rate - recent_rate:.0f} points).",
                        "recommendation": "Analyser les causes de rejet. Possible probleme de qualite des dossiers ou changement de criteres.",
                    }
                )

        # 3. Sector concentration
        sector_counts = defaultdict(int)
        for a in last_7d:
            sector_counts[a.secteur] += 1
        if last_7d:
            for sect, count in sector_counts.items():
                if count / max(len(last_7d), 1) > 0.6 and len(last_7d) >= 5:
                    alerts.append(
                        {
                            "type": "sector_concentration",
                            "severity": "info",
                            "title": f"Concentration sectorielle: {sect}",
                            "detail": f"{count}/{len(last_7d)} soumissions cette semaine dans le secteur {sect} ({count / max(len(last_7d), 1) * 100:.0f}%).",
                            "recommendation": "Verifier s'il s'agit d'une campagne sectorielle ou d'un biais.",
                        }
                    )

        # 4. Instructor workload imbalance
        instructor_loads = defaultdict(int)
        pending = [a for a in all_atis if a.statut not in ("approuve", "rejete", "expire")]
        for a in pending:
            instr = getattr(a, "instructeur_username", None)
            if instr:
                instructor_loads[instr] += 1
        if len(instructor_loads) >= 2:
            avg_load = sum(instructor_loads.values()) / max(len(instructor_loads), 1)
            for instr, load in instructor_loads.items():
                if load > avg_load * 2.5 and load >= 8:
                    alerts.append(
                        {
                            "type": "workload_imbalance",
                            "severity": "warning",
                            "title": f"Surcharge: {instr}",
                            "detail": f"{load} dossiers en cours (moyenne: {avg_load:.0f}).",
                            "recommendation": f"Redistribuer les dossiers de {instr} via le systeme de delegation.",
                        }
                    )

        # 5. Repeated rejections per operator
        op_rejections = defaultdict(int)
        recent_atis = [
            a for a in all_atis if a.statut == "rejete" and a.date_decision and (now - a.date_decision).days <= 90
        ]
        for a in recent_atis:
            op = getattr(a, "operateur", None)
            if op and getattr(op, "raison_sociale", None):
                op_rejections[op.raison_sociale] += 1
        for op_name, count in op_rejections.items():
            if count >= 3:
                alerts.append(
                    {
                        "type": "repeated_rejection",
                        "severity": "high",
                        "title": f"Rejets repetitifs: {op_name}",
                        "detail": f"{count} rejets dans les 90 derniers jours.",
                        "recommendation": "Contacter l'operateur pour un accompagnement. Possible besoin de formation.",
                    }
                )

        # 6. SLA breach wave
        overdue = [a for a in pending if (now.date() - a.date_soumission.date()).days > (a.sla_jours or 30)]
        if len(overdue) >= 5:
            alerts.append(
                {
                    "type": "sla_wave",
                    "severity": "critical",
                    "title": f"{len(overdue)} ATIs en depassement SLA",
                    "detail": f"{len(overdue)} dossiers ont depasse leur echeance SLA simultanement.",
                    "recommendation": "Mobilisation urgente. Considerer un plan de rattrapage ou des delegations temporaires.",
                }
            )

        alerts.sort(key=lambda a: {"critical": 0, "high": 1, "warning": 2, "info": 3}.get(a["severity"], 4))
        return alerts
    except Exception:
        return []
