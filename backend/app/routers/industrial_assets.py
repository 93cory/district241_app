"""PNPI · Investissements industriels et zones industrielles."""

from __future__ import annotations

from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import ONIPeriodicDeclarationORM, OperateurIndustrielORM, RINInvestissementORM, RINSiteIndustrielORM

router = APIRouter(prefix="/pnpi/pilotage-actifs", tags=["Investissements & zones industrielles"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur)


def _label(value: str | None) -> str:
    if not value:
        return "non_precise"
    return value.strip().lower().replace(" ", "_")


@router.get("/investissements")
async def get_investissements_cockpit(
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    investments = (
        db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
    )
    operators = {
        op.id: op
        for op in db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.deleted_at.is_(None)))
        .scalars()
        .all()
    }

    total_fcfa = sum(item.montant_fcfa or 0 for item in investments)
    expected_jobs = sum(item.emplois_prevus or 0 for item in investments)
    status_counts = Counter(_label(item.statut) for item in investments)
    by_year: dict[int, dict[str, int]] = defaultdict(lambda: {"count": 0, "montant_fcfa": 0, "emplois_prevus": 0})
    by_sector: dict[str, dict[str, int]] = defaultdict(lambda: {"count": 0, "montant_fcfa": 0, "emplois_prevus": 0})
    by_province: dict[str, dict[str, int]] = defaultdict(lambda: {"count": 0, "montant_fcfa": 0, "emplois_prevus": 0})

    for item in investments:
        op = operators.get(item.operateur_id)
        sector = _label(op.secteur if op else None)
        province = _label(op.province if op else None)
        amount = item.montant_fcfa or 0
        jobs = item.emplois_prevus or 0
        if item.annee:
            by_year[item.annee]["count"] += 1
            by_year[item.annee]["montant_fcfa"] += amount
            by_year[item.annee]["emplois_prevus"] += jobs
        by_sector[sector]["count"] += 1
        by_sector[sector]["montant_fcfa"] += amount
        by_sector[sector]["emplois_prevus"] += jobs
        by_province[province]["count"] += 1
        by_province[province]["montant_fcfa"] += amount
        by_province[province]["emplois_prevus"] += jobs

    portfolio_score = min(
        100,
        round(
            (min(40, len(investments) * 4))
            + (min(25, total_fcfa / 1_000_000_000 * 4))
            + (min(20, expected_jobs / 100))
            + (15 if len(by_province) >= 4 else len(by_province) * 3),
            1,
        ),
    )

    return {
        "generated_at": now_utc().isoformat(),
        "score_portefeuille": portfolio_score,
        "stats": {
            "projets": len(investments),
            "montant_fcfa": total_fcfa,
            "emplois_prevus": expected_jobs,
            "provinces": len(by_province),
            "secteurs": len(by_sector),
        },
        "statuts": [{"statut": key, "count": value} for key, value in status_counts.most_common()],
        "par_annee": [{"annee": year, **values} for year, values in sorted(by_year.items(), reverse=True)],
        "par_secteur": [
            {"secteur": key, **value}
            for key, value in sorted(by_sector.items(), key=lambda item: item[1]["montant_fcfa"], reverse=True)
        ],
        "par_province": [
            {"province": key, **value}
            for key, value in sorted(by_province.items(), key=lambda item: item[1]["montant_fcfa"], reverse=True)
        ],
        "projets": [
            {
                "id": item.id,
                "intitule": item.intitule,
                "operateur": operators.get(item.operateur_id).raison_sociale
                if operators.get(item.operateur_id)
                else "Non précisé",
                "secteur": _label(
                    operators.get(item.operateur_id).secteur if operators.get(item.operateur_id) else None
                ),
                "province": _label(
                    operators.get(item.operateur_id).province if operators.get(item.operateur_id) else None
                ),
                "montant_fcfa": item.montant_fcfa or 0,
                "emplois_prevus": item.emplois_prevus or 0,
                "statut": item.statut,
                "annee": item.annee,
            }
            for item in sorted(investments, key=lambda row: row.montant_fcfa or 0, reverse=True)[:12]
        ],
        "recommendations": [
            "Relier chaque investissement aux besoins fonciers, énergétiques, compétences et autorisations.",
            "Créer un pipeline officiel : idée → étude → financement → autorisations → chantier → exploitation.",
            "Afficher les impacts attendus : emplois, production, exportations, substitution aux importations.",
        ],
        "lecture_executive": (
            "Le cockpit investissements transforme les projets déclarés dans le RIN en portefeuille national : "
            "montants, emplois, territoires, secteurs et statuts deviennent visibles pour arbitrer les priorités."
        ),
        "requested_by": current_user.username,
    }


@router.get("/zones")
async def get_zones_cockpit(
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    sites = db.execute(select(RINSiteIndustrielORM).where(RINSiteIndustrielORM.deleted_at.is_(None))).scalars().all()
    operators = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.deleted_at.is_(None))).scalars().all()
    )
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()

    operators_by_province = Counter(_label(op.province) for op in operators)
    sites_by_province = Counter(_label(site.province) for site in sites)
    surface_by_province: dict[str, float] = defaultdict(float)
    for site in sites:
        surface_by_province[_label(site.province)] += site.superficie_ha or 0

    energy_by_sector: dict[str, float] = defaultdict(float)
    for row in declarations:
        energy_by_sector[_label(row.secteur)] += row.energy_kwh or 0

    zones = []
    for province in sorted(set(operators_by_province) | set(sites_by_province)):
        operators_count = operators_by_province.get(province, 0)
        sites_count = sites_by_province.get(province, 0)
        surface = round(surface_by_province.get(province, 0), 2)
        occupancy_proxy = min(100, round((sites_count / max(1, operators_count)) * 100, 1))
        zones.append(
            {
                "province": province,
                "operateurs": operators_count,
                "sites": sites_count,
                "superficie_ha": surface,
                "taux_occupation_proxy": occupancy_proxy,
                "niveau_priorite": "haute" if operators_count >= 5 and sites_count < operators_count else "normale",
            }
        )
    zones.sort(key=lambda item: (item["niveau_priorite"] == "haute", item["operateurs"]), reverse=True)

    return {
        "generated_at": now_utc().isoformat(),
        "score_zones": min(
            100, round(len(sites) * 4 + len(operators_by_province) * 5 + sum(surface_by_province.values()) / 10, 1)
        ),
        "stats": {
            "sites": len(sites),
            "operateurs": len(operators),
            "provinces": len(operators_by_province),
            "superficie_ha": round(sum(surface_by_province.values()), 2),
            "secteurs_energie_suivis": len(energy_by_sector),
        },
        "zones": zones,
        "energie_par_secteur": [
            {"secteur": key, "energie_kwh": round(value, 2)}
            for key, value in sorted(energy_by_sector.items(), key=lambda item: item[1], reverse=True)
        ],
        "recommendations": [
            "Formaliser un référentiel zone → parcelle → infrastructure → entreprise.",
            "Ajouter disponibilité foncière, eau, énergie, voirie, fibre et contraintes environnementales.",
            "Relier les zones aux investissements, aux filières et aux risques climatiques.",
        ],
        "lecture_executive": (
            "Le cockpit zones donne une première lecture territoriale : sites industriels, concentration "
            "d'opérateurs, surfaces déclarées et besoins d'aménagement deviennent comparables par province."
        ),
        "requested_by": current_user.username,
    }
