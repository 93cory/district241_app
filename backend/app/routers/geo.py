"""PNPI — Endpoints geospatiaux (PostGIS)."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import get_db
from ..models.pnpi import InspectionConformiteORM, OperateurIndustrielORM
from ..models.core import TraceBatchORM

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------


class OperateurGeoResult(BaseModel):
    id: str
    raison_sociale: str
    secteur: str
    province: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: float


class GeoCluster(BaseModel):
    province: str
    nb_operateurs: int
    centroid_lat: Optional[float] = None
    centroid_lng: Optional[float] = None


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
    response_model=List[OperateurGeoResult],
    summary="Operateurs industriels dans un rayon donne",
)
def nearby_operateurs(
    lat: float = Query(..., description="Latitude du point central"),
    lng: float = Query(..., description="Longitude du point central"),
    radius_km: float = Query(50, ge=0, description="Rayon de recherche en km"),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)
    ),
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
    response_model=List[GeoCluster],
    summary="Clusters d'operateurs par province avec centroide",
)
def cluster_operateurs(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur)
    ),
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
    response_model=List[InspectionHeatPoint],
    summary="Densite des inspections pour carte de chaleur",
)
def inspections_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)
    ),
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
