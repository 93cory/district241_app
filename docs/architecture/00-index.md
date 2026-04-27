# Dossier d'architecture PNPI

> **Document interne — Architecture de référence**
> Plateforme Nationale de Pilotage Industriel (PNPI)
> Ministère de l'Industrie de la République Gabonaise
> Auteur : Jean Baptiste MBA NDONG (Architecte / Concepteur)
> Version : 1.0 — Avril 2026

---

## 1. Objet du dossier

Ce dossier rassemble la documentation d'architecture stratégique de la PNPI, à
destination du Cabinet du Ministère de l'Industrie, de la Direction des
Systèmes d'Information de l'État (ANINF) et de toute partie prenante technique
ou institutionnelle. Il a vocation à éclairer trois publics :

1. **Décideurs institutionnels** — comprendre les choix structurants, les
   risques et le coût total de possession.
2. **Équipe d'exploitation (ANINF / future équipe interne)** — disposer du
   socle technique pour reprendre, exploiter et faire évoluer la plateforme.
3. **Auditeurs et partenaires CEMAC** — disposer d'un référentiel d'évaluation
   conforme aux standards internationaux (ISO/IEC 27001, France-Connect,
   Sénégal Numérique, Maroc Digital).

Il **complète** sans le remplacer le dossier stratégique
(`docs/strategie/01-05`) qui traite la posture juridique, le pricing et le
modèle financier.

## 2. Cartographie du dossier

| # | Document | Propos | Statut |
|---|---|---|---|
| 00 | `00-index.md` | Table d'orientation du dossier | Stable |
| ADR-001 | `adr-001-auth-jwt-cookies.md` | Authentification JWT + cookies httpOnly | Accepté |
| ADR-002 | `adr-002-rbac-six-roles.md` | RBAC à 6 rôles + helper `check_ati_access` | Accepté |
| ADR-003 | `adr-003-hebergement-souverain-aninf.md` | Hébergement souverain ANINF | Accepté |
| ADR-004 | `adr-004-multi-tenant-cemac.md` | Stratégie multi-tenant CEMAC (instance dédiée) | Proposé |
| ADR-005 | `adr-005-signature-electronique-qualifiee.md` | Signature électronique qualifiée et autorité de certification | Proposé |
| Dette | `dette-technique.md` | Backlog dette chiffré en jours-homme | Vivant |
| Cible | `cible-12-mois.md` | Architecture cible à 12 mois | Vivant |
| Plan | `plan-mise-en-prod-j0-j90.md` | Calendrier de mise en production J0–J+90 | Vivant |
| CEMAC | `multi-tenant-cemac.md` | Plan d'industrialisation multi-pays CEMAC | Vivant |
| Risques | `risk-register.md` | Registre des risques (technique, juridique, opérationnel) | Vivant |

**Légende statut**
- *Accepté* : décision prise, mise en œuvre dans le code de référence.
- *Proposé* : décision à arbitrer formellement avec le Cabinet et l'ANINF.
- *Vivant* : document mis à jour régulièrement (a minima trimestriellement).

## 3. Cadre de référence

Le dossier suit les conventions suivantes :

- **ADR** : format MADR (*Markdown Any Decision Records*) — Title, Status,
  Context, Decision, Consequences (positives, négatives, suivi).
- **Risques** : score = Probabilité × Impact (1 à 5), traitement
  Évite/Réduit/Transfère/Accepte.
- **Dette technique** : chiffrage en jours-homme (j-h), criticité
  CRITIQUE/HAUTE/MOYENNE/BASSE.
- **Comparables** : France-Connect (FR), Sénégal Numérique (Service Public+),
  Maroc Digital (Watiqa), Estonia X-Road, Rwanda Irembo.

## 4. État de la plateforme (instantané avril 2026)

| Indicateur | Valeur |
|---|---|
| Endpoints API | ~40 modules `routers/` (~250+ endpoints) |
| Migrations Alembic | 36 (du `20260322_18` au `20260427_36`) |
| Tests automatisés backend | 18 fichiers, ~43+ tests pytest |
| Tests E2E frontend | 5 suites Playwright |
| Lignes de code (estimation) | ~45 000 (back) + ~25 000 (front) + Flutter mobile |
| Rôles RBAC | 6 (admin, ministre, directeur, instructeur, inspecteur, operateur) |
| Couverture fonctionnelle | ATI complet, inspections, pilotage, audit, exports, GraphQL, websockets |
| Hébergement actuel | Mono-instance, dev local + image Docker prod prête |

## 5. Mode d'emploi pour l'audience ministérielle

Lors de la présentation au Cabinet :
1. Ouvrir avec `docs/strategie/01-cadrage-strategique.md` (posture C hybride).
2. Présenter la cible 12 mois (`cible-12-mois.md`) comme la trajectoire.
3. Sortir le `risk-register.md` pour montrer la maîtrise des risques.
4. Conclure sur le `plan-mise-en-prod-j0-j90.md` pour cadrer l'engagement
   opérationnel.
5. Garder en réserve les ADR-004 et ADR-005 — décisions à arbitrer en comité.

## 6. Gouvernance documentaire

- Toute modification d'un ADR accepté donne lieu à un **nouvel ADR** qui
  l'amende ou le supersède (jamais d'écrasement).
- La dette technique et le registre des risques sont revus à chaque revue
  trimestrielle (T1/T2/T3/T4).
- Le plan J0–J+90 devient un retour d'expérience une fois consommé, archivé
  dans `docs/architecture/historique/`.

---

*Fin du document.*
