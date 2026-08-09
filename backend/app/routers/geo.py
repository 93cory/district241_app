"""PNPI · Endpoints geospatiaux (PostGIS)."""

from __future__ import annotations

from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    PROVINCES_GABON,
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
    RINSiteIndustrielORM,
)

# ---------------------------------------------------------------------------
# Province centroids (fallback when coordinates are missing)
# ---------------------------------------------------------------------------

PROVINCE_CENTROIDS = {
    "estuaire": {"lat": 0.4, "lng": 9.45},
    "haut_ogooue": {"lat": -1.6, "lng": 13.95},
    "moyen_ogooue": {"lat": -0.45, "lng": 10.75},
    "ngounie": {"lat": -1.5, "lng": 11.4},
    "nyanga": {"lat": -2.85, "lng": 11.15},
    "ogooue_ivindo": {"lat": 0.8, "lng": 12.0},
    "ogooue_lolo": {"lat": -0.85, "lng": 12.65},
    "ogooue_maritime": {"lat": -1.6, "lng": 9.7},
    "woleu_ntem": {"lat": 2.15, "lng": 11.75},
}

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------


class OperateurGeoResult(BaseModel):
    id: str
    raison_sociale: str
    secteur: str
    province: str
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float


class GeoCluster(BaseModel):
    province: str
    nb_operateurs: int
    centroid_lat: float | None = None
    centroid_lng: float | None = None


class InspectionHeatPoint(BaseModel):
    latitude: float
    longitude: float
    weight: int


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/geo", tags=["Geospatial"])


def _label(value: str | None) -> str:
    if not value:
        return "non_precise"
    return value.strip().lower().replace(" ", "_")


def _pct(value: int | float, total: int | float) -> int:
    if total <= 0:
        return 0
    return round((value / total) * 100)


