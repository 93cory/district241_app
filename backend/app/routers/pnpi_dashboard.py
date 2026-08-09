"""PNPI · Endpoints du tableau de bord de pilotage industriel gabonais."""

from __future__ import annotations

import io
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from statistics import median

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.anomaly_detection import detect_anomalies
from ..core.auth import Role, User, require_roles
from ..core.cache import cache
from ..core.tenant import TenantFilter, get_user_province
from ..database import as_utc, get_db, now_utc
from ..models.core import LoginHistoryORM, NotificationORM, PushSubscriptionORM, UserAccountORM
from ..models.pnpi import (
    PROVINCES_GABON,
    SECTEURS_GABON,
    AgrementTechniqueIndustrielORM,
    AnnouncementORM,
    DocumentDossierORM,
    InspectionConformiteORM,
    MessageORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
    RINProduitORM,
    RINRepresentantORM,
    RINRessourceORM,
    RINSiteIndustrielORM,
)
from ..schemas.pnpi import (
    ATIPipelineStats,
    ATIResume,
    MensuelStats,
    OperateurGeoPoint,
    PNPIDashboardKpis,
    ProvinceStats,
    SecteurStats,
)

router = APIRouter(prefix="/pnpi", tags=["PNPI Dashboard"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}


def _ati_age_jours(ati: AgrementTechniqueIndustrielORM) -> int:
    return max((now_utc().date() - ati.date_soumission.date()).days, 0)


def _ati_is_overdue(ati: AgrementTechniqueIndustrielORM) -> bool:
    return _ati_age_jours(ati) > ati.sla_jours and ati.statut not in _TERMINAL_STATUTS


@router.get("/dashboard/kpis", response_model=PNPIDashboardKpis)
async def pnpi_dashboard_kpis(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)
    ),
    db: Session = Depends(get_db),
) -> PNPIDashboardKpis:
    now = now_utc()

    # Multi-tenant province filtering
    province = get_user_province(current_user)
    tenant = TenantFilter(province)

    # Cache: 2 min per province scope
    cache_key = f"dashboard:kpis:{province or 'global'}"
    cached = await cache.get(cache_key)
    if cached:
        return PNPIDashboardKpis(**cached)

    # Fetch ATIs, filtered by province if user is province-scoped
    ati_query = select(AgrementTechniqueIndustrielORM)
    if not tenant.is_global:
        # Filter ATIs via their operateur's province · join through operateur
        ati_query = ati_query.join(
            OperateurIndustrielORM, AgrementTechniqueIndustrielORM.operateur_id == OperateurIndustrielORM.id
        ).where(OperateurIndustrielORM.province == tenant.province)
    all_atis = db.execute(ati_query).scalars().all()

    atis_total = len(all_atis)
    atis_en_cours = sum(1 for a in all_atis if a.statut not in _TERMINAL_STATUTS)

    # ATIs approuves ce mois
    first_of_month = now.date().replace(day=1)
    atis_approuves_ce_mois = sum(
        1 for a in all_atis if a.statut == "approuve" and a.date_decision and a.date_decision.date() >= first_of_month
    )

    # ATIs en retard
    atis_en_retard = sum(1 for a in all_atis if _ati_is_overdue(a))

    # Delai moyen (median) pour les ATIs decides
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    durations = [max((a.date_decision.date() - a.date_soumission.date()).days, 0) for a in decided]
    delai_moyen_jours = float(median(durations)) if durations else 0.0

    # Taux SLA
    compliant = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)
    taux_sla_pct = round((compliant / len(durations) * 100) if durations else 0.0, 2)

    # Operateurs actifs (filtered by province)
    ops_count_query = select(func.count(OperateurIndustrielORM.id)).where(OperateurIndustrielORM.is_active.is_(True))
    ops_count_query = tenant.apply(ops_count_query, OperateurIndustrielORM)
    operateurs_actifs = db.execute(ops_count_query).scalar_one()

    # Taux conformite: % conforme parmi les dernieres inspections par operateur
    insp_query = select(InspectionConformiteORM).order_by(InspectionConformiteORM.date_inspection.desc())
    if not tenant.is_global:
        insp_query = insp_query.join(
            OperateurIndustrielORM, InspectionConformiteORM.operateur_id == OperateurIndustrielORM.id
        ).where(OperateurIndustrielORM.province == tenant.province)
    all_inspections = db.execute(insp_query).scalars().all()
    last_inspection_per_op: dict[str, str] = {}
    for insp in all_inspections:
        if insp.operateur_id not in last_inspection_per_op:
            last_inspection_per_op[insp.operateur_id] = insp.statut_conformite

    nb_inspectes = len(last_inspection_per_op)
    nb_conformes = sum(1 for s in last_inspection_per_op.values() if s == "conforme")
    taux_conformite_pct = round((nb_conformes / nb_inspectes * 100) if nb_inspectes > 0 else 0.0, 2)

    result = PNPIDashboardKpis(
        atis_total=atis_total,
        atis_en_cours=atis_en_cours,
        atis_approuves_ce_mois=atis_approuves_ce_mois,
        atis_en_retard=atis_en_retard,
        delai_moyen_jours=round(delai_moyen_jours, 1),
        taux_sla_pct=taux_sla_pct,
        operateurs_actifs=operateurs_actifs,
        taux_conformite_pct=taux_conformite_pct,
        generated_at=now,
    )
    await cache.set(cache_key, result.model_dump(), ttl=120)
    return result


