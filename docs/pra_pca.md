# PNPI PRA / PCA (essentiel)

> **Test supervisé exécuté le 10 août 2026** — cf
> [`pra-test-report-2026-08-10.md`](architecture/pra-test-report-2026-08-10.md)
> pour le déroulé complet et les résultats. RTO technique mesuré : ~4,6 min
> (cible 4h). Découverte notable : les fichiers physiques ATI ne sont pas
> couverts par cette procédure (dépend de la finalisation D-001/S3) — la
> bascule de trafic réelle (étape 5) reste à tester.

## Objectifs
- RTO cible: 4 heures
- RPO cible: 1 heure

## Sauvegardes
- Dump PostgreSQL toutes les heures (rotation 7 jours) via `scripts/backup_db.ps1`.
- Sauvegarde quotidienne externe (stockage souverain chiffe).

## Procedure de restauration
1. Isoler l’instance affectee.
2. Provisionner nouvelle base PostgreSQL.
3. Restaurer via `scripts/restore_db.ps1 -BackupFile <dump>`.
4. Lancer verification applicative (`scripts/ci_check.ps1 -SkipFlutter`).
5. Basculer trafic sur instance restauree.

## Controle mensuel
- Test complet de restauration sur environnement preproduction.
- Verification integrite metier:
  - dossiers pilotage,
  - transitions/audit,
  - notifications critiques.

## Supervision minimale
- Surveillance API `/health/detailed` et `/metrics`.
- Alerte immediate si:
  - base `degraded`,
  - hausse erreurs 5xx,
  - dossiers hors SLA en derive.
