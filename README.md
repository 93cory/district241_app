# PNPI — Plateforme Nationale de la Politique Industrielle

**Republique Gabonaise — Ministere de l'Industrie et de la Transformation Locale**

Plateforme souveraine de gouvernance industrielle numerique couvrant le cycle complet des Agrements Techniques Industriels (ATI), le suivi des operateurs, les inspections de conformite, l'aide a la decision par IA, et le pilotage strategique de la politique industrielle.

---

## Chiffres cles

| Metrique | Valeur |
|---|---|
| Pages frontend | 103 |
| Backend routers | 35 |
| Core modules | 23 |
| Migrations DB | 27 |
| Tests | 8 suites E2E + 7 backend |
| Lignes de code | ~37 000 |
| Fonctionnalites | 200+ |

---

## Architecture technique

### Backend — FastAPI + PostgreSQL/PostGIS

- **Framework** : FastAPI (Python 3.12), async, OpenAPI
- **Base de donnees** : PostgreSQL 16 + PostGIS 3.4, 27 migrations Alembic
- **35 routers** : auth, totp, ati, operateurs, inspections, exports, pnpi_dashboard, pilotage, admin, geo, health, ws, messages, calendar, delegations, reminders, notes, feedback, polls, conventions, reports, templates, workflows, checklists, announcements, scheduled_reports, doc_versions, heatmap, integration, integration_health, graphql_api
- **23 core modules** : scoring, risk_assessment, decision_engine, anomaly_detection, certificate, inspection_report, signature, workflow_engine, field_tracker, metrics, tenant, digest, badges, email, sms, webhooks, analytics, executive_report, email_templates
- **WebSocket** : notifications temps reel
- **Securite** : JWT + refresh, RBAC (6 roles), 2FA/TOTP, rate limiting, backup codes
- **Monitoring** : Prometheus metrics, health checks detailles
- **API GraphQL** : endpoint complementaire POST /graphql

### Frontend — Next.js 15

- **Framework** : Next.js 15 App Router, React 19, TypeScript
- **103 pages** couvrant 10 categories fonctionnelles
- **PWA** : Service Worker, manifest, installation offline
- **Dark mode** : automatique + toggle manuel (3 etats)
- **Accessibilite** : WCAG 2.1 AA, haut contraste, police dyslexie, taille ajustable
- **Command palette** : Ctrl+K pour navigation rapide
- **Raccourcis clavier** : g+d (dashboard), g+a (ATI), g+m (messages), etc.
- **Chatbot** : assistant FAQ integre avec 17 reponses
- **SEO** : sitemap.xml, robots.txt, meta tags

### Mobile — Flutter

- **28 ecrans** : dashboard, ATI, inspections, operateurs, carte, profil, 2FA, etc.
- **Providers** : Auth, Notifications, Connectivity (offline banner)
- **Biometrie** : fingerprint / Face ID
- **Deep links** : pnpi://ati/{id}, pnpi://inspection/{id}
- **Offline** : cache API avec TTL, file d'attente hors-ligne
- **i18n** : francais + anglais
- **Dark mode** : ThemeData.dark automatique

### Infrastructure

- **Docker** : docker-compose.yml (dev) + docker-compose.prod.yml (prod)
- **Nginx** : reverse proxy SSL, compression gzip
- **CI/CD** : GitHub Actions (build → GHCR → deploy SSH)
- **Monitoring** : Prometheus + Grafana dashboards
- **Backup** : S3/MinIO automatise avec retention 30 jours
- **Cron** : rapport hebdo, SLA check, cleanup tokens

---

## Pages publiques (sans authentification)

| Page | URL | Description |
|---|---|---|
| Investisseurs | /investors | Vitrine pour investisseurs internationaux |
| Open Data | /open-data | Jeux de donnees et transparence |
| Contact | /contact | Formulaire de contact ministeriel |
| Statut | /status | Etat operationnel du systeme |
| Uptime | /status/history | 90 jours de disponibilite |
| Verification ATI | /verify/ati/{num} | Verification publique par QR code |
| Verification produit | /verify/product | Authenticite des produits industriels |
| Verification operateur | /verify/operateur/{nif} | Carte d'identite numerique operateur |
| A propos | /about | Presentation de la plateforme |
| Kiosque | /kiosk | Affichage TV/ecran public |
| Widgets | /embed | Widgets iframe embarquables |
| CGU | /legal/cgu | Conditions d'utilisation |
| Confidentialite | /legal/confidentialite | Politique de confidentialite |
| Accessibilite | /legal/accessibilite | Declaration WCAG |
| Plan du site | /plan-du-site | 103 pages repertoriees |

---

## Fonctionnalites (200+)