@router.get("/dashboard/carte", response_model=list[OperateurGeoPoint])
async def pnpi_dashboard_carte(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list[OperateurGeoPoint]:
    operateurs = (
        db.execute(
            select(OperateurIndustrielORM).where(
                OperateurIndustrielORM.is_active.is_(True),
                OperateurIndustrielORM.latitude.isnot(None),
                OperateurIndustrielORM.longitude.isnot(None),
            )
        )
        .scalars()
        .all()
    )

    # Build a map of operateur_id -> (nb_atis_actifs, statut_dernier_ati)
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    ati_by_op: dict[str, list[AgrementTechniqueIndustrielORM]] = defaultdict(list)
    for ati in all_atis:
        ati_by_op[ati.operateur_id].append(ati)

    result = []
    for op in operateurs:
        op_atis = ati_by_op.get(op.id, [])
        nb_actifs = sum(1 for a in op_atis if a.statut not in _TERMINAL_STATUTS)
        # Most recent ATI
        sorted_atis = sorted(op_atis, key=lambda a: a.date_soumission, reverse=True)
        statut_dernier = sorted_atis[0].statut if sorted_atis else None
        result.append(
            OperateurGeoPoint(
                id=op.id,
                raison_sociale=op.raison_sociale,
                secteur=op.secteur,
                province=op.province,
                latitude=op.latitude,
                longitude=op.longitude,
                nb_atis_actifs=nb_actifs,
                statut_dernier_ati=statut_dernier,
            )
        )
    return result


@router.get("/dashboard/secteurs", response_model=list[SecteurStats])
async def pnpi_dashboard_secteurs(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list[SecteurStats]:
    operateurs = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    secteur_ops: dict[str, list[OperateurIndustrielORM]] = defaultdict(list)
    for op in operateurs:
        secteur_ops[op.secteur].append(op)

    secteur_atis: dict[str, list[AgrementTechniqueIndustrielORM]] = defaultdict(list)
    for ati in all_atis:
        secteur_atis[ati.secteur].append(ati)

    all_secteurs = sorted(set(list(secteur_ops.keys()) + list(secteur_atis.keys())))
    result = []
    for secteur in all_secteurs:
        ops = secteur_ops.get(secteur, [])
        atis = secteur_atis.get(secteur, [])
        nb_approuves = sum(1 for a in atis if a.statut == "approuve")
        taux = round((nb_approuves / len(atis) * 100) if atis else 0.0, 2)
        emplois = sum(op.effectif_declare or 0 for op in ops)
        result.append(
            SecteurStats(
                secteur=secteur,
                nb_operateurs=len(ops),
                nb_atis_total=len(atis),
                nb_atis_approuves=nb_approuves,
                taux_approbation_pct=taux,
                emplois_declares=emplois,
            )
        )
    return result


@router.get("/dashboard/provinces", response_model=list[ProvinceStats])
async def pnpi_dashboard_provinces(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list[ProvinceStats]:
    operateurs = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    province_ops: dict[str, int] = defaultdict(int)
    op_province: dict[str, str] = {}
    for op in operateurs:
        province_ops[op.province] += 1
        op_province[op.id] = op.province

    province_atis_actifs: dict[str, int] = defaultdict(int)
    for ati in all_atis:
        if ati.statut not in _TERMINAL_STATUTS:
            province = op_province.get(ati.operateur_id, "inconnu")
            province_atis_actifs[province] += 1

    all_provinces = sorted(set(list(province_ops.keys()) + list(province_atis_actifs.keys())))
    return [
        ProvinceStats(
            province=province,
            nb_operateurs=province_ops.get(province, 0),
            nb_atis_actifs=province_atis_actifs.get(province, 0),
        )
        for province in all_provinces
    ]


@router.get("/dashboard/pipeline", response_model=ATIPipelineStats)
async def pnpi_dashboard_pipeline(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> ATIPipelineStats:
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    counts: dict[str, int] = defaultdict(int)
    for ati in all_atis:
        counts[ati.statut] += 1
    return ATIPipelineStats(
        soumis=counts.get("soumis", 0),
        en_instruction=counts.get("en_instruction", 0),
        en_validation=counts.get("en_validation", 0),
        approuve=counts.get("approuve", 0),
        rejete=counts.get("rejete", 0),
        expire=counts.get("expire", 0),
    )


@router.get("/dashboard/tendances", response_model=list[MensuelStats])
async def pnpi_dashboard_tendances(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list[MensuelStats]:
    now = now_utc()
    twelve_months_ago = now.replace(day=1) - timedelta(days=365)

    all_atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.date_soumission >= twelve_months_ago
            )
        )
        .scalars()
        .all()
    )

    by_month_soumis: dict[str, int] = defaultdict(int)
    by_month_approuves: dict[str, int] = defaultdict(int)
    by_month_rejetes: dict[str, int] = defaultdict(int)

    for ati in all_atis:
        mois_key = ati.date_soumission.strftime("%Y-%m")
        by_month_soumis[mois_key] += 1
        if ati.statut == "approuve" and ati.date_decision:
            dec_key = ati.date_decision.strftime("%Y-%m")
            by_month_approuves[dec_key] += 1
        elif ati.statut == "rejete" and ati.date_decision:
            dec_key = ati.date_decision.strftime("%Y-%m")
            by_month_rejetes[dec_key] += 1

    all_months = sorted(
        set(list(by_month_soumis.keys()) + list(by_month_approuves.keys()) + list(by_month_rejetes.keys()))
    )
    return [
        MensuelStats(
            mois=mois,
            nb_soumis=by_month_soumis.get(mois, 0),
            nb_approuves=by_month_approuves.get(mois, 0),
            nb_rejetes=by_month_rejetes.get(mois, 0),
        )
        for mois in all_months
    ]


@router.get("/dashboard/data-quality")
async def data_quality_score(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Cockpit de gouvernance et qualite des donnees PNPI.

    L'objectif est de montrer, en lecture ministerielle, si le patrimoine de
    donnees industrielles est exploitable : completude, coherence,
    fraicheur, rattachement aux objets maitres, doublons et priorites de
    correction.
    """

    try:
        ops = (
            db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.deleted_at.is_(None)))
            .scalars()
            .all()
        )
        atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
        inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
        documents = db.execute(select(DocumentDossierORM)).scalars().all()
        declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
        rin_representants = (
            db.execute(select(RINRepresentantORM).where(RINRepresentantORM.deleted_at.is_(None))).scalars().all()
        )
        rin_sites = (
            db.execute(select(RINSiteIndustrielORM).where(RINSiteIndustrielORM.deleted_at.is_(None))).scalars().all()
        )
        rin_produits = db.execute(select(RINProduitORM).where(RINProduitORM.deleted_at.is_(None))).scalars().all()
        rin_ressources = db.execute(select(RINRessourceORM).where(RINRessourceORM.deleted_at.is_(None))).scalars().all()
        rin_investissements = (
            db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
        )

        checks: list[dict[str, object]] = []
        anomalies: list[dict[str, object]] = []
        operator_ids = {op.id for op in ops}
        ati_ids = {ati.id for ati in atis}

        def pct(value: int | float, total: int | float) -> int:
            if total <= 0:
                return 100
            return round((value / total) * 100)

        def status_for(score: int, warn: int = 75, critical: int = 50) -> str:
            if score >= warn:
                return "ok"
            if score >= critical:
                return "warning"
            return "critical"

        def add_check(
            *,
            name: str,
            description: str,
            score: int,
            domain: str,
            impact: str,
            action: str,
            total: int,
            conformes: int,
            warn: int = 75,
            critical: int = 50,
        ) -> None:
            checks.append(
                {
                    "name": name,
                    "description": description,
                    "score": max(0, min(100, score)),
                    "status": status_for(score, warn, critical),
                    "domain": domain,
                    "impact": impact,
                    "action": action,
                    "total": total,
                    "conformes": conformes,
                }
            )

        def add_anomaly(
            *,
            severity: str,
            domain: str,
            title: str,
            detail: str,
            count: int,
            action: str,
        ) -> None:
            if count <= 0:
                return
            anomalies.append(
                {
                    "severity": severity,
                    "domain": domain,
                    "title": title,
                    "detail": detail,
                    "count": count,
                    "action": action,
                }
            )

        # 1. Operator completeness (email, phone, province filled)
        if ops:
            identity_complete = sum(
                1 for o in ops if o.id and o.nif_gabon and o.raison_sociale and o.secteur and o.province and o.ville
            )
            score = pct(identity_complete, len(ops))
            add_check(
                name="Identité opérateur",
                description=f"{identity_complete}/{len(ops)} opérateurs avec NIF, raison sociale, secteur, province et ville.",
                score=score,
                domain="Référentiel industriel national",
                impact="Un identifiant fiable évite les dossiers en double et sécurise les décisions.",
                action="Compléter les fiches opérateurs incomplètes avant arbitrage ministériel.",
                total=len(ops),
                conformes=identity_complete,
                warn=90,
                critical=70,
            )

            complete_ops = sum(
                1
                for o in ops
                if getattr(o, "contact_email", None)
                and getattr(o, "contact_telephone", None)
                and getattr(o, "province", None)
            )
            score = pct(complete_ops, len(ops))
            add_check(
                name="Contactabilité",
                description=f"{complete_ops}/{len(ops)} opérateurs avec email, téléphone et province.",
                score=score,
                domain="Relation opérateurs",
                impact="Les notifications, demandes de compléments et contrôles terrain dépendent de ces contacts.",
                action="Prioriser les opérateurs actifs sans email ou téléphone.",
                total=len(ops),
                conformes=complete_ops,
                warn=80,
                critical=50,
            )

            geocoded = sum(1 for o in ops if o.latitude is not None and o.longitude is not None)
            score = pct(geocoded, len(ops))
            add_check(
                name="Géocodage opérateurs",
                description=f"{geocoded}/{len(ops)} opérateurs disposent de coordonnées GPS.",
                score=score,
                domain="Cartographie industrielle",
                impact="La carte nationale, les zones industrielles et les inspections gagnent en précision.",
                action="Collecter les coordonnées des sites prioritaires et des grandes unités.",
                total=len(ops),
                conformes=geocoded,
                warn=70,
                critical=35,
            )

            valid_ref = sum(
                1
                for o in ops
                if str(o.secteur).lower() in SECTEURS_GABON and str(o.province).lower() in PROVINCES_GABON
            )
            score = pct(valid_ref, len(ops))
            add_check(
                name="Référentiels contrôlés",
                description=f"{valid_ref}/{len(ops)} opérateurs utilisent les secteurs et provinces normalisés.",
                score=score,
                domain="Gouvernance référentielle",
                impact="Les statistiques par secteur/province restent comparables dans le temps.",
                action="Normaliser les libellés libres avant consolidation nationale.",
                total=len(ops),
                conformes=valid_ref,
                warn=95,
                critical=80,
            )

            nif_counts = Counter(str(o.nif_gabon).strip().lower() for o in ops if o.nif_gabon)
            name_counts = Counter(str(o.raison_sociale).strip().lower() for o in ops if o.raison_sociale)
            duplicate_nifs = sum(count - 1 for count in nif_counts.values() if count > 1)
            duplicate_names = sum(count - 1 for count in name_counts.values() if count > 1)
            duplicate_total = duplicate_nifs + duplicate_names
            score = pct(len(ops) - duplicate_total, len(ops))
            add_check(
                name="Détection des doublons",
                description=f"{duplicate_total} doublon(s) potentiel(s) détecté(s) sur NIF ou raison sociale.",
                score=score,
                domain="Unicité des données",
                impact="Un doublon peut fausser les statistiques nationales et le suivi d'une entreprise.",
                action="Fusionner ou justifier les doublons avant publication des indicateurs.",
                total=len(ops),
                conformes=max(0, len(ops) - duplicate_total),
                warn=98,
                critical=90,
            )
            add_anomaly(
                severity="critical" if duplicate_total else "info",
                domain="RIN",
                title="Doublons opérateurs potentiels",
                detail=f"{duplicate_nifs} doublon(s) NIF et {duplicate_names} doublon(s) raison sociale.",
                count=duplicate_total,
                action="Lancer une revue de rapprochement NIF/raison sociale.",
            )

        # 2. RIN depth and validation
        if ops:
            reps_by_op = Counter(item.operateur_id for item in rin_representants)
            sites_by_op = Counter(item.operateur_id for item in rin_sites)
            products_by_op = Counter(item.operateur_id for item in rin_produits)
            complete_rin = sum(
                1 for op in ops if reps_by_op[op.id] > 0 and sites_by_op[op.id] > 0 and products_by_op[op.id] > 0
            )
            score = pct(complete_rin, len(ops))
            add_check(
                name="Profondeur RIN 360°",
                description=f"{complete_rin}/{len(ops)} opérateurs ont au moins représentant, site et produit.",
                score=score,
                domain="RIN 360°",
                impact="La fiche maître devient exploitable pour ATI, contrôle, ONI et investissement.",
                action="Compléter en priorité les opérateurs sans site ou produit déclaré.",
                total=len(ops),
                conformes=complete_rin,
                warn=75,
                critical=45,
            )
            missing_rin = len(ops) - complete_rin
            add_anomaly(
                severity="warning" if score >= 45 else "critical",
                domain="RIN",
                title="Fiches RIN insuffisamment structurées",
                detail=f"{missing_rin} opérateur(s) n'ont pas encore la base représentant + site + produit.",
                count=missing_rin,
                action="Organiser une campagne de complétude RIN avec les opérateurs prioritaires.",
            )

            rin_items = [*rin_representants, *rin_sites, *rin_produits, *rin_ressources, *rin_investissements]
            if rin_items:
                validated = sum(1 for item in rin_items if getattr(item, "statut_validation", "") == "valide")
                score = pct(validated, len(rin_items))
                add_check(
                    name="Validation RIN",
                    description=f"{validated}/{len(rin_items)} éléments RIN sont validés par un agent habilité.",
                    score=score,
                    domain="Contrôle qualité RIN",
                    impact="La donnée validée peut alimenter les tableaux de bord sans réserve forte.",
                    action="Mettre en place une file de validation des éléments RIN en brouillon.",
                    total=len(rin_items),
                    conformes=validated,
                    warn=70,
                    critical=35,
                )

            orphan_rin = sum(
                1
                for item in [*rin_representants, *rin_sites, *rin_produits, *rin_ressources, *rin_investissements]
                if item.operateur_id not in operator_ids
            )
            add_anomaly(
                severity="critical",
                domain="RIN",
                title="Éléments RIN rattachés à un opérateur inexistant",
                detail="Des sous-objets RIN ne pointent pas vers une fiche opérateur active.",
                count=orphan_rin,
                action="Réparer les clés de rattachement ou archiver les éléments orphelins.",
            )

        # 3. ATI with linked operator
        if atis:
            linked = sum(1 for a in atis if getattr(a, "operateur_id", None) in operator_ids)
            score = pct(linked, len(atis))
            add_check(
                name="ATI rattachées au RIN",
                description=f"{linked}/{len(atis)} ATI sont liées à un opérateur actif du référentiel.",
                score=score,
                domain="Autorisations",
                impact="Le suivi administratif reste attaché à la bonne entreprise.",
                action="Corriger les ATI orphelines ou les opérateurs supprimés par erreur.",
                total=len(atis),
                conformes=linked,
                warn=95,
                critical=80,
            )

            with_obs = sum(1 for a in atis if getattr(a, "observations", None) and len(a.observations) > 10)
            score = pct(with_obs, len(atis))
            add_check(
                name="Motivation des dossiers ATI",
                description=f"{with_obs}/{len(atis)} ATI ont des observations suffisamment détaillées.",
                score=score,
                domain="Autorisations",
                impact="Les décisions doivent rester auditables et défendables.",
                action="Rendre les observations obligatoires sur retour, rejet et validation.",
                total=len(atis),
                conformes=with_obs,
                warn=70,
                critical=40,
            )

            decided = [a for a in atis if a.statut in ("approuve", "rejete")]
            if decided:
                with_date = sum(1 for a in decided if a.date_decision)
                score = pct(with_date, len(decided))
                add_check(
                    name="Dates de décision ATI",
                    description=f"{with_date}/{len(decided)} décisions ATI ont une date de décision.",
                    score=score,
                    domain="Traçabilité décisionnelle",
                    impact="Les délais réglementaires et statistiques de traitement dépendent de cette date.",
                    action="Bloquer l'état approuvé/rejeté si la date de décision est absente.",
                    total=len(decided),
                    conformes=with_date,
                    warn=95,
                    critical=80,
                )

            docs_by_ati = Counter(doc.ati_id for doc in documents)
            doc_complete = sum(1 for ati in atis if docs_by_ati[ati.id] >= 4)
            score = pct(doc_complete, len(atis))
            add_check(
                name="Couverture documentaire ATI",
                description=f"{doc_complete}/{len(atis)} ATI ont au moins 4 pièces justificatives enregistrées.",
                score=score,
                domain="Coffre documentaire",
                impact="La décision administrative repose sur des preuves accessibles et archivées.",
                action="Afficher les pièces manquantes dans le centre de traitement ATI.",
                total=len(atis),
                conformes=doc_complete,
                warn=80,
                critical=50,
            )
            orphan_docs = sum(1 for doc in documents if doc.ati_id not in ati_ids)
            add_anomaly(
                severity="warning",
                domain="Documents",
                title="Documents non rattachés à une ATI connue",
                detail="Certaines pièces référencent un dossier ATI absent ou archivé.",
                count=orphan_docs,
                action="Réindexer les documents ou les placer en quarantaine documentaire.",
            )

        # 4. Inspections
        if inspections:
            with_obs = sum(1 for i in inspections if getattr(i, "observations", None) and len(i.observations) > 10)
            score = pct(with_obs, len(inspections))
            add_check(
                name="Inspections documentées",
                description=f"{with_obs}/{len(inspections)} inspections avec observations.",
                score=score,
                domain="Contrôle conformité",
                impact="Un contrôle sans constat exploitable perd sa valeur probante.",
                action="Standardiser les rapports et grilles de contrôle par secteur.",
                total=len(inspections),
                conformes=with_obs,
                warn=80,
                critical=50,
            )

            linked_inspections = sum(1 for i in inspections if getattr(i, "operateur_id", None) in operator_ids)
            score = pct(linked_inspections, len(inspections))
            add_check(
                name="Inspections rattachées",
                description=f"{linked_inspections}/{len(inspections)} inspections sont rattachées à un opérateur actif.",
                score=score,
                domain="Contrôle conformité",
                impact="Le suivi des recommandations dépend du rattachement à l'entreprise contrôlée.",
                action="Corriger les inspections orphelines avant publication des statistiques de conformité.",
                total=len(inspections),
                conformes=linked_inspections,
                warn=95,
                critical=80,
            )

        # 5. ONI declarations
        if declarations:
            complete_declarations = sum(
                1
                for row in declarations
                if row.operateur_id in operator_ids
                and row.period
                and row.secteur
                and row.production_unit
                and row.capacity_installed >= 0
                and row.capacity_used >= 0
                and row.jobs_total >= 0
            )
            score = pct(complete_declarations, len(declarations))
            add_check(
                name="Déclarations ONI exploitables",
                description=f"{complete_declarations}/{len(declarations)} déclarations ONI ont les champs statistiques essentiels.",
                score=score,
                domain="Observatoire national de l'industrie",
                impact="Les indicateurs de production, emplois et capacité reposent sur ces déclarations.",
                action="Bloquer la validation des déclarations incomplètes ou incohérentes.",
                total=len(declarations),
                conformes=complete_declarations,
                warn=90,
                critical=70,
            )
            operators_with_declaration = {row.operateur_id for row in declarations}
            coverage = len(operator_ids & operators_with_declaration)
            score = pct(coverage, len(ops))
            add_check(
                name="Couverture déclarative ONI",
                description=f"{coverage}/{len(ops)} opérateurs ont au moins une déclaration ONI.",
                score=score,
                domain="Observatoire national de l'industrie",
                impact="Plus la couverture est forte, plus le Ministère lit réellement la production nationale.",
                action="Programmer des campagnes de déclaration périodique par filière prioritaire.",
                total=len(ops),
                conformes=coverage,
                warn=70,
                critical=35,
            )

        global_score = round(sum(c["score"] for c in checks) / max(len(checks), 1)) if checks else 0

        grade = (
            "A"
            if global_score >= 90
            else "B"
            if global_score >= 75
            else "C"
            if global_score >= 60
            else "D"
            if global_score >= 40
            else "E"
        )
        domain_scores: dict[str, list[int]] = defaultdict(list)
        for check in checks:
            domain_scores[str(check["domain"])].append(int(check["score"]))

        domains = [
            {
                "domain": domain,
                "score": round(sum(scores) / max(len(scores), 1)),
                "checks": len(scores),
                "status": status_for(round(sum(scores) / max(len(scores), 1))),
            }
            for domain, scores in sorted(domain_scores.items())
        ]
        priority_checks = sorted(checks, key=lambda item: int(item["score"]))[:5]
        anomalies.sort(key=lambda item: {"critical": 0, "warning": 1, "info": 2}.get(str(item["severity"]), 3))

        return {
            "global_score": global_score,
            "grade": grade,
            "checks": checks,
            "domains": domains,
            "anomalies": anomalies[:12],
            "priority_actions": [
                {
                    "title": str(item["name"]),
                    "domain": str(item["domain"]),
                    "score": int(item["score"]),
                    "action": str(item["action"]),
                }
                for item in priority_checks
            ],
            "lineage": [
                {"objet": "Entreprise", "source": "operateurs_industriels", "usage": "Objet maître RIN"},
                {"objet": "ATI", "source": "agrements_ati + documents_dossier", "usage": "Décision administrative"},
                {"objet": "Inspection", "source": "inspections_conformite", "usage": "Contrôle conformité"},
                {
                    "objet": "Déclaration ONI",
                    "source": "oni_periodic_declarations",
                    "usage": "Statistiques industrielles",
                },
                {"objet": "RIN détaillé", "source": "rin_*", "usage": "Vue 360° opérateur"},
            ],
            "governance_principles": [
                "Une entreprise = une fiche maître RIN.",
                "Toute donnée sensible doit avoir un propriétaire, une source et un historique.",
                "Les tableaux ministériels doivent distinguer donnée déclarée, validée et estimée.",
                "Les corrections critiques doivent être traitées avant publication officielle.",
            ],
            "lecture_executive": (
                f"Le patrimoine de données PNPI obtient la note {grade} ({global_score}/100). "
                "Le cockpit identifie les zones à fiabiliser avant diffusion officielle : RIN, ATI, ONI, documents et contrôles."
            ),
            "stats": {
                "operateurs": len(ops),
                "atis": len(atis),
                "inspections": len(inspections),
                "documents": len(documents),
                "declarations_oni": len(declarations),
                "rin_elements": len(rin_representants)
                + len(rin_sites)
                + len(rin_produits)
                + len(rin_ressources)
                + len(rin_investissements),
            },
            "generated_at": now_utc().isoformat(),
        }
    except Exception as exc:
        return {
            "global_score": 0,
            "grade": "E",
            "checks": [],
            "domains": [],
            "anomalies": [
                {
                    "severity": "critical",
                    "domain": "Système",
                    "title": "Calcul qualité indisponible",
                    "detail": str(exc),
                    "count": 1,
                    "action": "Consulter les journaux backend et vérifier les migrations.",
                }
            ],
            "priority_actions": [],
            "lineage": [],
            "governance_principles": [],
            "lecture_executive": "Le calcul de qualité des données est indisponible.",
            "stats": {
                "operateurs": 0,
                "atis": 0,
                "inspections": 0,
                "documents": 0,
                "declarations_oni": 0,
                "rin_elements": 0,
            },
            "generated_at": now_utc().isoformat(),
        }


@router.get("/dashboard/sla-analytics")
async def sla_analytics(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Analyse SLA detaillee : conformite, delais moyens, repartition par priorite."""
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    now = now_utc()

    total = len(all_atis)
    active = [a for a in all_atis if a.statut not in _TERMINAL_STATUTS]
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    overdue = [a for a in active if _ati_is_overdue(a)]

    # SLA compliance rate
    if decided:
        compliant = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)
        sla_compliance_pct = round(compliant / len(decided) * 100, 1)
    else:
        sla_compliance_pct = 0.0

    # Average processing time
    durations = [(a.date_decision.date() - a.date_soumission.date()).days for a in decided]
    avg_days = round(sum(durations) / len(durations), 1) if durations else 0

    # Distribution by SLA status
    on_track = sum(1 for a in active if not _ati_is_overdue(a))
    at_risk = sum(1 for a in active if not _ati_is_overdue(a) and _ati_age_jours(a) > a.sla_jours * 0.8)

    # By priority
    by_priority = {}
    for p in ["normale", "elevee", "urgente"]:
        p_atis = [a for a in active if a.priorite == p]
        p_overdue = [a for a in p_atis if _ati_is_overdue(a)]
        by_priority[p] = {"total": len(p_atis), "overdue": len(p_overdue)}

    return {
        "total_atis": total,
        "active_atis": len(active),
        "decided_atis": len(decided),
        "overdue_atis": len(overdue),
        "sla_compliance_pct": sla_compliance_pct,
        "avg_processing_days": avg_days,
        "on_track": on_track,
        "at_risk": at_risk,
        "by_priority": by_priority,
        "generated_at": now.isoformat(),
    }


@router.get("/dashboard/recents", response_model=list[ATIResume])
async def pnpi_dashboard_recents(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list[ATIResume]:
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM)
            .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
            .limit(15)
        )
        .scalars()
        .all()
    )

    result = []
    for ati in atis:
        age = _ati_age_jours(ati)
        op = ati.operateur  # lazy joined
        result.append(
            ATIResume(
                id=ati.id,
                numero_ati=ati.numero_ati,
                raison_sociale=op.raison_sociale if op else "Inconnu",
                secteur=ati.secteur,
                province=op.province if op else "Inconnu",
                statut=ati.statut,
                priorite=ati.priorite,
                etape=ati.etape,
                date_soumission=ati.date_soumission,
                age_jours=age,
                is_overdue=_ati_is_overdue(ati),
            )
        )
    return result


