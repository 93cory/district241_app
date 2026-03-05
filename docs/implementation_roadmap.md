# Feuille de Route PNPI (Execution)

## Vision d'execution
Construire une plateforme institutionnelle souveraine qui transforme les donnees industrielles en decisions ministerielles: reduction des importations, augmentation de la valeur locale, creation d'emplois industriels.

## Phase 1 (2-3 semaines) - Socle MVP institutionnel
- Stabiliser backend FastAPI avec auth JWT + roles.
- Brancher PostgreSQL pour `units`, `declarations`, `batches`, `users`, `logs`.
- Exposer CRUD complet des unites et lots.
- Fiabiliser dashboard Next.js avec auth serveur et gestion d'erreur.
- Fiabiliser mobile Flutter pour declaration terrain + scan QR.
- Objectif de sortie:
  - 1 demo end-to-end fonctionnelle.
  - Donnees pilote realistes Gabon (5 secteurs, 20 unites, 50 lots).

## Phase 2 (3-5 semaines) - Industrialisation applicative
- Modulariser backend (`auth`, `units`, `batches`, `dashboard`, `admin`).
- Ajouter migrations DB et seeds reproductibles.
- Ajouter audit trail detaille + validation anti-informel.
- Ajouter exports CSV/PDF institutionnels.
- Objectif de sortie:
  - Environnement de preproduction.
  - Suite de tests API critique automatisee.

## Phase 3 (4-6 semaines) - Pilotage strategique
- Ajouter previsions de production et simulation d'import.
- Ajouter tableau de bord KPI nationaux (baseline vs cible 2028).
- Ajouter observabilite (logs structurels, metriques, alertes).
- Ajouter workflow d'administration complet (gestion utilisateurs/roles).
- Objectif de sortie:
  - Version "presentation ministerielle" robuste.
  - Dossier d'aide a la decision (impacts macro-economiques).

## Phase 4 (continu) - Securite et souverainete
- Durcir IAM, politiques mot de passe, secrets manager.
- CI/CD souverain (build, tests, deploiement, rollback).
- Sauvegardes, PRA/PCA, supervision continue.

## KPI de pilotage du projet
- Taux de declarations mensuelles valides.
- Volume local transforme vs volume importe.
- Nombre d'emplois industriels traces.
- Nombre de lots traces par QR.
- Delai moyen de validation inspecteur.

