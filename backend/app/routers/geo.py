"""PNPI · Endpoints geospatiaux (PostGIS)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..core.auth import Role, User, get_current_user, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM, OperateurIndustrielORM

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
    current_user: User = Depends(get_current_user),
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