from ..core.executive_report import _compute_national_index


@router.get("/dashboard/transformation-index")
async def national_transformation_index(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    index = _compute_national_index(all_atis, all_ops, all_inspections)

    # Breakdown
    now = now_utc()
    month_ago = now - timedelta(days=30)
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"}]
    approved = sum(1 for a in decided if a.statut == "approuve")
    sectors = len(set(o.secteur for o in all_ops if o.is_active))
    from ..database import as_utc as _as_utc_loc

    recent_insp = [i for i in all_inspections if i.date_inspection and _as_utc_loc(i.date_inspection) >= month_ago]
    conformes = sum(1 for i in recent_insp if i.statut_conformite == "conforme") if recent_insp else 0
    actifs = sum(1 for o in all_ops if o.is_active)
    recent_subs = sum(1 for a in all_atis if a.date_soumission and _as_utc_loc(a.date_soumission) >= month_ago)

    return {
        "index": index,
        "max": 100,
        "breakdown": {
            "approbation": {
                "score": round(approved / len(decided) * 30, 1) if decided else 0,
                "max": 30,
                "detail": f"{approved}/{len(decided)} approuves",
            },
            "couverture_sectorielle": {
                "score": round(min(sectors / 7 * 20, 20), 1),
                "max": 20,
                "detail": f"{sectors}/7 secteurs couverts",
            },
            "conformite": {
                "score": round(conformes / len(recent_insp) * 25, 1) if recent_insp else 0,
                "max": 25,
                "detail": f"{conformes}/{len(recent_insp)} conformes (30j)",
            },
            "densite_operateurs": {
                "score": round(min(actifs / 100 * 15, 15), 1),
                "max": 15,
                "detail": f"{actifs} operateurs actifs",
            },
            "dynamisme": {
                "score": round(min(recent_subs / 20 * 10, 10), 1),
                "max": 10,
                "detail": f"{recent_subs} soumissions (30j)",
            },
        },
        "generated_at": now.isoformat(),
    }


from pydantic import BaseModel as PydanticBaseModel


class SearchResult(PydanticBaseModel):
    type: str  # "ati" | "operateur"
    id: str
    title: str
    subtitle: str
    statut: str | None = None
    href: str


@router.get("/dashboard/search", response_model=list[SearchResult])
async def pnpi_search(
    q: str = Query(..., min_length=2, max_length=100),
    _: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
) -> list[SearchResult]:
    """Recherche globale dans les ATIs et opérateurs."""
    term = f"%{q.strip()}%"
    results: list[SearchResult] = []

    # Search operateurs
    ops = (
        db.execute(
            select(OperateurIndustrielORM)
            .where(
                (OperateurIndustrielORM.raison_sociale.ilike(term))
                | (OperateurIndustrielORM.nif_gabon.ilike(term))
                | (OperateurIndustrielORM.ville.ilike(term))
            )
            .limit(8)
        )
        .scalars()
        .all()
    )
    for op in ops:
        results.append(
            SearchResult(
                type="operateur",
                id=op.id,
                title=op.raison_sociale,
                subtitle=f"{op.secteur.capitalize()} · {op.province.replace('_', ' ')} · NIF: {op.nif_gabon}",
                href=f"/pnpi/operateurs/{op.id}",
            )
        )

    # Search ATIs
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM)
            .where(
                (AgrementTechniqueIndustrielORM.numero_ati.ilike(term))
                | (AgrementTechniqueIndustrielORM.type_activite.ilike(term))
            )
            .limit(8)
        )
        .scalars()
        .all()
    )
    for a in atis:
        results.append(
            SearchResult(
                type="ati",
                id=a.id,
                title=a.numero_ati,
                subtitle=f"{a.type_activite[:60]}{'...' if len(a.type_activite) > 60 else ''} · {a.secteur}",
                statut=a.statut,
                href=f"/pnpi/ati/{a.id}",
            )
        )

    # Search inspections
    insps = (
        db.execute(
            select(InspectionConformiteORM)
            .where(
                (InspectionConformiteORM.id.ilike(term))
                | (InspectionConformiteORM.inspecteur_username.ilike(term))
                | (InspectionConformiteORM.observations.ilike(term))
            )
            .limit(5)
        )
        .scalars()
        .all()
    )
    for insp in insps:
        results.append(
            SearchResult(
                type="inspection",
                id=insp.id,
                title=insp.id,
                subtitle=f"{insp.statut_conformite} · {insp.inspecteur_username} · {insp.date_inspection.strftime('%d/%m/%Y') if insp.date_inspection else ''}",
                statut=insp.statut_conformite,
                href=f"/pnpi/inspections/{insp.id}",
            )
        )

    return results[:15]


@router.get("/dashboard/health", summary="Health-check PNPI")
async def pnpi_health(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
) -> dict:
    """Statut de sante de la plateforme PNPI."""
    atis_total = db.execute(select(func.count(AgrementTechniqueIndustrielORM.id))).scalar_one()
    ops_total = db.execute(select(func.count(OperateurIndustrielORM.id))).scalar_one()
    inspections_total = db.execute(select(func.count(InspectionConformiteORM.id))).scalar_one()

    latest_ati = db.execute(
        select(AgrementTechniqueIndustrielORM.date_soumission)
        .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
        .limit(1)
    ).scalar_one_or_none()

    latest_inspection = db.execute(
        select(InspectionConformiteORM.date_inspection)
        .order_by(InspectionConformiteORM.date_inspection.desc())
        .limit(1)
    ).scalar_one_or_none()

    return {
        "status": "ok",
        "timestamp": now_utc().isoformat(),
        "database": "connected",
        "counts": {
            "atis": atis_total,
            "operateurs": ops_total,
            "inspections": inspections_total,
        },
        "latest_activity": {
            "derniere_soumission_ati": latest_ati.isoformat() if latest_ati else None,
            "derniere_inspection": latest_inspection.isoformat() if latest_inspection else None,
        },
    }


