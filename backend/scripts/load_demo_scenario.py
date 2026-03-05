from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import (  # noqa: E402
    Base,
    DeclarationORM,
    NotificationORM,
    SessionLocal,
    TraceBatchORM,
    UnitORM,
    engine,
    seed_if_empty,
    seed_user_accounts,
)


def reset_schema() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def add_demo_units_and_declarations() -> None:
    demo_units = [
        UnitORM(
            id="UI101",
            name="Cluster Bois Nord Gabon",
            sector="Bois",
            capacity=1800,
            equipment="Scierie CNC, ligne sechage, controle qualite",
            location="Ogooue-Ivindo",
            status="active",
        ),
        UnitORM(
            id="UI102",
            name="Complexe Agro Estuaire",
            sector="Agroalimentaire",
            capacity=1500,
            equipment="Conditionnement sterile, laboratoire HACCP",
            location="Libreville",
            status="active",
        ),
        UnitORM(
            id="UI103",
            name="Plateforme Halieutique Sud",
            sector="Peche",
            capacity=1100,
            equipment="IQF, chambre froide, traçabilite QR",
            location="Port-Gentil",
            status="active",
        ),
        UnitORM(
            id="UI104",
            name="Transformation Cacao Haut-Ogooue",
            sector="Cacao",
            capacity=700,
            equipment="Fermentation pilote, broyage fin",
            location="Franceville",
            status="active",
        ),
        UnitORM(
            id="UI105",
            name="Filiere Manioc Sud",
            sector="Manioc",
            capacity=650,
            equipment="Sechage solaire, granulation",
            location="Tchibanga",
            status="inactive",
        ),
    ]

    demo_declarations = [
        DeclarationORM(
            id="PD-UI101-202603",
            unit_id="UI101",
            month=date(2026, 3, 1),
            volume_tons=520,
            jobs=295,
            validated=True,
            submitted_at=datetime(2026, 3, 28, tzinfo=timezone.utc),
            submitted_by="industriel",
        ),
        DeclarationORM(
            id="PD-UI102-202603",
            unit_id="UI102",
            month=date(2026, 3, 1),
            volume_tons=460,
            jobs=250,
            validated=True,
            submitted_at=datetime(2026, 3, 27, tzinfo=timezone.utc),
            submitted_by="industriel",
        ),
        DeclarationORM(
            id="PD-UI103-202603",
            unit_id="UI103",
            month=date(2026, 3, 1),
            volume_tons=390,
            jobs=210,
            validated=False,
            submitted_at=datetime(2026, 3, 29, tzinfo=timezone.utc),
            submitted_by="inspecteur",
        ),
        DeclarationORM(
            id="PD-UI104-202603",
            unit_id="UI104",
            month=date(2026, 3, 1),
            volume_tons=280,
            jobs=165,
            validated=True,
            submitted_at=datetime(2026, 3, 26, tzinfo=timezone.utc),
            submitted_by="industriel",
        ),
        DeclarationORM(
            id="PD-UI105-202603",
            unit_id="UI105",
            month=date(2026, 3, 1),
            volume_tons=130,
            jobs=74,
            validated=False,
            submitted_at=datetime(2026, 3, 25, tzinfo=timezone.utc),
            submitted_by="inspecteur",
        ),
    ]

    demo_batches = [
        TraceBatchORM(
            batch_id="B202603-101",
            product="Planches bois premium",
            origin="Mekambo",
            factory="Cluster Bois Nord Gabon",
            certification="PEFC",
            quantity_tons=66,
            timestamp=datetime(2026, 3, 28, tzinfo=timezone.utc),
            qr_code="https://pnpi-gabon/qr/B202603-101",
        ),
        TraceBatchORM(
            batch_id="B202603-102",
            product="Conserve poisson filete",
            origin="Zone maritime sud",
            factory="Plateforme Halieutique Sud",
            certification="HACCP",
            quantity_tons=48,
            timestamp=datetime(2026, 3, 29, tzinfo=timezone.utc),
            qr_code="https://pnpi-gabon/qr/B202603-102",
        ),
        TraceBatchORM(
            batch_id="B202603-103",
            product="Pate cacao transformee",
            origin="Haut-Ogooue",
            factory="Transformation Cacao Haut-Ogooue",
            certification="Origine Controlee",
            quantity_tons=36,
            timestamp=datetime(2026, 3, 30, tzinfo=timezone.utc),
            qr_code="https://pnpi-gabon/qr/B202603-103",
        ),
    ]

    demo_notifications = [
        NotificationORM(
            id="N-DEMO-001",
            target_role="inspecteur",
            title="Validation terrain urgente",
            message="Verifier la declaration PD-UI103-202603 avant arbitrage ministeriel.",
            severity="critical",
            created_at=datetime(2026, 3, 30, tzinfo=timezone.utc),
            is_read=False,
        ),
        NotificationORM(
            id="N-DEMO-002",
            target_role="ministere",
            title="Ecart import agroalimentaire",
            message="Consolider plan de substitution sur 2 trimestres.",
            severity="high",
            created_at=datetime(2026, 3, 30, tzinfo=timezone.utc),
            is_read=False,
        ),
    ]

    with SessionLocal() as db:
        db.add_all(demo_units)
        db.add_all(demo_declarations)
        db.add_all(demo_batches)
        db.add_all(demo_notifications)
        db.commit()


def main() -> None:
    reset_schema()
    with SessionLocal() as db:
        seed_if_empty(db)
        seed_user_accounts(db)
    add_demo_units_and_declarations()
    print("Demo scenario loaded successfully.")


if __name__ == "__main__":
    main()