@router.get("/cockpit", summary="Cockpit SIG national du PNPI")
async def geo_cockpit(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Vue géographique consolidée du tissu industriel.

    Le cockpit ne remplace pas une couche SIG complète, mais fournit une
    lecture décisionnelle : couverture géographique, déséquilibres
    provinciaux, inspections, zones/sites, investissements et priorités.
    """

    operators = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.deleted_at.is_(None))).scalars().all()
    )
    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
    sites = db.execute(select(RINSiteIndustrielORM).where(RINSiteIndustrielORM.deleted_at.is_(None))).scalars().all()
    investments = (
        db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
    )
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()

    operators_by_id = {op.id: op for op in operators}
    province_ops = Counter(_label(op.province) for op in operators)
    province_geocoded = Counter(
        _label(op.province) for op in operators if op.latitude is not None and op.longitude is not None
    )
    province_sites = Counter(_label(site.province) for site in sites)
    province_surface: dict[str, float] = defaultdict(float)
    for site in sites:
        province_surface[_label(site.province)] += site.superficie_ha or 0
    province_atis = Counter(
        _label(operators_by_id.get(ati.operateur_id).province if operators_by_id.get(ati.operateur_id) else None)
        for ati in atis
    )
    province_approved_atis = Counter(
        _label(operators_by_id.get(ati.operateur_id).province if operators_by_id.get(ati.operateur_id) else None)
        for ati in atis
        if ati.statut == "approuve"
    )
    province_inspections = Counter(
        _label(operators_by_id.get(insp.operateur_id).province if operators_by_id.get(insp.operateur_id) else None)
        for insp in inspections
    )
    province_non_conform = Counter(
        _label(operators_by_id.get(insp.operateur_id).province if operators_by_id.get(insp.operateur_id) else None)
        for insp in inspections
        if insp.statut_conformite == "non_conforme"
    )
    province_invest: dict[str, int] = defaultdict(int)
    for investment in investments:
        op = operators_by_id.get(investment.operateur_id)
        province_invest[_label(op.province if op else None)] += investment.montant_fcfa or 0
    province_production: dict[str, float] = defaultdict(float)
    for declaration in declarations:
        op = operators_by_id.get(declaration.operateur_id)
        province_production[_label(op.province if op else None)] += declaration.production_volume or 0

    all_provinces = sorted(set(PROVINCES_GABON) | set(province_ops) | set(province_sites) | set(province_inspections))
    province_cards = []
    for province in all_provinces:
        ops = province_ops[province]
        geocoded = province_geocoded[province]
        inspections_count = province_inspections[province]
        non_conform = province_non_conform[province]
        inspection_gap = max(0, ops - inspections_count)
        geocoding_rate = _pct(geocoded, ops)
        non_conform_rate = _pct(non_conform, inspections_count)
        pressure_score = min(
            100,
            round(
                ops * 3
                + province_sites[province] * 4
                + min(25, province_invest[province] / 1_000_000_000 * 5)
                + min(20, non_conform_rate / 2)
                + (15 if geocoding_rate < 50 and ops else 0),
                1,
            ),
        )
        province_cards.append(
            {
                "province": province,
                "label": province.replace("_", " ").title(),
                "centroid": PROVINCE_CENTROIDS.get(province, {"lat": 0.0, "lng": 11.0}),
                "operateurs": ops,
                "operateurs_geocodes": geocoded,
                "taux_geocodage": geocoding_rate,
                "atis": province_atis[province],
                "atis_approuves": province_approved_atis[province],
                "inspections": inspections_count,
                "non_conformites": non_conform,
                "taux_non_conformite": non_conform_rate,
                "sites": province_sites[province],
                "superficie_ha": round(province_surface[province], 2),
                "investissements_fcfa": province_invest[province],
                "production_declaree": round(province_production[province], 2),
                "gap_inspection": inspection_gap,
                "pression_industrielle": pressure_score,
                "priorite": "haute" if pressure_score >= 55 or inspection_gap >= 3 else "normale" if ops else "veille",
            }
        )
    province_cards.sort(key=lambda item: (item["priorite"] == "haute", item["pression_industrielle"]), reverse=True)

    geocoded_total = sum(1 for op in operators if op.latitude is not None and op.longitude is not None)
    provinces_with_ops = sum(1 for province in PROVINCES_GABON if province_ops[province] > 0)
    coverage_score = round(
        _pct(geocoded_total, len(operators)) * 0.35
        + _pct(provinces_with_ops, len(PROVINCES_GABON)) * 0.25
        + min(100, len(sites) * 8) * 0.2
        + min(100, len(inspections) * 4) * 0.2
    )

    return {
        "generated_at": now_utc().isoformat(),
        "score_sig": coverage_score,
        "grade": "A" if coverage_score >= 90 else "B" if coverage_score >= 75 else "C" if coverage_score >= 60 else "D",
        "stats": {
            "operateurs": len(operators),
            "operateurs_geocodes": geocoded_total,
            "provinces_couvertes": provinces_with_ops,
            "sites_industriels": len(sites),
            "inspections": len(inspections),
            "investissements": len(investments),
            "montant_investissements_fcfa": sum(item.montant_fcfa or 0 for item in investments),
            "declarations_oni": len(declarations),
        },
        "provinces": province_cards,
        "clusters": [
            {
                "province": province,
                "label": province.replace("_", " ").title(),
                "lat": PROVINCE_CENTROIDS.get(province, {"lat": 0.0})["lat"],
                "lng": PROVINCE_CENTROIDS.get(province, {"lng": 11.0})["lng"],
                "weight": province_ops[province],
                "risk": province_non_conform[province],
            }
            for province in PROVINCES_GABON
        ],
        "layers": [
            {
                "name": "Opérateurs industriels",
                "status": "actif",
                "source": "operateurs_industriels",
                "count": len(operators),
            },
            {"name": "Sites / zones RIN", "status": "actif", "source": "rin_sites_industriels", "count": len(sites)},
            {"name": "Inspections", "status": "actif", "source": "inspections_conformite", "count": len(inspections)},
            {"name": "Investissements", "status": "actif", "source": "rin_investissements", "count": len(investments)},
            {
                "name": "Déclarations ONI",
                "status": "actif",
                "source": "oni_periodic_declarations",
                "count": len(declarations),
            },
            {
                "name": "Limites administratives",
                "status": "cible",
                "source": "SIG national / shapefiles",
                "count": len(PROVINCES_GABON),
            },
        ],
        "exports": [
            {"label": "Opérateurs GeoJSON", "href": "/geo/export/operateurs.geojson"},
            {"label": "Inspections GeoJSON", "href": "/geo/export/inspections.geojson"},
            {"label": "Export filtrable GeoJSON", "href": "/geo/export.geojson"},
        ],
        "priority_actions": [
            "Géocoder les opérateurs industriels encore sans coordonnées.",
            "Relier les sites RIN à un référentiel formel zone → parcelle → infrastructure.",
            "Superposer inspections, non-conformités et investissements pour prioriser les missions terrain.",
            "Importer les limites administratives officielles afin de passer d'une carte ponctuelle à un vrai SIG ministériel.",
        ],
        "lecture_executive": (
            "Le cockpit SIG transforme les données PNPI en lecture territoriale : couverture provinciale, "
            "opérateurs géocodés, sites, inspections, investissements et zones de priorité deviennent comparables."
        ),
    }


@router.get(
    "/operateurs/nearby",
    response_model=list[OperateurGeoResult],
    summary="Operateurs industriels dans un rayon donne",
)
def nearby_operateurs(
    lat: float = Query(..., description="Latitude du point central"),
    lng: float = Query(..., description="Longitude du point central"),
    radius_km: float = Query(50, ge=0, description="Rayon de recherche en km"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
):
    """Recherche les operateurs industriels situes dans un rayon autour d'un point.

    Utilise ``ST_DWithin`` sur la colonne ``geom`` avec cast geography pour
    des distances precises.  Lorsque ``geom`` est NULL, le calcul se rabat
    sur les colonnes ``latitude`` / ``longitude`` brutes.
    """
    radius_m = radius_km * 1000.0

    sql = text(
        """
        SELECT
            id,
            raison_sociale,
            secteur,
            province,
            latitude,
            longitude,
            ROUND(
                (ST_Distance(
                    COALESCE(
                        geom,
                        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                    )::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) / 1000.0)::numeric,
                2
            ) AS distance_km
        FROM operateurs_industriels
        WHERE
            (latitude IS NOT NULL AND longitude IS NOT NULL)
            AND ST_DWithin(
                COALESCE(
                    geom,
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                )::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius_m
            )
        ORDER BY distance_km
        """
    )

    rows = db.execute(sql, {"lat": lat, "lng": lng, "radius_m": radius_m}).mappings().all()

    return [
        OperateurGeoResult(
            id=row["id"],
            raison_sociale=row["raison_sociale"],
            secteur=row["secteur"],
            province=row["province"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            distance_km=float(row["distance_km"]),
        )
        for row in rows
    ]


@router.get(
    "/operateurs/cluster",
    response_model=list[GeoCluster],
    summary="Clusters d'operateurs par province avec centroide",
)
def cluster_operateurs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
):
    """Agrege les operateurs par province et calcule le centroide reel
    a partir des geometries PostGIS (``ST_Centroid`` + ``ST_Collect``).
    """
    sql = text(
        """
        SELECT
            province,
            COUNT(*) AS nb_operateurs,
            ST_Y(ST_Centroid(ST_Collect(
                COALESCE(
                    geom,
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                )
            ))) AS centroid_lat,
            ST_X(ST_Centroid(ST_Collect(
                COALESCE(
                    geom,
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                )
            ))) AS centroid_lng
        FROM operateurs_industriels
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY province
        ORDER BY nb_operateurs DESC
        """
    )

    rows = db.execute(sql).mappings().all()

    return [
        GeoCluster(
            province=row["province"],
            nb_operateurs=int(row["nb_operateurs"]),
            centroid_lat=float(row["centroid_lat"]) if row["centroid_lat"] is not None else None,
            centroid_lng=float(row["centroid_lng"]) if row["centroid_lng"] is not None else None,
        )
        for row in rows
    ]


@router.get(
    "/inspections/heatmap",
    response_model=list[InspectionHeatPoint],
    summary="Densite des inspections pour carte de chaleur",
)
def inspections_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
):
    """Retourne les points agreges par grille de 0.1 degre pour generer
    une heatmap des inspections.  Utilise ``ST_SnapToGrid`` lorsque la
    colonne ``geom`` est disponible, sinon se rabat sur les colonnes
    ``latitude`` / ``longitude``.
    """
    sql = text(
        """
        SELECT
            ST_Y(snapped) AS latitude,
            ST_X(snapped) AS longitude,
            COUNT(*)::int AS weight
        FROM (
            SELECT
                ST_SnapToGrid(
                    COALESCE(
                        geom,
                        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                    ),
                    0.1
                ) AS snapped
            FROM inspections_conformite
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ) sub
        GROUP BY snapped
        ORDER BY weight DESC
        """
    )

    rows = db.execute(sql).mappings().all()

    return [
        InspectionHeatPoint(
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
            weight=int(row["weight"]),
        )
        for row in rows
    ]


@router.get("/export/operateurs.geojson")
async def export_operateurs_geojson(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Export operators as GeoJSON FeatureCollection."""
    ops = (
        db.execute(
            select(OperateurIndustrielORM).where(
                OperateurIndustrielORM.latitude.isnot(None),
                OperateurIndustrielORM.longitude.isnot(None),
            )
        )
        .scalars()
        .all()
    )

    features = []
    for op in ops:
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [op.longitude, op.latitude],
                },
                "properties": {
                    "id": op.id,
                    "raison_sociale": op.raison_sociale,
                    "nif_gabon": op.nif_gabon,
                    "secteur": op.secteur,
                    "province": op.province,
                    "ville": op.ville,
                    "effectif_declare": op.effectif_declare,
                    "is_active": op.is_active,
                },
            }
        )

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "generated_at": now_utc().isoformat(),
            "count": len(features),
            "source": "PNPI · Ministere de l'Industrie du Gabon",
        },
    }

    return JSONResponse(
        content=geojson,
        media_type="application/geo+json",
        headers={"Content-Disposition": 'attachment; filename="operateurs_pnpi.geojson"'},
    )