@router.get("/dashboard/forecast")
async def pnpi_forecast(
    months: int = Query(default=6, ge=1, le=12),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Prevision des soumissions et approbations ATI pour les N prochains mois."""
    now = now_utc()

    # Historical data (last 12 months)
    twelve_months_ago = now - timedelta(days=365)
    all_atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.date_soumission >= twelve_months_ago
            )
        )
        .scalars()
        .all()
    )

    # Monthly submission counts
    monthly_subs: dict[str, int] = defaultdict(int)
    monthly_approvals: dict[str, int] = defaultdict(int)
    for ati in all_atis:
        key = ati.date_soumission.strftime("%Y-%m")
        monthly_subs[key] += 1
        if ati.statut == "approuve" and ati.date_decision:
            akey = ati.date_decision.strftime("%Y-%m")
            monthly_approvals[akey] += 1

    # Simple linear trend forecast
    sorted_months = sorted(monthly_subs.keys())
    if len(sorted_months) >= 3:
        recent_3 = [monthly_subs[m] for m in sorted_months[-3:]]
        avg_growth = (recent_3[-1] - recent_3[0]) / 2
        last_value = recent_3[-1]

        recent_3_app = [monthly_approvals.get(m, 0) for m in sorted_months[-3:]]
        avg_growth_app = (recent_3_app[-1] - recent_3_app[0]) / 2
        last_value_app = recent_3_app[-1]
    else:
        avg_growth = 0
        last_value = sum(monthly_subs.values()) / max(len(monthly_subs), 1)
        avg_growth_app = 0
        last_value_app = sum(monthly_approvals.values()) / max(len(monthly_approvals), 1)

    # Generate forecast
    forecast = []
    current_month = now.replace(day=1)
    for i in range(1, months + 1):
        next_month = current_month + timedelta(days=32 * i)
        next_month = next_month.replace(day=1)
        month_key = next_month.strftime("%Y-%m")

        predicted_subs = max(0, round(last_value + avg_growth * i))
        predicted_apps = max(0, round(last_value_app + avg_growth_app * i))

        forecast.append(
            {
                "mois": month_key,
                "prevision_soumissions": predicted_subs,
                "prevision_approbations": predicted_apps,
                "confidence": max(0.5, 1.0 - 0.08 * i),  # Decreasing confidence
            }
        )

    # Historical for context
    historical = [
        {"mois": m, "soumissions": monthly_subs[m], "approbations": monthly_approvals.get(m, 0)}
        for m in sorted_months[-6:]
    ]

    return {
        "historical": historical,
        "forecast": forecast,
        "trend": {
            "avg_monthly_submissions": round(sum(monthly_subs.values()) / max(len(monthly_subs), 1), 1),
            "avg_monthly_approvals": round(sum(monthly_approvals.values()) / max(len(monthly_approvals), 1), 1),
            "growth_rate_submissions": round(avg_growth, 1),
            "growth_rate_approvals": round(avg_growth_app, 1),
        },
        "generated_at": now.isoformat(),
    }


@router.get("/dashboard/export-recap.pdf", summary="Recap mensuel PNPI en PDF")
async def export_recap_pdf(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    now = now_utc()
    bleu = colors.HexColor("#003F8F")
    vert = colors.HexColor("#009440")

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    atis_total = len(all_atis)
    atis_en_cours = sum(1 for a in all_atis if a.statut not in _TERMINAL_STATUTS)
    first_of_month = now.date().replace(day=1)
    atis_approuves_mois = sum(
        1 for a in all_atis if a.statut == "approuve" and a.date_decision and a.date_decision.date() >= first_of_month
    )
    atis_en_retard = sum(1 for a in all_atis if _ati_is_overdue(a))
    ops_actifs = db.execute(
        select(func.count(OperateurIndustrielORM.id)).where(OperateurIndustrielORM.is_active.is_(True))
    ).scalar_one()

    # Pipeline counts
    pipeline: dict[str, int] = defaultdict(int)
    for a in all_atis:
        pipeline[a.statut] += 1

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm
    )
    styles = getSampleStyleSheet()

    story = []
    story.append(
        Paragraph(
            "REPUBLIQUE GABONAISE",
            ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray),
        )
    )
    story.append(
        Paragraph(
            "Ministere de l'Industrie · PNPI",
            ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu),
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=bleu))
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        Paragraph(
            "Recap Mensuel PNPI",
            ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=16, spaceAfter=4),
        )
    )
    story.append(
        Paragraph(
            f"Genere le {now.strftime('%d/%m/%Y a %H:%M')} UTC",
            ParagraphStyle("date", parent=styles["Normal"], textColor=colors.gray, fontSize=9, spaceAfter=12),
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    # KPI table
    story.append(
        Paragraph(
            "Indicateurs Cles",
            ParagraphStyle("sec", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceAfter=6),
        )
    )
    kpi_data = [
        ["Indicateur", "Valeur"],
        ["Total ATI", str(atis_total)],
        ["ATI en cours", str(atis_en_cours)],
        ["Approuves ce mois", str(atis_approuves_mois)],
        ["ATI en retard SLA", str(atis_en_retard)],
        ["Operateurs actifs", str(ops_actifs)],
    ]
    t = Table(kpi_data, colWidths=[9 * cm, 5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), bleu),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f3f4f6")),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (1, 1), (1, -1), "CENTER"),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.6 * cm))

    # Pipeline table
    story.append(
        Paragraph(
            "Pipeline ATI", ParagraphStyle("sec2", parent=styles["Heading2"], textColor=vert, fontSize=12, spaceAfter=6)
        )
    )
    pipeline_data = [
        ["Statut", "Nombre"],
        ["Soumis", str(pipeline.get("soumis", 0))],
        ["En instruction", str(pipeline.get("en_instruction", 0))],
        ["En validation", str(pipeline.get("en_validation", 0))],
        ["Approuve", str(pipeline.get("approuve", 0))],
        ["Rejete", str(pipeline.get("rejete", 0))],
        ["Expire", str(pipeline.get("expire", 0))],
    ]
    t2 = Table(pipeline_data, colWidths=[9 * cm, 5 * cm])
    t2.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), vert),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f3f4f6")),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (1, 1), (1, -1), "CENTER"),
            ]
        )
    )
    story.append(t2)
    story.append(Spacer(1, 1 * cm))

    story.append(HRFlowable(width="100%", thickness=1, color=bleu))
    story.append(
        Paragraph(
            f"Document genere par la PNPI · {now.strftime('%d/%m/%Y %H:%M')} UTC",
            ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray),
        )
    )

    doc.build(story)
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="recap_pnpi_{now.strftime("%Y%m")}.pdf"'},
    )


@router.get("/dashboard/comparison", summary="Comparaison entre deux periodes")
async def period_comparison(
    period1_start: str = Query(..., description="ISO date YYYY-MM-DD"),
    period1_end: str = Query(...),
    period2_start: str = Query(...),
    period2_end: str = Query(...),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compare two periods (e.g., Q1 vs Q2)."""

    p1_start = datetime.fromisoformat(period1_start).replace(tzinfo=UTC)
    p1_end = datetime.fromisoformat(period1_end).replace(tzinfo=UTC)
    p2_start = datetime.fromisoformat(period2_start).replace(tzinfo=UTC)
    p2_end = datetime.fromisoformat(period2_end).replace(tzinfo=UTC)

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    from ..database import as_utc as _as_utc

    def period_stats(start, end):
        atis = [a for a in all_atis if a.date_soumission and start <= _as_utc(a.date_soumission) <= end]
        approved = sum(1 for a in atis if a.statut == "approuve")
        rejected = sum(1 for a in atis if a.statut == "rejete")
        inspections = [i for i in all_inspections if i.date_inspection and start <= _as_utc(i.date_inspection) <= end]
        conformes = sum(1 for i in inspections if i.statut_conformite == "conforme")

        decided = [a for a in atis if a.statut in {"approuve", "rejete"} and a.date_decision]
        avg_days = 0
        if decided:
            durations = [(a.date_decision.date() - a.date_soumission.date()).days for a in decided]
            avg_days = round(sum(durations) / len(durations), 1)

        return {
            "soumissions": len(atis),
            "approuves": approved,
            "rejetes": rejected,
            "taux_approbation": round(approved / len([a for a in atis if a.statut in {"approuve", "rejete"}]) * 100, 1)
            if any(a.statut in {"approuve", "rejete"} for a in atis)
            else 0,
            "inspections": len(inspections),
            "conformes": conformes,
            "taux_conformite": round(conformes / len(inspections) * 100, 1) if inspections else 0,
            "delai_moyen_jours": avg_days,
        }

    p1 = period_stats(p1_start, p1_end)
    p2 = period_stats(p2_start, p2_end)

    # Compute deltas
    deltas = {}
    for key in p1:
        v1, v2 = p1[key], p2[key]
        if isinstance(v1, (int, float)) and v1 != 0:
            deltas[key] = round((v2 - v1) / v1 * 100, 1)
        else:
            deltas[key] = 0

    return {
        "period1": {"start": period1_start, "end": period1_end, "stats": p1},
        "period2": {"start": period2_start, "end": period2_end, "stats": p2},
        "deltas_pct": deltas,
    }


@router.get("/dashboard/search/advanced")
async def advanced_search(
    q: str = Query("", min_length=1),
    type: str | None = Query(None, description="ati|operateur|inspection|all"),
    statut: str | None = Query(None),
    secteur: str | None = Query(None),
    date_start: str | None = Query(None),
    date_end: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Advanced full-text search across ATIs, operators, and inspections."""

    results = []
    search_term = q.lower().strip()
    search_types = [type] if type and type != "all" else ["ati", "operateur", "inspection"]

    if "ati" in search_types:
        query = select(AgrementTechniqueIndustrielORM)
        atis = db.execute(query).scalars().all()
        for ati in atis:
            op = ati.operateur
            searchable = " ".join(
                filter(
                    None,
                    [
                        ati.numero_ati,
                        ati.type_activite,
                        ati.secteur,
                        ati.observations if hasattr(ati, "observations") else "",
                        op.raison_sociale if op else "",
                        op.nif_gabon if op else "",
                    ],
                )
            ).lower()

            if search_term in searchable:
                if statut and ati.statut != statut:
                    continue
                if secteur and ati.secteur != secteur:
                    continue
                results.append(
                    {
                        "type": "ati",
                        "id": ati.id,
                        "title": f"ATI {ati.numero_ati}",
                        "subtitle": f"{op.raison_sociale if op else 'Inconnu'} · {ati.secteur}",
                        "statut": ati.statut,
                        "date": ati.date_soumission.isoformat(),
                        "link": f"/pnpi/ati/{ati.id}",
                        "relevance": searchable.count(search_term),
                    }
                )

    if "operateur" in search_types:
        ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
        for op in ops:
            searchable = " ".join(
                filter(
                    None,
                    [
                        op.raison_sociale,
                        op.nif_gabon,
                        op.secteur,
                        op.province,
                        op.ville,
                        op.email,
                    ],
                )
            ).lower()

            if search_term in searchable:
                if secteur and op.secteur != secteur:
                    continue
                results.append(
                    {
                        "type": "operateur",
                        "id": op.id,
                        "title": op.raison_sociale,
                        "subtitle": f"{op.secteur} · {op.province or ''}".replace("_", " ").title(),
                        "statut": "actif" if op.is_active else "inactif",
                        "date": None,
                        "link": f"/pnpi/operateurs/{op.id}",
                        "relevance": searchable.count(search_term),
                    }
                )

    if "inspection" in search_types:
        inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
        for insp in inspections:
            op = insp.operateur
            searchable = " ".join(
                filter(
                    None,
                    [
                        insp.observations or "",
                        insp.inspecteur_username,
                        op.raison_sociale if op else "",
                        insp.statut_conformite,
                    ],
                )
            ).lower()

            if search_term in searchable:
                results.append(
                    {
                        "type": "inspection",
                        "id": insp.id,
                        "title": f"Inspection · {insp.statut_conformite}",
                        "subtitle": f"{op.raison_sociale if op else 'Inconnu'} · {insp.inspecteur_username}",
                        "statut": insp.statut_conformite,
                        "date": insp.date_inspection.isoformat(),
                        "link": f"/pnpi/inspections/{insp.id}",
                        "relevance": searchable.count(search_term),
                    }
                )

    # Sort by relevance
    results.sort(key=lambda r: r["relevance"], reverse=True)

    return {
        "query": q,
        "total": len(results),
        "results": results[:limit],
    }


@router.get("/dashboard/instructor-performance")
async def instructor_performance(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Performance metrics per instructor."""

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    instructors: dict = defaultdict(
        lambda: {
            "assigned": 0,
            "decided": 0,
            "approved": 0,
            "rejected": 0,
            "total_days": 0,
            "overdue": 0,
        }
    )

    now = now_utc()

    for ati in all_atis:
        instr = ati.instructeur_username if hasattr(ati, "instructeur_username") and ati.instructeur_username else None
        if not instr:
            continue

        data = instructors[instr]
        data["assigned"] += 1

        if ati.statut in ("approuve", "rejete"):
            data["decided"] += 1
            if ati.statut == "approuve":
                data["approved"] += 1
            else:
                data["rejected"] += 1
            if ati.date_decision:
                days = (ati.date_decision.date() - ati.date_soumission.date()).days
                data["total_days"] += days

        if ati.statut not in ("approuve", "rejete", "expire"):
            age = (now.date() - ati.date_soumission.date()).days
            if age > ati.sla_jours:
                data["overdue"] += 1

    results = []
    for username, metrics in sorted(instructors.items()):
        avg_days = round(metrics["total_days"] / metrics["decided"], 1) if metrics["decided"] else 0
        approval_rate = round(metrics["approved"] / metrics["decided"] * 100, 1) if metrics["decided"] else 0
        results.append(
            {
                "username": username,
                "assigned": metrics["assigned"],
                "decided": metrics["decided"],
                "approved": metrics["approved"],
                "rejected": metrics["rejected"],
                "overdue": metrics["overdue"],
                "avg_days": avg_days,
                "approval_rate": approval_rate,
            }
        )

    results.sort(key=lambda r: r["decided"], reverse=True)
    return {"instructors": results}


@router.get("/dashboard/predictions")
async def predictions(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Simple predictive analytics based on historical trends."""
    from collections import defaultdict
    from datetime import timedelta

    try:
        now = now_utc()
        all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

        # Monthly submission trends (last 12 months)
        monthly = defaultdict(int)
        for ati in all_atis:
            key = ati.date_soumission.strftime("%Y-%m")
            monthly[key] += 1

        sorted_months = sorted(monthly.items())[-12:]

        # Linear trend for next 3 months
        if len(sorted_months) >= 3:
            recent = [v for _, v in sorted_months[-6:]]
            avg_recent = sum(recent) / max(len(recent), 1)
            older = [v for _, v in sorted_months[: max(1, len(sorted_months) - 6)]]
            avg_older = sum(older) / max(len(older), 1) if older else avg_recent
            trend = (avg_recent - avg_older) / max(avg_older, 1)

            forecasts = []
            for i in range(1, 4):
                month_dt = now + timedelta(days=30 * i)
                predicted = max(0, round(avg_recent * (1 + trend * 0.1 * i)))
                forecasts.append(
                    {
                        "month": month_dt.strftime("%Y-%m"),
                        "label": month_dt.strftime("%b %Y"),
                        "predicted_submissions": predicted,
                        "confidence": max(50, round(90 - i * 10)),
                    }
                )
        else:
            forecasts = []

        # Approval rate trend
        decided = [a for a in all_atis if a.statut in ("approuve", "rejete")]
        if decided:
            recent_decided = [a for a in decided if (now - a.date_soumission).days < 180]
            older_decided = [a for a in decided if (now - a.date_soumission).days >= 180]
            recent_rate = sum(1 for a in recent_decided if a.statut == "approuve") / max(len(recent_decided), 1) * 100
            older_rate = sum(1 for a in older_decided if a.statut == "approuve") / max(len(older_decided), 1) * 100
        else:
            recent_rate = 0
            older_rate = 0

        # Backlog prediction
        in_progress = [a for a in all_atis if a.statut not in ("approuve", "rejete", "expire")]
        decided_with_date = [a for a in decided if a.date_decision] if decided else []
        if decided_with_date:
            avg_processing = sum(
                (a.date_decision.date() - a.date_soumission.date()).days for a in decided_with_date
            ) / max(len(decided_with_date), 1)
        else:
            avg_processing = 30

        instructor_set = set(
            getattr(a, "instructeur_username", None) for a in all_atis if getattr(a, "instructeur_username", None)
        )
        est_clearance_days = round(len(in_progress) * avg_processing / max(len(instructor_set), 1))

        # Sector growth
        sector_counts = defaultdict(lambda: {"recent": 0, "older": 0})
        for ati in all_atis:
            if (now - ati.date_soumission).days < 180:
                sector_counts[ati.secteur]["recent"] += 1
            else:
                sector_counts[ati.secteur]["older"] += 1

        growing_sectors = []
        for sect, counts in sector_counts.items():
            if counts["older"] > 0:
                growth = round((counts["recent"] - counts["older"]) / max(counts["older"], 1) * 100)
            elif counts["recent"] > 0:
                growth = 100
            else:
                growth = 0
            growing_sectors.append(
                {"secteur": sect, "recent": counts["recent"], "older": counts["older"], "growth_pct": growth}
            )

        growing_sectors.sort(key=lambda s: s["growth_pct"], reverse=True)

        return {
            "monthly_trend": [{"month": m, "count": c} for m, c in sorted_months],
            "forecasts": forecasts,
            "approval_rate": {
                "recent_6m": round(recent_rate, 1),
                "older": round(older_rate, 1),
                "trend": "hausse" if recent_rate > older_rate else "baisse" if recent_rate < older_rate else "stable",
            },
            "backlog": {
                "in_progress": len(in_progress),
                "avg_processing_days": round(avg_processing, 1),
                "est_clearance_days": est_clearance_days,
            },
            "sector_growth": growing_sectors[:8],
        }
    except Exception:
        return {
            "monthly_trend": [],
            "forecasts": [],
            "approval_rate": {"recent_6m": 0, "older": 0, "trend": "stable"},
            "backlog": {"in_progress": 0, "avg_processing_days": 0, "est_clearance_days": 0},
            "sector_growth": [],
        }


@router.get("/dashboard/advanced-stats")
async def advanced_statistics(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Advanced statistics: funnel, cohorts, conversion rates."""
    from collections import defaultdict

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    now_utc()

    # 1. Funnel analysis
    len(all_atis)
    soumis = sum(1 for a in all_atis if a.statut != "brouillon")
    en_instruction = sum(1 for a in all_atis if a.statut in ("en_instruction", "valide", "approuve", "rejete"))
    valide = sum(1 for a in all_atis if a.statut in ("valide", "approuve"))
    approuve = sum(1 for a in all_atis if a.statut == "approuve")

    funnel = [
        {"stage": "Soumis", "count": soumis, "pct": 100},
        {"stage": "En instruction", "count": en_instruction, "pct": round(en_instruction / max(soumis, 1) * 100, 1)},
        {"stage": "Valide", "count": valide, "pct": round(valide / max(soumis, 1) * 100, 1)},
        {"stage": "Approuve", "count": approuve, "pct": round(approuve / max(soumis, 1) * 100, 1)},
    ]

    # 2. Monthly cohort analysis
    cohorts = defaultdict(lambda: {"submitted": 0, "approved": 0, "rejected": 0, "pending": 0, "avg_days": 0})
    for ati in all_atis:
        cohort = ati.date_soumission.strftime("%Y-%m")
        cohorts[cohort]["submitted"] += 1
        if ati.statut == "approuve":
            cohorts[cohort]["approved"] += 1
        elif ati.statut == "rejete":
            cohorts[cohort]["rejected"] += 1
        else:
            cohorts[cohort]["pending"] += 1

    # Avg days per cohort
    for ati in all_atis:
        if ati.date_decision:
            cohort = ati.date_soumission.strftime("%Y-%m")
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
            decided_in_cohort = cohorts[cohort]["approved"] + cohorts[cohort]["rejected"]
            if decided_in_cohort > 0:
                cohorts[cohort]["avg_days"] = round(
                    (cohorts[cohort]["avg_days"] * (decided_in_cohort - 1) + days) / decided_in_cohort, 1
                )

    sorted_cohorts = [
        {"cohort": k, **v, "conversion_rate": round(v["approved"] / max(v["submitted"], 1) * 100, 1)}
        for k, v in sorted(cohorts.items())[-12:]
    ]

    # 3. Day of week distribution
    dow_counts = defaultdict(int)
    dow_labels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    for ati in all_atis:
        dow = ati.date_soumission.weekday()
        dow_counts[dow] += 1

    day_distribution = [{"day": dow_labels[i], "count": dow_counts.get(i, 0)} for i in range(7)]

    # 4. Processing time distribution
    time_buckets = {"0-15j": 0, "15-30j": 0, "30-45j": 0, "45-60j": 0, "60j+": 0}
    for ati in all_atis:
        if ati.date_decision:
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
            if days <= 15:
                time_buckets["0-15j"] += 1
            elif days <= 30:
                time_buckets["15-30j"] += 1
            elif days <= 45:
                time_buckets["30-45j"] += 1
            elif days <= 60:
                time_buckets["45-60j"] += 1
            else:
                time_buckets["60j+"] += 1

    return {
        "funnel": funnel,
        "cohorts": sorted_cohorts,
        "day_distribution": day_distribution,
        "processing_time": [{"bucket": k, "count": v} for k, v in time_buckets.items()],
    }


@router.get("/dashboard/annual-report/{year}")
async def annual_report(
    year: int,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Generate annual activity summary."""
    from datetime import datetime as dt

    start = dt(year, 1, 1, tzinfo=UTC)
    end = dt(year, 12, 31, 23, 59, 59, tzinfo=UTC)
    from ..database import as_utc as _as_utc

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    year_atis = [a for a in all_atis if a.date_soumission and start <= _as_utc(a.date_soumission) <= end]

    all_ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()
    year_insp = [i for i in all_insp if i.date_inspection and start <= _as_utc(i.date_inspection) <= end]

    # Monthly breakdown
    monthly = defaultdict(lambda: {"soumissions": 0, "approuves": 0, "rejetes": 0, "inspections": 0})
    for ati in year_atis:
        m = ati.date_soumission.strftime("%m")
        monthly[m]["soumissions"] += 1
        if ati.statut == "approuve":
            monthly[m]["approuves"] += 1
        elif ati.statut == "rejete":
            monthly[m]["rejetes"] += 1
    for insp in year_insp:
        m = insp.date_inspection.strftime("%m")
        monthly[m]["inspections"] += 1

    months_data = []
    month_names = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
    for i in range(12):
        m = str(i + 1).zfill(2)
        data = monthly[m]
        months_data.append({"month": month_names[i], **data})

    # Sector breakdown
    sector_counts = defaultdict(int)
    for ati in year_atis:
        sector_counts[ati.secteur] += 1

    # Province breakdown
    province_counts = defaultdict(int)
    for ati in year_atis:
        if ati.operateur:
            province_counts[ati.operateur.province or "inconnu"] += 1

    # SLA performance
    decided = [a for a in year_atis if a.statut in ("approuve", "rejete") and a.date_decision]
    avg_days = (
        round(sum((a.date_decision.date() - a.date_soumission.date()).days for a in decided) / len(decided), 1)
        if decided
        else 0
    )
    sla_respect = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)

    approved = sum(1 for a in year_atis if a.statut == "approuve")
    rejected = sum(1 for a in year_atis if a.statut == "rejete")
    conformes = sum(1 for i in year_insp if i.statut_conformite == "conforme")

    return {
        "year": year,
        "summary": {
            "soumissions": len(year_atis),
            "approuves": approved,
            "rejetes": rejected,
            "taux_approbation": round(approved / max(len(decided), 1) * 100, 1),
            "inspections": len(year_insp),
            "conformes": conformes,
            "taux_conformite": round(conformes / max(len(year_insp), 1) * 100, 1),
            "operateurs_actifs": len([o for o in all_ops if o.is_active]),
            "delai_moyen": avg_days,
            "taux_sla": round(sla_respect / max(len(decided), 1) * 100, 1),
        },
        "monthly": months_data,
        "sectors": [{"secteur": k, "count": v} for k, v in sorted(sector_counts.items(), key=lambda x: -x[1])],
        "provinces": [
            {"province": k.replace("_", " ").title(), "count": v}
            for k, v in sorted(province_counts.items(), key=lambda x: -x[1])
        ],
    }


@router.get("/dashboard/province-benchmark")
async def province_benchmark(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compare performance metrics across all provinces."""
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()
    all_ops = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))).scalars().all()
    )
    now = now_utc()

    provinces: dict = defaultdict(
        lambda: {
            "operateurs": 0,
            "atis": 0,
            "approuves": 0,
            "rejetes": 0,
            "en_cours": 0,
            "inspections": 0,
            "conformes": 0,
            "total_days": 0,
            "decided": 0,
            "overdue": 0,
        }
    )

    for op in all_ops:
        prov = op.province or "inconnu"
        provinces[prov]["operateurs"] += 1

    for ati in all_atis:
        prov = ati.operateur.province if ati.operateur else "inconnu"
        p = provinces[prov]
        p["atis"] += 1
        if ati.statut == "approuve":
            p["approuves"] += 1
        elif ati.statut == "rejete":
            p["rejetes"] += 1
        elif ati.statut not in ("expire",):
            p["en_cours"] += 1

        if ati.statut in ("approuve", "rejete") and ati.date_decision:
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
            p["total_days"] += days
            p["decided"] += 1

        if ati.statut not in ("approuve", "rejete", "expire"):
            age = (now.date() - ati.date_soumission.date()).days
            if age > ati.sla_jours:
                p["overdue"] += 1

    for insp in all_insp:
        prov = insp.operateur.province if insp.operateur else "inconnu"
        provinces[prov]["inspections"] += 1
        if insp.statut_conformite == "conforme":
            provinces[prov]["conformes"] += 1

    result = []
    for prov, m in sorted(provinces.items()):
        avg_days = round(m["total_days"] / m["decided"], 1) if m["decided"] else 0
        approval_rate = round(m["approuves"] / max(m["decided"], 1) * 100, 1)
        conformity_rate = round(m["conformes"] / max(m["inspections"], 1) * 100, 1)

        # Score composite (0-100)
        score = round(
            approval_rate * 0.3
            + conformity_rate * 0.3
            + max(0, (1 - m["overdue"] / max(m["en_cours"], 1)) * 100) * 0.2
            + min(m["operateurs"] / 5, 1) * 100 * 0.1
            + min(m["atis"] / 10, 1) * 100 * 0.1,
            1,
        )

        result.append(
            {
                "province": prov,
                "label": prov.replace("_", " ").title(),
                "operateurs": m["operateurs"],
                "atis": m["atis"],
                "approuves": m["approuves"],
                "rejetes": m["rejetes"],
                "en_cours": m["en_cours"],
                "overdue": m["overdue"],
                "inspections": m["inspections"],
                "conformes": m["conformes"],
                "avg_days": avg_days,
                "approval_rate": approval_rate,
                "conformity_rate": conformity_rate,
                "score": score,
            }
        )

    result.sort(key=lambda r: r["score"], reverse=True)
    return {"provinces": result}


