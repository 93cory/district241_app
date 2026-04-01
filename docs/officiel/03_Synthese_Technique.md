# SYNTHESE TECHNIQUE ET FONCTIONNELLE

## Plateforme Nationale du Pilotage Industriel (PNPI)

---

### VUE D'ENSEMBLE

La PNPI est construite sur une architecture moderne, securisee et evolutive :

**Backend (API REST + GraphQL)**
- Framework : FastAPI (Python 3.12)
- 34 modules API, 206+ endpoints
- Authentification JWT avec refresh tokens
- 2FA/TOTP avec codes de secours
- Rate limiting et protection anti-brute-force
- Audit trail sur toutes les operations sensibles
- WebSocket pour les notifications temps reel

**Frontend Web (PWA)**
- Framework : Next.js 14 (React 19, TypeScript)
- 110+ pages fonctionnelles
- Progressive Web App (installation, offline)
- Dark mode automatique + manuel
- Accessibilite WCAG 2.1 AA (haut contraste, taille police, lecteur d'ecran)
- Raccourcis clavier (Ctrl+K = palette de commandes)
- Responsive (mobile, tablette, desktop)

**Application Mobile**
- Framework : Flutter (Dart)
- 27 ecrans complets
- Authentification biometrique (empreinte/Face ID)
- QR code scanner
- GPS + geofencing pour inspections
- Mode offline avec synchronisation
- Deep links (pnpi://ati/...)

**Infrastructure**
- Docker Compose (dev) + Docker Compose Production (Nginx SSL)
- PostgreSQL 16 + PostGIS 3.4
- MinIO pour le stockage objet (backups, documents)
- Prometheus + Grafana pour le monitoring
- GitHub Actions pour le CI/CD
- 33 tables de donnees, 31 migrations Alembic

### SECURITE

| Mesure | Detail |
|--------|--------|
| Chiffrement mots de passe | bcrypt (salt automatique) |
| Tokens JWT | Access (60min) + Refresh (14j) |
| 2FA | TOTP compatible Google Authenticator |
| Codes de secours | 10 codes usage unique |
| Verrouillage compte | 5 echecs → blocage 15min |
| Rate limiting | 15 req/min sur /auth, 60/min general |
| CORS | Restreint aux domaines autorises |
| Audit trail | Chaque action tracee (acteur, horodatage, detail) |
| Cookies | httpOnly, SameSite=Lax, Secure en production |
| API externe | Cles API avec comparaison constant-time |

### MODULES FONCTIONNELS (34)

1. **auth** — Authentification, tokens, refresh
2. **totp** — 2FA, setup, verification, codes secours
3. **ati** — CRUD ATI, transitions, certificats, triage, favoris, tags, commentaires, risque, recommandation
4. **operateurs** — CRUD operateurs, scoring, timeline, import CSV
5. **inspections** — CRUD inspections, photos, rapport PDF, geofencing
6. **documents** — Upload, versioning
7. **exports** — PDF, Excel, PowerPoint, ZIP, GeoJSON, QR batch, lettres officielles, archives
8. **pnpi_dashboard** — KPIs, predictions, benchmark, comparaison, multi-annees, impact, qualite donnees, alertes, stats avancees, budget, social, timing workflow
9. **pilotage** — Workflow ministeriel
10. **admin** — Utilisateurs, audit log, SMS
11. **notifications** — CRUD notifications
12. **messages** — Messagerie interne
13. **calendar** — Evenements ATI + inspections
14. **reports** — Constructeur de rapports, tableau croise
15. **templates** — Modeles ATI par secteur
16. **workflows** — Regles automatiques
17. **heatmap** — Non-conformites par province
18. **delegations** — Transfert temporaire dossiers
19. **reminders** — Rappels automatiques SLA
20. **notes** — Notes personnelles
21. **feedback** — Satisfaction operateur
22. **checklists** — Conformite structuree
23. **announcements** — Annonces broadcast
24. **polls** — Sondages internes
25. **conventions** — Accords-cadres
26. **geo** — Endpoints geospatiaux, export GeoJSON
27. **health** — Sante systeme, monitoring
28. **ws** — WebSocket temps reel
29. **integration** — API pour douanes/impots/emploi
30. **integration_health** — Monitoring integrations
31. **scheduled_reports** — Rapports planifies
32. **graphql_api** — API GraphQL
33. **doc_versions** — Versioning documents
34. **units** — Unites industrielles

### PAGES FRONTEND (110+)

**Tableaux de bord** : Dashboard principal, Synthese executive, Temps reel, Provincial, Personnalise

**ATI** : Liste, Detail (avec SLA clock, risque, recommandation IA, checklist, tags, commentaires, historique champ), Kanban, Triage, Favoris, Renouvellements

**Operateurs** : Liste, Detail (scoring, timeline, certifications), Carte interactive Leaflet

**Inspections** : Liste, Detail, Heatmap, Geofencing

**Analytics** : Statistiques, Stats avancees, Predictions, Comparaison, Multi-annees, Benchmark provincial, CEMAC, Tableau croise, Timing workflow, Alertes IA

**Impact** : Economique, Social, Carbone, ODD, Budget, Simulateur ROI

**Communication** : Messages, Calendrier, Annuaire, Notes, Sondages, Feedback, Annonces

**Administration** : Users, Audit log, Workflows, Securite, Integrations, API Usage, Newsletter, Rapports planifies, Organigramme, RACI

**Public** : Investisseurs, Open Data, Contact, Statut systeme, Verification ATI/operateur/produit, About, Changelog, API Docs, Marketplace, Formation, Reglementation, Success stories, Roadmap

### DONNEES DE DEMONSTRATION

- 6 utilisateurs (1 par role)
- 35 operateurs industriels repartis sur 9 provinces
- 60 ATIs dans tous les statuts
- 10 inspections de conformite
- Donnees realistes (noms, NIF, secteurs gabonais)

---

**La plateforme est 100% operationnelle et prete pour une demonstration live.**