@router.get("/export/inspections.geojson")
async def export_inspections_geojson(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    """Export inspections as GeoJSON."""
    inspections = (
        db.execute(
            select(InspectionConformiteORM).where(
                InspectionConformiteORM.latitude.isnot(None),
                InspectionConformiteORM.longitude.isnot(None),
            )
        )
        .scalars()
        .all()
    )

    features = []
    for insp in inspections:
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [insp.longitude, insp.latitude],
                },
                "properties": {
                    "id": insp.id,
                    "statut_conformite": insp.statut_conformite,
                    "inspecteur": insp.inspecteur_username,
                    "date_inspection": insp.date_inspection.isoformat() if insp.date_inspection else None,
                    "observations": insp.observations[:200] if insp.observations else "",
                },
            }
        )

    return JSONResponse(
        content={"type": "FeatureCollection", "features": features},
        media_type="application/geo+json",
        headers={"Content-Disposition": 'attachment; filename="inspections_pnpi.geojson"'},
    )


@router.get("/export.geojson")
async def export_geojson(
    secteur: str | None = Query(None),
    province: str | None = Query(None),
    statut_conformite: str | None = Query(None),
    include_atis: bool = Query(True),
    include_inspections: bool = Query(False),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    """Export filtered GeoJSON for mapping tools (QGIS, Leaflet, etc.)."""
    features = []

    query = select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))
    if secteur:
        query = query.where(OperateurIndustrielORM.secteur == secteur)
    if province:
        query = query.where(OperateurIndustrielORM.province == province)

    ops = db.execute(query).scalars().all()

    for op in ops:
        lat = getattr(op, "latitude", None)
        lng = getattr(op, "longitude", None)

        # Fallback to province centroids
        if not lat or not lng:
            coords = PROVINCE_CENTROIDS.get(op.province, {})
            lat = coords.get("lat", 0.0)
            lng = coords.get("lng", 11.0)

        props = {
            "type": "operateur",
            "id": op.id,
            "raison_sociale": op.raison_sociale,
            "nif": op.nif_gabon,
            "secteur": op.secteur,
            "province": op.province,
            "ville": op.ville or "",
        }

        if include_atis:
            atis = (
                db.execute(
                    select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.operateur_id == op.id)
                )
                .scalars()
                .all()
            )
            props["atis_count"] = len(atis)
            props["atis_approuves"] = sum(1 for a in atis if a.statut == "approuve")

        if include_inspections:
            insps = (
                db.execute(select(InspectionConformiteORM).where(InspectionConformiteORM.operateur_id == op.id))
                .scalars()
                .all()
            )

            if statut_conformite:
                insps = [i for i in insps if i.statut_conformite == statut_conformite]

            props["inspections_count"] = len(insps)
            if insps:
                props["derniere_conformite"] = insps[-1].statut_conformite

        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": props,
            }
        )

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "source": "PNPI · Plateforme Nationale de la Politique Industrielle",
            "generated_at": now_utc().isoformat(),
            "filters": {"secteur": secteur, "province": province},
            "count": len(features),
        },
    }

    return JSONResponse(
        content=geojson,
        media_type="application/geo+json",
        headers={"Content-Disposition": 'attachment; filename="pnpi_operateurs.geojson"'},
    )