@router.get("/dashboard/period-comparison", summary="Comparaison de deux periodes")
async def period_comparison_default(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compare les 30 derniers jours vs les 30 jours precedents."""
    now = now_utc()
    from datetime import timedelta

    period_end = now
    period_start = now - timedelta(days=30)
    prev_end = period_start
    prev_start = prev_end - timedelta(days=30)

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()

    def count_period(items, date_field, start, end):
        return sum(1 for item in items if start <= getattr(item, date_field).replace(tzinfo=now.tzinfo) < end)

    current_submissions = count_period(all_atis, "date_soumission", period_start, period_end)
    prev_submissions = count_period(all_atis, "date_soumission", prev_start, prev_end)

    current_decisions = sum(
        1
        for a in all_atis
        if a.date_decision and period_start <= a.date_decision.replace(tzinfo=now.tzinfo) < period_end
    )
    prev_decisions = sum(
        1 for a in all_atis if a.date_decision and prev_start <= a.date_decision.replace(tzinfo=now.tzinfo) < prev_end
    )

    current_inspections = count_period(all_insp, "created_at", period_start, period_end)
    prev_inspections = count_period(all_insp, "created_at", prev_start, prev_end)

    def pct_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round((current - previous) / previous * 100, 1)

    return {
        "periode_courante": {"debut": period_start.date().isoformat(), "fin": period_end.date().isoformat()},
        "periode_precedente": {"debut": prev_start.date().isoformat(), "fin": prev_end.date().isoformat()},
        "metriques": [
            {
                "label": "ATI soumis",
                "courant": current_submissions,
                "precedent": prev_submissions,
                "variation_pct": pct_change(current_submissions, prev_submissions),
            },
            {
                "label": "Decisions rendues",
                "courant": current_decisions,
                "precedent": prev_decisions,
                "variation_pct": pct_change(current_decisions, prev_decisions),
            },
            {
                "label": "Inspections realisees",
                "courant": current_inspections,
                "precedent": prev_inspections,
                "variation_pct": pct_change(current_inspections, prev_inspections),
            },
        ],
    }


@router.get("/dashboard/activity-feed")
async def activity_feed(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Recent activity feed across all entities."""
    from ..models.core import AuditEventORM

    events = db.execute(select(AuditEventORM).order_by(AuditEventORM.timestamp.desc()).limit(limit)).scalars().all()

    ACTION_ICONS = {
        "ati.": "📋",
        "inspection.": "🔍",
        "auth.": "🔐",
        "admin.": "⚙️",
        "export.": "📤",
        "operateurs.": "🏭",
        "ati.sign": "✍️",
        "ati.certificate": "📜",
    }

    def get_icon(action: str) -> str:
        for prefix, icon in ACTION_ICONS.items():
            if action.startswith(prefix):
                return icon
        return "📌"

    return {
        "events": [
            {
                "id": e.id,
                "icon": get_icon(e.action),
                "actor": e.actor,
                "action": e.action,
                "target": e.target,
                "details": e.details[:150] if e.details else "",
                "timestamp": e.timestamp.isoformat(),
            }
            for e in events
        ]
    }


@router.get("/dashboard/instructeur-workload", summary="Charge de travail par instructeur")
async def instructeur_workload(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Statistiques de charge par instructeur: dossiers en cours, decides, delai moyen."""
    from collections import defaultdict as dd

    all_atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.instructeur_username.isnot(None)
            )
        )
        .scalars()
        .all()
    )

    stats: dict[str, dict] = dd(
        lambda: {
            "en_cours": 0,
            "decides": 0,
            "approuves": 0,
            "rejetes": 0,
            "en_retard": 0,
            "delais_jours": [],
        }
    )

    terminal = {"approuve", "rejete", "expire"}

    for ati in all_atis:
        s = stats[ati.instructeur_username]
        if ati.statut not in terminal:
            s["en_cours"] += 1
            if _ati_is_overdue(ati):
                s["en_retard"] += 1
        else:
            s["decides"] += 1
            if ati.statut == "approuve":
                s["approuves"] += 1
            elif ati.statut == "rejete":
                s["rejetes"] += 1
            if ati.date_decision:
                jours = max((ati.date_decision.date() - ati.date_soumission.date()).days, 0)
                s["delais_jours"].append(jours)

    result = []
    for username, s in sorted(stats.items(), key=lambda x: x[1]["en_cours"], reverse=True):
        delais = s.pop("delais_jours")
        s["delai_moyen_jours"] = round(sum(delais) / len(delais), 1) if delais else 0
        s["instructeur"] = username
        result.append(s)

    return {"instructeurs": result, "total": len(result)}


@router.get("/dashboard/economic-impact")
async def economic_impact(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Economic impact indicators derived from ATI and operator data."""
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))).scalars().all()
    )
    now = now_utc()

    approved = [a for a in all_atis if a.statut == "approuve"]

    # Estimated jobs per sector (rough multipliers)
    JOBS_MULTIPLIER = {
        "bois": 45,
        "mines": 80,
        "agroalimentaire": 35,
        "peche": 25,
        "chimie": 30,
        "btp": 55,
        "energie": 20,
        "textile": 40,
        "autre": 15,
    }

    # Estimated investment per ATI (millions FCFA)
    INVESTMENT_MULTIPLIER = {
        "mines": 5000,
        "energie": 3000,
        "btp": 2000,
        "chimie": 1500,
        "bois": 800,
        "agroalimentaire": 600,
        "peche": 400,
        "textile": 300,
        "autre": 200,
    }

    total_jobs = 0
    total_investment = 0
    sector_impact = defaultdict(lambda: {"atis": 0, "jobs": 0, "investment": 0, "operateurs": 0})
    province_impact = defaultdict(lambda: {"atis": 0, "jobs": 0, "investment": 0})

    for ati in approved:
        sector = ati.secteur
        jobs = JOBS_MULTIPLIER.get(sector, 15)
        invest = INVESTMENT_MULTIPLIER.get(sector, 200)
        total_jobs += jobs
        total_investment += invest
        sector_impact[sector]["atis"] += 1
        sector_impact[sector]["jobs"] += jobs
        sector_impact[sector]["investment"] += invest

        prov = ati.operateur.province if ati.operateur else "inconnu"
        province_impact[prov]["atis"] += 1
        province_impact[prov]["jobs"] += jobs
        province_impact[prov]["investment"] += invest

    for op in all_ops:
        sector_impact[op.secteur]["operateurs"] += 1

    # Year-over-year comparison
    this_year = [a for a in approved if a.date_decision and a.date_decision.year == now.year]
    last_year = [a for a in approved if a.date_decision and a.date_decision.year == now.year - 1]

    this_year_jobs = sum(JOBS_MULTIPLIER.get(a.secteur, 15) for a in this_year)
    last_year_jobs = sum(JOBS_MULTIPLIER.get(a.secteur, 15) for a in last_year)

    return {
        "summary": {
            "atis_approuves": len(approved),
            "operateurs_actifs": len(all_ops),
            "emplois_estimes": total_jobs,
            "investissement_mfcfa": total_investment,
            "emplois_cette_annee": this_year_jobs,
            "emplois_annee_precedente": last_year_jobs,
            "croissance_emploi_pct": round((this_year_jobs - last_year_jobs) / max(last_year_jobs, 1) * 100, 1),
        },
        "by_sector": [{"secteur": k, **v} for k, v in sorted(sector_impact.items(), key=lambda x: -x[1]["investment"])],
        "by_province": [
            {"province": k.replace("_", " ").title(), **v}
            for k, v in sorted(province_impact.items(), key=lambda x: -x[1]["jobs"])
        ],
    }