### Intelligence artificielle
- Recommandation de decision ATI (scoring de similarite)
- Scoring de risque composite (6 facteurs)
- Scoring conformite operateur (5 piliers, grades A-E)
- Alertes intelligentes (6 detecteurs d'anomalies)
- Predictions (tendances, previsions 3 mois, croissance sectorielle)

### Workflow & Process
- Pipeline ATI complet (soumission → instruction → validation → decision)
- Kanban drag-and-drop
- Workflow engine avec regles personnalisables
- Checklists de conformite par secteur
- Renouvellements automatises
- Templates ATI pre-remplis (10 modeles, 7 secteurs)
- Delegations temporaires entre instructeurs

### Documents & Exports
- Certificat officiel PDF avec QR code
- Lettres ministerielles (approbation, rejet, accuse)
- Rapport d'inspection PDF
- Export Excel (ATI, operateurs) avec mise en forme
- Export PowerPoint briefing executif
- Export ZIP documents
- Export GeoJSON filtre
- QR codes en lot (batch PDF)
- Signature electronique SHA-256
- Archivage numerique longue duree

### Analytics & Reporting
- Dashboard temps reel (10s refresh)
- Synthese executive
- Comparaison periodique (trimestre vs trimestre)
- Comparatif multi-annees (3 ans)
- Benchmark provincial (score composite)
- Benchmark CEMAC (6 pays)
- Tableau croise dynamique (pivot table)
- Constructeur de rapports no-code
- Dashboard builder personnalisable (6 widgets)
- Temps par etape workflow (moyenne/mediane/P90)
- Performance instructeurs

### Impact & Strategie
- Impact economique (emplois, investissement, multiplicateurs sectoriels)
- Impact social (femmes, jeunes, provinces)
- Empreinte carbone (CO2 par secteur, arbres de compensation)
- Dashboard ODD Nations Unies (objectifs 8, 9, 12, 13, 17)
- Suivi budgetaire (couts FCFA/EUR par ATI)
- Simulateur ROI investisseurs
- Conventions et accords-cadres
- Feuille de route strategique 2024-2028
- Certifications qualite (ISO, FSC, HACCP, CEMAC NF)

### Communication & Collaboration
- Messagerie interne (inbox, threads)
- Commentaires sur ATI (internes/visibles)
- Tags personnalises avec couleurs
- Sondages internes avec resultats en temps reel
- Annuaire des contacts
- Annonces broadcast par role
- Newsletter avec templates
- Feedback et satisfaction (etoiles + commentaires)
- Calendrier (ATI, inspections, SLA, expirations)
- Activity feed (timeline)
- Notes personnelles (sticky notes)
- Favoris / epingles ATI

### Securite & Governance
- 2FA TOTP + codes de secours
- Authentification biometrique mobile
- Geofencing des inspections (Haversine)
- Journal d'audit avec recherche/export
- Matrice RACI par etape
- Organigramme des roles
- Field-level change tracking
- Versioning des documents
- Multi-tenant par province
- Dashboard securite (tentatives intrusion)
- Signature electronique sur certificats

### UX & Accessibilite
- Dark mode (auto + manuel 3 etats)
- PWA offline avec Service Worker
- Command palette Ctrl+K
- Raccourcis clavier (12 combinaisons)
- Onboarding tour (7 etapes)
- Chatbot FAQ integre (17 reponses)
- Skeleton loaders anime
- Toasts notifications
- Dialogues de confirmation
- Validation inline temps reel
- Menu hamburger responsive
- Taille texte ajustable (80-150%)
- Mode haut contraste
- Police dyslexie
- Bandeau cookies
- Badges/gamification (11 badges)
- Mode presentation slides

---

## Demarrage rapide

### Prerequis
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+
- Flutter SDK 3.11+
- PostgreSQL 16 + PostGIS

### Dev

```bash
# Backend
cd backend && pip install -r requirements.txt
alembic upgrade head
python scripts/seed_pnpi.py
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Flutter
flutter pub get && flutter run
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Tests

```bash
# Backend
cd backend && pytest

# Frontend E2E
cd frontend && npx playwright test

# Flutter
flutter test
```

---

## Liens

- **Statut** : /status
- **API Docs** : /api/docs (Swagger UI)
- **GraphQL** : POST /graphql
- **Open Data** : /open-data
- **Changelog** : /changelog
- **Plan du site** : /plan-du-site

---

## Licence

Propriete du Ministere de l'Industrie et de la Transformation Locale de la Republique Gabonaise.
Les donnees publiques sont disponibles sous licence Open Data Gabon.

---

*Construit avec Next.js, FastAPI, Flutter, PostgreSQL, Docker, Prometheus.*
*47 commits | 375 fichiers | +37 226 lignes.*