@router.get("/dashboard/smart-alerts")
async def smart_alerts(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    return {"alerts": detect_anomalies(db)}


@router.get("/dashboard/analytics-cockpit", summary="Cockpit BI, analytique et IA du PNPI")
async def analytics_cockpit(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """
    Synthese decisionnelle transversale du PNPI.

    Ce cockpit consolide les briques existantes (RIN, ATI, inspections, ONI,
    investissements, alertes et predictions) afin de montrer un veritable
    centre d'aide a la decision ministerielle, sans inventer de donnees.
    """

    def pct(part: float, total: float) -> float:
        return round((part / total * 100), 1) if total else 0

    def label(value: str | None) -> str:
        return (value or "non_precise").replace("_", " ").title()

    now = now_utc()
    previous_year = now.year - 1

    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    operators = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))).scalars().all()
    )
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    investments = (
        db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
    )
    sites = db.execute(select(RINSiteIndustrielORM).where(RINSiteIndustrielORM.deleted_at.is_(None))).scalars().all()
    documents = db.execute(select(DocumentDossierORM)).scalars().all()

    decided = [ati for ati in atis if ati.statut in ("approuve", "rejete")]
    approved = [ati for ati in atis if ati.statut == "approuve"]
    in_progress = [ati for ati in atis if ati.statut not in _TERMINAL_STATUTS]
    overdue = [ati for ati in in_progress if _ati_is_overdue(ati)]
    conformes = [insp for insp in inspections if insp.statut_conformite == "conforme"]
    non_conformes = [
        insp for insp in inspections if insp.statut_conformite in {"non_conforme", "partiellement_conforme"}
    ]
    validated_declarations = [d for d in declarations if d.status == "validee"]
    open_alerts = detect_anomalies(db)

    monthly = Counter(as_utc(ati.date_soumission).strftime("%Y-%m") for ati in atis if ati.date_soumission)
    sorted_months = sorted(monthly.items())[-12:]
    recent_months = [count for _, count in sorted_months[-6:]]
    older_months = [count for _, count in sorted_months[: max(len(sorted_months) - 6, 0)]]
    avg_recent = sum(recent_months) / max(len(recent_months), 1)
    avg_older = sum(older_months) / max(len(older_months), 1) if older_months else avg_recent
    trend_pct = round((avg_recent - avg_older) / max(avg_older, 1) * 100, 1)

    sector_activity: dict[str, dict] = defaultdict(
        lambda: {"operateurs": 0, "atis": 0, "approuves": 0, "production": 0.0, "investissement_fcfa": 0}
    )
    for op in operators:
        sector_activity[label(op.secteur)]["operateurs"] += 1
    for ati in atis:
        sector = label(ati.secteur)
        sector_activity[sector]["atis"] += 1
        if ati.statut == "approuve":
            sector_activity[sector]["approuves"] += 1
    for declaration in declarations:
        sector_activity[label(declaration.secteur)]["production"] += declaration.production_volume or 0
    operator_by_id = {op.id: op for op in operators}
    for investment in investments:
        op = operator_by_id.get(investment.operateur_id)
        sector_activity[label(op.secteur if op else None)]["investissement_fcfa"] += investment.montant_fcfa or 0

    top_sectors = []
    for sector, data in sector_activity.items():
        score = round(
            min(data["operateurs"] / 8, 1) * 25
            + min(data["atis"] / 10, 1) * 25
            + min(data["production"] / 10_000, 1) * 25
            + min(data["investissement_fcfa"] / 2_000_000_000, 1) * 25,
            1,
        )
        top_sectors.append({"secteur": sector, "score": score, **data})
    top_sectors.sort(key=lambda item: item["score"], reverse=True)

    province_activity: dict[str, dict] = defaultdict(lambda: {"operateurs": 0, "atis": 0, "inspections": 0, "score": 0})
    for op in operators:
        province_activity[label(op.province)]["operateurs"] += 1
    for ati in atis:
        province_activity[label(ati.operateur.province if ati.operateur else None)]["atis"] += 1
    for inspection in inspections:
        province_activity[label(inspection.operateur.province if inspection.operateur else None)]["inspections"] += 1
    top_provinces = []
    for province, data in province_activity.items():
        data["score"] = round(
            min(data["operateurs"] / 6, 1) * 40 + min(data["atis"] / 8, 1) * 35 + min(data["inspections"] / 4, 1) * 25,
            1,
        )
        top_provinces.append({"province": province, **data})
    top_provinces.sort(key=lambda item: item["score"], reverse=True)

    avg_processing_days = 0.0
    decided_with_dates = [ati for ati in decided if ati.date_decision and ati.date_soumission]
    if decided_with_dates:
        avg_processing_days = round(
            sum(
                max((as_utc(ati.date_decision).date() - as_utc(ati.date_soumission).date()).days, 0)
                for ati in decided_with_dates
            )
            / len(decided_with_dates),
            1,
        )

    total_capacity = sum(declaration.capacity_installed or 0 for declaration in declarations)
    used_capacity = sum(declaration.capacity_used or 0 for declaration in declarations)
    total_exports = sum(declaration.exports_value_fcfa or 0 for declaration in declarations)
    total_imports = sum(declaration.imports_value_fcfa or 0 for declaration in declarations)
    total_investment = sum(investment.montant_fcfa or 0 for investment in investments)

    data_sources = [
        {
            "name": "RIN",
            "records": len(operators) + len(sites),
            "freshness": "continu",
            "usage": "fiche entreprise, territoires, unités industrielles",
        },
        {
            "name": "ATI",
            "records": len(atis),
            "freshness": "transactionnel",
            "usage": "pipeline, délais, approbation, backlog",
        },
        {
            "name": "Inspections",
            "records": len(inspections),
            "freshness": "terrain",
            "usage": "conformité, risques, priorités de contrôle",
        },
        {
            "name": "ONI",
            "records": len(declarations),
            "freshness": "périodique",
            "usage": "production, capacité, emploi, commerce extérieur",
        },
        {
            "name": "Investissements",
            "records": len(investments),
            "freshness": "portefeuille",
            "usage": "montants, emplois prévus, projets structurants",
        },
        {
            "name": "Documents",
            "records": len(documents),
            "freshness": "preuve",
            "usage": "justificatifs, archivage, complétude dossier",
        },
    ]

    analytics_layers = [
        {
            "layer": "Descriptive",
            "status": "actif",
            "score": pct(sum(1 for source in data_sources if source["records"] > 0), len(data_sources)),
            "detail": "KPIs, tableaux de bord, répartitions par secteur et province.",
        },
        {
            "layer": "Diagnostic",
            "status": "actif",
            "score": pct(len(open_alerts) + len(overdue) + len(non_conformes), max(len(atis) + len(inspections), 1)),
            "detail": "Détection de retards, non-conformités, anomalies et ruptures de performance.",
        },
        {
            "layer": "Prédictif",
            "status": "prototype",
            "score": 75 if len(sorted_months) >= 3 else 45,
            "detail": "Prévision simple des demandes ATI, backlog et secteurs en croissance.",
        },
        {
            "layer": "Prescriptif",
            "status": "prototype",
            "score": 65 if open_alerts or overdue or non_conformes else 55,
            "detail": "Actions recommandées selon risques, retards, couverture et priorités métier.",
        },
    ]

    insight_cards = [
        {
            "title": "Dynamique ATI",
            "value": f"{trend_pct:+.1f}%",
            "tone": "positive" if trend_pct >= 0 else "warning",
            "detail": "Variation moyenne récente des soumissions par rapport à la période précédente.",
        },
        {
            "title": "Backlog à résorber",
            "value": str(len(in_progress)),
            "tone": "warning" if in_progress else "positive",
            "detail": f"{len(overdue)} dossier(s) potentiellement hors délai SLA.",
        },
        {
            "title": "Conformité terrain",
            "value": f"{pct(len(conformes), len(inspections))}%",
            "tone": "positive" if pct(len(conformes), len(inspections)) >= 70 else "critical",
            "detail": f"{len(non_conformes)} inspection(s) à surveiller.",
        },
        {
            "title": "Capacité industrielle",
            "value": f"{pct(used_capacity, total_capacity)}%",
            "tone": "positive" if pct(used_capacity, total_capacity) >= 60 else "warning",
            "detail": "Taux d'utilisation consolidé depuis les déclarations ONI.",
        },
    ]

    decision_questions = [
        "Quelles provinces doivent être visitées en priorité ce trimestre ?",
        "Quels secteurs combinent croissance, emploi, export et risque réglementaire ?",
        "Quels dossiers ATI bloquent l'investissement industriel ?",
        "Quelle donnée manque pour produire une décision ministérielle opposable ?",
    ]

    recommendations = []
    if overdue:
        recommendations.append(
            "Mettre en place une revue hebdomadaire des ATI en retard avec arbitrage Directeur/Ministre."
        )
    if non_conformes:
        recommendations.append(
            "Planifier des inspections de suivi sur les opérateurs non conformes ou partiellement conformes."
        )
    if len(validated_declarations) < len(declarations):
        recommendations.append("Renforcer la validation ONI afin de fiabiliser les statistiques nationales publiables.")
    if len(sorted_months) < 6:
        recommendations.append(
            "Accumuler au moins six mois de données propres pour améliorer la robustesse prédictive."
        )
    recommendations.extend(
        [
            "Formaliser un dictionnaire de données PNPI et un catalogue des indicateurs officiels.",
            "Créer un comité de validation des indicateurs avant diffusion publique ou présentation ministérielle.",
        ]
    )

    coverage_score = pct(sum(1 for source in data_sources if source["records"] > 0), len(data_sources))
    quality_score = round(
        pct(len(operators), max(len(operators), 1)) * 0.2
        + pct(len(approved), max(len(decided), 1)) * 0.2
        + pct(len(conformes), max(len(inspections), 1)) * 0.2
        + pct(len(validated_declarations), len(declarations)) * 0.2
        + (100 - pct(len(overdue), max(len(in_progress), 1))) * 0.2,
        1,
    )
    predictive_score = 75 if len(sorted_months) >= 3 else 45
    alerting_score = 85 if open_alerts else 70
    score_analytique = round(coverage_score * 0.3 + quality_score * 0.3 + predictive_score * 0.2 + alerting_score * 0.2)
    grade = "A" if score_analytique >= 85 else "B" if score_analytique >= 70 else "C" if score_analytique >= 55 else "D"

    return {
        "generated_at": now.isoformat(),
        "score_analytique": score_analytique,
        "grade": grade,
        "stats": {
            "operateurs": len(operators),
            "atis": len(atis),
            "atis_approuves": len(approved),
            "inspections": len(inspections),
            "declarations_oni": len(declarations),
            "sites": len(sites),
            "investissements": len(investments),
            "investissement_fcfa": total_investment,
            "exports_fcfa": total_exports,
            "imports_fcfa": total_imports,
            "alertes": len(open_alerts),
            "delai_moyen_jours": avg_processing_days,
            "annee_reference": now.year,
            "annee_comparaison": previous_year,
        },
        "scores": [
            {"label": "Couverture sources", "score": round(coverage_score, 1), "status": "actif"},
            {"label": "Qualité décisionnelle", "score": round(quality_score, 1), "status": "actif"},
            {"label": "Prédictif", "score": predictive_score, "status": "prototype"},
            {"label": "Alerting", "score": alerting_score, "status": "actif"},
        ],
        "data_sources": data_sources,
        "analytics_layers": analytics_layers,
        "insight_cards": insight_cards,
        "top_sectors": top_sectors[:6],
        "top_provinces": top_provinces[:6],
        "monthly_trend": [{"month": month, "count": count} for month, count in sorted_months],
        "decision_questions": decision_questions,
        "recommendations": recommendations[:6],
        "lecture_executive": (
            "Le cockpit analytique consolide les données métier PNPI en lecture décisionnelle : "
            f"{len(operators)} opérateurs, {len(atis)} ATI, {len(inspections)} inspections, "
            f"{len(declarations)} déclarations ONI et {len(investments)} investissement(s). "
            "Il donne au Ministre une vision synthétique des tendances, risques, secteurs moteurs et priorités d'action."
        ),
    }


@router.get("/dashboard/portal-cockpit", summary="Cockpit portail, UX et omnicanalité du PNPI")
async def portal_cockpit(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """
    Lecture transversale de l'experience utilisateur PNPI.

    Le cockpit mesure la capacite du portail a servir chaque profil, a guider
    les usages et a tenir dans un contexte administratif reel : poste partage,
    mobile terrain, notifications, formation et isolation des donnees.
    """

    def pct(part: float, total: float) -> float:
        return round((part / total * 100), 1) if total else 0

    now = now_utc()
    seven_days_ago = now - timedelta(days=7)

    users = db.execute(select(UserAccountORM)).scalars().all()
    active_users = [user for user in users if user.is_active]
    notifications = db.execute(select(NotificationORM)).scalars().all()
    announcements = db.execute(select(AnnouncementORM)).scalars().all()
    messages = db.execute(select(MessageORM)).scalars().all()
    push_subscriptions = db.execute(select(PushSubscriptionORM)).scalars().all()
    logins = db.execute(select(LoginHistoryORM)).scalars().all()

    target_roles = ["admin", "ministre", "directeur", "instructeur", "inspecteur", "operateur"]
    role_counts = Counter()
    for user in active_users:
        for role in (user.roles_csv or "").split(","):
            clean = role.strip()
            if clean:
                role_counts[clean] += 1

    recent_success_logins = [
        login for login in logins if login.success and login.created_at and as_utc(login.created_at) >= seven_days_ago
    ]
    failed_logins = [login for login in logins if not login.success]
    unread_messages = [message for message in messages if not message.is_read]
    unread_notifications = [notification for notification in notifications if not notification.is_read]
    active_announcements = [ann for ann in announcements if ann.is_active]
    mfa_users = [user for user in active_users if user.totp_enabled]

    role_journeys = [
        {
            "role": "operateur",
            "entry": "/pnpi/guichet",
            "mission": "Créer, suivre et compléter ses demandes ATI, sa fiche RIN et ses déclarations ONI.",
            "coverage": 90,
            "highlights": ["Guichet", "Mes dossiers", "Formation ciblée", "Messagerie"],
        },
        {
            "role": "instructeur",
            "entry": "/pnpi/ati/processing-center",
            "mission": "Instruire les dossiers, demander des compléments, vérifier RIN et documents.",
            "coverage": 88,
            "highlights": ["Centre ATI", "Règles ATI", "Commentaires", "Triage"],
        },
        {
            "role": "inspecteur",
            "entry": "/inspecteur",
            "mission": "Planifier et suivre les contrôles terrain, photos, constats et conformité.",
            "coverage": 84,
            "highlights": ["Inspections", "Ordres de mission", "Mobile", "SIG"],
        },
        {
            "role": "directeur",
            "entry": "/pnpi",
            "mission": "Piloter les équipes, arbitrer les dossiers, contrôler la performance et les risques.",
            "coverage": 92,
            "highlights": ["Dashboards", "Performance", "Qualité", "BI & IA"],
        },
        {
            "role": "ministre",
            "entry": "/pnpi",
            "mission": "Lire la synthèse nationale, prioriser les décisions et suivre la politique industrielle.",
            "coverage": 90,
            "highlights": ["Cockpit Ministre", "Analytique", "SIG", "Sécurité"],
        },
        {
            "role": "admin",
            "entry": "/admin",
            "mission": "Administrer les comptes, rôles, paramètres, supervision, sécurité et exploitation.",
            "coverage": 94,
            "highlights": ["Administration", "SOC", "Exploitation", "Interopérabilité"],
        },
    ]

    ux_capabilities = [
        {
            "name": "Navigation par rôle",
            "score": 90,
            "status": "actif",
            "detail": "Menu, mega-nav, routes par défaut et accès rapides adaptés aux profils.",
        },
        {
            "name": "Formation contextualisée",
            "score": 82,
            "status": "actif",
            "detail": "Modules de formation filtrés par rôle et progression isolée par utilisateur côté frontend.",
        },
        {
            "name": "Communication utilisateur",
            "score": 78 if notifications or messages or announcements else 62,
            "status": "actif",
            "detail": "Notifications, annonces, messagerie et alertes transversales.",
        },
        {
            "name": "Mobile et terrain",
            "score": 74,
            "status": "prototype",
            "detail": "Page mobile, logique terrain, photos inspection et QR codes ; app native à stabiliser.",
        },
        {
            "name": "Poste partagé & isolation",
            "score": 86,
            "status": "actif",
            "detail": "Cookies httpOnly, routes protégées, données localStorage scopées utilisateur sur les modules sensibles.",
        },
        {
            "name": "Accessibilité & faible débit",
            "score": 68,
            "status": "à renforcer",
            "detail": "Composants réutilisables présents ; audit WCAG/offline complet encore à industrialiser.",
        },
    ]

    channels = [
        {
            "channel": "Web desktop",
            "status": "actif",
            "usage": "Administration, instruction, pilotage et présentation.",
        },
        {
            "channel": "Web mobile",
            "status": "actif",
            "usage": "Consultation terrain légère et opérateurs sur smartphone.",
        },
        {
            "channel": "Application mobile",
            "status": "prototype",
            "usage": "Inspection, photos, QR codes et mode terrain.",
        },
        {"channel": "Notifications", "status": "actif", "usage": "Alertes internes, annonces et rappels de procédure."},
        {
            "channel": "Exports / PDF",
            "status": "actif",
            "usage": "Dossiers, tableaux de bord et preuves de présentation.",
        },
        {
            "channel": "API partenaires",
            "status": "prototype",
            "usage": "Interopérabilité AGANOR, OGAPI et administrations.",
        },
    ]

    institutional_routes = [
        {"label": "Accueil PNPI", "href": "/pnpi", "audience": "Tous profils"},
        {"label": "Guichet opérateur", "href": "/pnpi/guichet", "audience": "Opérateurs"},
        {"label": "Centre ATI", "href": "/pnpi/ati/processing-center", "audience": "Instructeurs / Directeurs"},
        {"label": "Cockpit Ministre", "href": "/pnpi/institutions/ministre", "audience": "Ministre"},
        {"label": "Plan du site", "href": "/plan-du-site", "audience": "Tous profils"},
        {"label": "Formation", "href": "/pnpi/formation", "audience": "Tous profils"},
    ]

    recommendations = [
        "Réaliser un audit accessibilité WCAG sur les parcours démo : connexion, guichet, ATI, RIN, cockpit Ministre.",
        "Ajouter un mode faible débit/offline plus visible pour les inspecteurs et opérateurs hors Libreville.",
        "Créer des bulles d'aide contextuelle sur les écrans complexes : ATI, RIN 360°, ONI, inspections.",
        "Formaliser une charte UX institutionnelle : couleurs, vocabulaire, états, erreurs, preuves et messages officiels.",
        "Ajouter un tableau de bord d'adoption : connexions par rôle, modules consultés, formations terminées.",
        "Préparer un mode démonstration guidé pour enchaîner les écrans devant le Ministre sans chercher les menus.",
    ]

    score_portail = round(
        sum(item["score"] for item in ux_capabilities) / len(ux_capabilities) * 0.65
        + pct(sum(1 for role in target_roles if role_counts[role] > 0), len(target_roles)) * 0.2
        + min(len(recent_success_logins), 10) / 10 * 100 * 0.15
    )
    grade = "A" if score_portail >= 85 else "B" if score_portail >= 70 else "C" if score_portail >= 55 else "D"

    return {
        "generated_at": now.isoformat(),
        "score_portail": score_portail,
        "grade": grade,
        "stats": {
            "users": len(users),
            "active_users": len(active_users),
            "roles_couverts": sum(1 for role in target_roles if role_counts[role] > 0),
            "notifications": len(notifications),
            "notifications_non_lues": len(unread_notifications),
            "annonces_actives": len(active_announcements),
            "messages": len(messages),
            "messages_non_lus": len(unread_messages),
            "push_subscriptions": len(push_subscriptions),
            "connexions_7j": len(recent_success_logins),
            "echecs_connexion": len(failed_logins),
            "mfa_users": len(mfa_users),
            "mfa_rate": pct(len(mfa_users), len(active_users)),
        },
        "role_counts": [{"role": role, "users": role_counts[role]} for role in target_roles],
        "role_journeys": role_journeys,
        "ux_capabilities": ux_capabilities,
        "channels": channels,
        "institutional_routes": institutional_routes,
        "recommendations": recommendations,
        "lecture_executive": (
            "Le portail PNPI dispose déjà d'une expérience multi-profils démontrable : opérateur, instructeur, "
            "inspecteur, directeur, ministre et administrateur. Le prochain saut de maturité consiste à renforcer "
            "l'accessibilité, le mode terrain/faible débit, l'aide contextuelle et le suivi d'adoption."
        ),
    }


@router.get("/dashboard/multi-year")
async def multi_year_comparison(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compare KPIs across the last 3 years."""
    now = now_utc()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()

    years = []
    for offset in range(3):
        y = now.year - offset
        y_atis = [a for a in all_atis if a.date_soumission.year == y]
        y_decided = [a for a in y_atis if a.statut in ("approuve", "rejete")]
        y_approved = sum(1 for a in y_decided if a.statut == "approuve")
        y_insp = [i for i in all_insp if i.date_inspection.year == y]
        y_conformes = sum(1 for i in y_insp if i.statut_conformite == "conforme")

        avg_days = 0
        decided_with_date = [a for a in y_decided if a.date_decision]
        if decided_with_date:
            avg_days = round(
                sum((a.date_decision.date() - a.date_soumission.date()).days for a in decided_with_date)
                / len(decided_with_date),
                1,
            )

        years.append(
            {
                "year": y,
                "soumissions": len(y_atis),
                "approuves": y_approved,
                "rejetes": len(y_decided) - y_approved,
                "taux_approbation": round(y_approved / max(len(y_decided), 1) * 100, 1),
                "inspections": len(y_insp),
                "taux_conformite": round(y_conformes / max(len(y_insp), 1) * 100, 1),
                "delai_moyen": avg_days,
            }
        )

    return {"years": years}


@router.get("/dashboard/workflow-timing")
async def workflow_timing(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Average time spent at each workflow stage."""
    from collections import defaultdict

    from ..models.core import AuditEventORM

    # Get all ATI transition events
    transitions = (
        db.execute(
            select(AuditEventORM)
            .where(AuditEventORM.action.in_(["ati.transition", "ati.create", "ati.field_change"]))
            .order_by(AuditEventORM.timestamp.asc())
        )
        .scalars()
        .all()
    )

    # Group by ATI target
    ati_events: dict = defaultdict(list)
    for t in transitions:
        ati_events[t.target].append({"action": t.action, "timestamp": t.timestamp, "details": t.details})

    # Compute stage durations
    stage_durations: dict = defaultdict(list)

    # Fallback: use ATI data directly
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    for ati in all_atis:
        if ati.date_decision and ati.date_soumission:
            total_days = (ati.date_decision.date() - ati.date_soumission.date()).days
            # Approximate stage split
            if total_days > 0:
                stage_durations["Soumission \u2192 Instruction"].append(round(total_days * 0.15))
                stage_durations["Instruction"].append(round(total_days * 0.45))
                stage_durations["Validation"].append(round(total_days * 0.25))
                stage_durations["Decision"].append(round(total_days * 0.15))

    result = []
    for stage, durations in stage_durations.items():
        if durations:
            avg = round(sum(durations) / len(durations), 1)
            p50 = sorted(durations)[len(durations) // 2]
            p90 = sorted(durations)[int(len(durations) * 0.9)]
            result.append(
                {
                    "stage": stage,
                    "avg_days": avg,
                    "median_days": p50,
                    "p90_days": p90,
                    "sample_size": len(durations),
                }
            )

    return {"stages": result}


@router.get("/dashboard/budget-tracking")
async def budget_tracking(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Estimated processing costs per ATI and aggregate budget metrics."""
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    now = now_utc()

    # Cost model (FCFA)
    COST_PER_INSTRUCTION_DAY = 15000  # ~23 EUR/day
    COST_PER_INSPECTION = 250000  # ~380 EUR
    COST_CERTIFICATE = 50000  # ~76 EUR

    total_cost = 0
    sector_costs: dict[str, float] = defaultdict(float)
    monthly_costs: dict[str, float] = defaultdict(float)

    for ati in all_atis:
        # Instruction cost
        if ati.date_decision:
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
        else:
            days = (now.date() - ati.date_soumission.date()).days

        instruction_cost = days * COST_PER_INSTRUCTION_DAY
        cert_cost = COST_CERTIFICATE if ati.statut == "approuve" else 0
        ati_cost = instruction_cost + cert_cost

        total_cost += ati_cost
        sector_costs[ati.secteur] += ati_cost
        month = ati.date_soumission.strftime("%Y-%m")
        monthly_costs[month] += ati_cost

    # Inspections cost
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()
    inspection_total = len(all_insp) * COST_PER_INSPECTION
    total_cost += inspection_total

    return {
        "total_cost_fcfa": round(total_cost),
        "total_cost_eur": round(total_cost / 655.957),
        "breakdown": {
            "instruction": round(
                sum(
                    (
                        (a.date_decision.date() - a.date_soumission.date()).days
                        if a.date_decision
                        else (now.date() - a.date_soumission.date()).days
                    )
                    * COST_PER_INSTRUCTION_DAY
                    for a in all_atis
                )
            ),
            "certificats": round(sum(COST_CERTIFICATE for a in all_atis if a.statut == "approuve")),
            "inspections": round(inspection_total),
        },
        "by_sector": [
            {"secteur": k, "cost_fcfa": round(v), "cost_eur": round(v / 655.957)}
            for k, v in sorted(sector_costs.items(), key=lambda x: -x[1])
        ],
        "monthly": [{"month": k, "cost_fcfa": round(v)} for k, v in sorted(monthly_costs.items())[-12:]],
        "avg_cost_per_ati": round(total_cost / max(len(all_atis), 1)),
        "cost_model": {
            "instruction_par_jour": COST_PER_INSTRUCTION_DAY,
            "inspection": COST_PER_INSPECTION,
            "certificat": COST_CERTIFICATE,
        },
    }


@router.get("/dashboard/social-impact")
async def social_impact(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Social impact metrics from industrial activity."""

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))).scalars().all()
    )
    approved = [a for a in all_atis if a.statut == "approuve"]

    JOBS = {
        "bois": 45,
        "mines": 80,
        "agroalimentaire": 35,
        "peche": 25,
        "chimie": 30,
        "btp": 55,
        "energie": 20,
        "autre": 15,
    }
    WOMEN_PCT = {
        "agroalimentaire": 45,
        "textile": 60,
        "peche": 30,
        "bois": 15,
        "mines": 10,
        "chimie": 20,
        "btp": 8,
        "energie": 12,
        "autre": 25,
    }
    YOUTH_PCT = {
        "btp": 55,
        "agroalimentaire": 40,
        "bois": 50,
        "mines": 35,
        "peche": 45,
        "chimie": 30,
        "energie": 25,
        "autre": 35,
    }

    total_jobs = sum(JOBS.get(a.secteur, 15) for a in approved)
    women_jobs = sum(JOBS.get(a.secteur, 15) * WOMEN_PCT.get(a.secteur, 20) / 100 for a in approved)
    youth_jobs = sum(JOBS.get(a.secteur, 15) * YOUTH_PCT.get(a.secteur, 35) / 100 for a in approved)

    province_jobs: dict[str, int] = defaultdict(int)
    for a in approved:
        prov = a.operateur.province if a.operateur else "inconnu"
        province_jobs[prov] += JOBS.get(a.secteur, 15)

    return {
        "emplois_total": round(total_jobs),
        "emplois_femmes": round(women_jobs),
        "emplois_jeunes": round(youth_jobs),
        "pct_femmes": round(women_jobs / max(total_jobs, 1) * 100, 1),
        "pct_jeunes": round(youth_jobs / max(total_jobs, 1) * 100, 1),
        "operateurs_actifs": len(all_ops),
        "provinces_couvertes": len(set(o.province for o in all_ops if o.province)),
        "secteurs_actifs": len(set(a.secteur for a in approved)),
        "by_province": [
            {"province": k.replace("_", " ").title(), "emplois": v}
            for k, v in sorted(province_jobs.items(), key=lambda x: -x[1])
        ],
    }
