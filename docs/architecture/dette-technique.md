# Dette technique chiffrée — PNPI

> **Document interne** · Architecture PNPI · Version 1.0 — Avril 2026
> Auteur : Jean Baptiste MBA NDONG (Architecte)

---

## 1. Méthode

Sont listés ici les éléments connus de **dette technique active** : choix
provisoires, raccourcis assumés, manques fonctionnels ou non-fonctionnels
identifiés à date.

- **Catégories** : Sécurité (SEC), Performance (PERF), Qualité (QUA),
  Données (DATA), Mobile (MOB), Infrastructure (INFRA), Documentation
  (DOC), Conformité (CONF), Frontend (FE), Backend (BE).
- **Criticité** : CRITIQUE / HAUTE / MOYENNE / BASSE.
- **Effort** : jours-homme (j-h), tout compris (analyse, dev, tests, doc).
- **Recommandation** : Fix (à corriger), Accept (acceptée tant que…),
  Contourner (mitigation).

Les efforts sont des estimations *à dire d'expert* d'un développeur senior
familier de la stack. Ils n'incluent pas la coordination, les revues
externes, les bascules de production.

## 2. Synthèse

| Indicateur | Valeur |
|---|---|
| Nombre d'items répertoriés | **27** |
| Total effort estimé | **183 jours-homme** |
| Items CRITIQUES | 4 (38 j-h) |
| Items HAUTS | 9 (74 j-h) |
| Items MOYENS | 9 (53 j-h) |
| Items BAS | 5 (18 j-h) |
| Recommandation Fix | 22 (162 j-h) |
| Recommandation Accept (avec suivi) | 4 (16 j-h) |
| Recommandation Contourner | 1 (5 j-h) |

**Lecture** : pour amener la PNPI à un niveau de production institutionnel
*sans* aucun trou structurel, il faut compter ~9 mois-homme d'investissement
développement. Avec une équipe de 2 développeurs full-time, c'est faisable
en 18-22 semaines calendaires.

## 3. Items CRITIQUES (à fixer avant ouverture officielle)

### D-001 — Stockage local des documents ATI (filesystem) sans réplication
- **Catégorie** : INFRA / DATA
- **Description** : `PNPI_UPLOAD_DIR=uploads/ati` est un répertoire local du
  conteneur. Aucun backup automatisé. Si le volume Docker est perdu, tous
  les documents joints (justificatifs de capacité, plans d'unités, photos
  d'inspection) sont perdus.
- **Effort** : 8 j-h (mise en place MinIO + migration + config + tests).
- **Bloquants** : provisioning MinIO ANINF.
- **Recommandation** : **Fix** — migration vers MinIO S3-compatible avec
  réplication.

### D-002 — Absence d'audit de pénétration externe sur la version actuelle
- **Catégorie** : SEC / CONF
- **Description** : aucun pentest externe formel n'a été conduit. Les
  endpoints `/admin/*`, `/auth/*`, `/pnpi/ati/*` exposent une logique
  régalienne sans vérification adverse indépendante.
- **Effort** : 10 j-h (préparation + remédiation moyenne attendue ; le
  pentest lui-même est externalisé).
- **Bloquants** : sélection prestataire, validation Cabinet.
- **Recommandation** : **Fix** — pentest planifié à J+15 (cf. plan
  J0-J+90).

### D-003 — Pas de chiffrement au repos sur la base PostgreSQL de prod
- **Catégorie** : SEC / CONF
- **Description** : la base de production prévue n'active pas, à ce jour,
  le chiffrement au repos (TDE / pg_crypto sur colonnes sensibles : NIF,
  effectif, données personnelles).
- **Effort** : 12 j-h (étude + chiffrement par colonne + KMS + migration).
- **Bloquants** : choix d'un KMS (ANINF ou interne).
- **Recommandation** : **Fix** — exigence CNPDCP.

### D-004 — Tests de charge inexistants — OUTILLAGE EN PLACE, hypothese 1000 users NON validee (lot 96)
- **Catégorie** : PERF
- **Description initiale** : aucun test de charge (k6, Locust) n'avait été
  exécuté. Les hypothèses de capacité (1000 utilisateurs concurrents,
  100 ATI/jour) n'étaient pas validées.
- **Ce qui a ete fait** : `scripts/load-test/k6-scenario.js` (scenarios
  read_heavy + write_light, executable via `docker run grafana/k6`),
  execute contre l'environnement de dev local reel (pas iso-prod).
  Endpoints testes : dashboard, liste ATI, liste operateurs, KPIs,
  recherche globale, creation operateur + ATI.
- **Resultats obtenus (dev local, faible concurrence)** : latence read
  p95 ≈ 33ms, write p95 ≈ 49ms — aucun signal de lenteur cote code aux
  niveaux de charge testes.
- **Decouverte architecturale importante** (pas un bug applicatif, mais un
  risque reel a date) : le rate limiter (`core/rate_limiter.py`) est
  keye par **chemin exact + IP source** (`path:{path}:{ip}`), avec un
  budget de `PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS` (60 par defaut) par
  `PNPI_RATE_LIMIT_WINDOW_SECONDS` (60s) — **par route**, pas un budget
  global. Consequence : plusieurs dizaines d'utilisateurs legitimes
  partageant une meme IP de sortie (NAT d'un batiment ministeriel,
  proxy sortant) peuvent collectivement declencher des 429 les uns pour
  les autres sur une route tres utilisee (ex: liste ATI), sans qu'aucun
  d'eux n'abuse individuellement. C'est exactement le scenario "150-250
  utilisateurs nominaux" vise par la cible 12 mois si une part notable
  se trouve derriere le meme NAT.
- **Hypothese "1000 utilisateurs concurrents" toujours NON validee** :
  ce test s'est deliberement limite a une poignee de VUs (memes
  contraintes de rate limiting per-IP en environnement de dev). Reste
  bloquant : environnement iso-prod ET/OU generateur de charge
  multi-IP (pour simuler des utilisateurs reellement distribues) ET/OU
  une politique de rate limiting revue (cle par utilisateur authentifie
  plutot que par IP, pour les routes post-authentification).
- **Effort restant** : ~4 j-h (revoir la cle du rate limiter pour les
  routes authentifiees + campagne de charge sur un environnement
  iso-prod une fois disponible).
- **Recommandation** : **Fix** — traiter la cle de rate limiting par
  utilisateur (JWT `sub`) en plus de l'IP pour les routes `/pnpi/*`
  avant l'ouverture officielle ; le test de charge complet reste
  conditionne a un environnement iso-prod.

## 4. Items HAUTS

### D-005 — Mix `Role` enum / chaîne dans la base — RESOLU (lot 94)
- **Catégorie** : QUA / SEC
- **Description initiale** : les rôles utilisateurs sont stockés en `str`
  dans `users.roles_csv`, manipulés en `Role` (StrEnum) en Python. La
  logique de normalisation (`{r.value if hasattr(r, "value") else str(r)
  for r in current_user.roles}`) était **copiée-collée independamment dans
  8 modules** (ati.py, calendar.py, chat.py, core/tenant.py, operateurs.py
  x3, rin.py, units.py) — plus 2 constantes `PRIVILEGED_ROLES` dupliquees
  (ati.py, calendar.py, operateurs.py x3, units.py, oni.py, rin.py).
- **Fix applique** : point d'entree unique `core/auth.py::user_role_values()`
  + `core/auth.py::PRIVILEGED_ROLES`. Les 8+7 duplications remplacees par
  des imports (alias locaux la ou la fonction etait appelee de nombreuses
  fois, pour minimiser le diff). Le schema DB (`roles_csv`) n'a pas ete
  touche — la vraie dette etait la duplication de la couche de
  normalisation Python, pas le stockage CSV lui-meme (deja converti
  proprement via `csv_to_roles()`/`roles_to_csv()`).
- **Effort reel** : ~2 j-h (recherche exhaustive des duplications + refactor
  + 4 nouveaux tests).

### D-006 — Couverture de test backend ~50 % effective — 4 routers cibles couverts (lot 98)
- **Catégorie** : QUA
- **Description initiale** : 18 fichiers de tests, ~43 tests, mais des
  routers entiers (graphql_api, push, scheduled_reports, ws) n'etaient pas
  couverts.
- **Fait** : les 4 routers explicitement cites sont maintenant couverts
  (30 nouveaux tests) — auth/roles, cas nominaux, cas d'erreur, et
  regressions de securite specifiques (vol d'abonnement push, endpoint SSRF
  hors allowlist, WebSocket avec token invalide).
- **Bug reel trouve et corrige en ecrivant ces tests** :
  `graphql_api.py::_resolve_operateurs` lisait `o.email`/`o.telephone`,
  des attributs qui n'existent pas sur `OperateurIndustrielORM` (vrais
  noms : `contact_email`/`contact_telephone`) — 500 systematique sur
  *toute* requete GraphQL `operateurs` depuis que ce resolver existe,
  jamais detecte faute de test. Confirme en direct (curl contre le
  backend reel) avant et apres correction.
- **Reste a faire** : ce lot ferme le symptome explicitement cite dans la
  description initiale, pas l'objectif global "75% sur le perimetre
  regalien". ~35+ autres routers n'ont pas de fichier de test dedie
  (certains sont couverts indirectement via test_api.py/test_idor_fixes.py
  etc., d'autres pas du tout — audit exhaustif restant a faire).
- **Effort restant** : ~12 j-h pour l'objectif 75% initial (le present lot
  represente environ 2-3 j-h).
- **Recommandation** : **Fix** — prioriser les routers manipulant des
  decisions ATI et des donnees sensibles (business_model, security_ops,
  admin) pour la prochaine tranche.

### D-007 — Pas de tests E2E mobile (Flutter)
- **Catégorie** : MOB / QUA
- **Description** : l'app mobile n'a pas de tests d'intégration
  (`flutter_driver` / Patrol).
- **Effort** : 12 j-h.
- **Recommandation** : **Fix** — au moins 5 scénarios critiques inspecteur.

### D-008 — Refresh token : rotation non implémentée
- **Catégorie** : SEC
- **Description** : le refresh token actuel n'est pas révoqué/regénéré à
  chaque usage (best practice OAuth2 RFC 6819).
- **Effort** : 5 j-h.
- **Recommandation** : **Fix**.

### D-009 — Pas de monitoring d'erreurs centralisé — CODE FAIT, infra a choisir (lot 97)
- **Catégorie** : INFRA / QUA
- **Description initiale** : les erreurs sont logguées en JSON (Loki/Grafana)
  mais sans outil de dédoublonnage ni d'alerting fin par release.
- **Fait** : `core/error_tracking.py` — client compatible protocole Sentry
  (`sentry-sdk`), branché sur les handlers d'exception globaux
  (`core/error_handlers.py` : toute exception non gérée + tout 5xx explicite,
  les 4xx métier normaux ne sont pas remontés). Desactivable/optionnel :
  sans `PNPI_SENTRY_DSN`, aucun comportement ne change. Verifie en
  conditions reelles (pas mocke) : SDK initialise avec un DSN valide,
  exception capturee -> requete HTTP reellement envoyee au format
  protocole Sentry (`/api/1/envelope/`) vers un serveur de test local.
- **Pas fait (decision d'ops, pas de code)** : deploiement d'un service
  compatible Sentry. Deux options equivalentes cote code :
  1. Sentry.io (SaaS, gratuit jusqu'a un certain volume) — juste renseigner
     `PNPI_SENTRY_DSN`, zero infra a gerer.
  2. Glitchtip self-hosted — plus lourd (Postgres dedie + Redis + web +
     worker Celery), volontairement PAS ajoute a `docker-compose.prod.yml`
     dans ce lot : le stack multi-conteneurs necessite sa propre base de
     donnees (non creee automatiquement par le `postgres` existant) et
     n'a pas pu etre valide en conditions reelles dans le temps imparti.
     A faire dans un lot dedie si l'option self-hosted est retenue plutot
     que Sentry.io SaaS.
- **Effort restant** : 0 j-h si Sentry.io SaaS retenu (juste la variable
  d'env) ; ~4 j-h si Glitchtip self-hosted retenu (compose + DB dediee +
  validation).
- **Recommandation** : **Fix** — trancher SaaS vs self-hosted (question
  de souverainete des donnees d'erreur, a arbitrer avec le meme
  raisonnement que l'hebergement ANINF).

### D-010 — Migration des fichiers Alembic non testée par bascule — VALIDE (lot 94)
- **Catégorie** : DATA
- **Description initiale** : les migrations s'appliquent sur des bases vierges
  (CI). Aucune bascule réelle d'une base prod-like remplie n'avait été
  rejouée bout-en-bout.
- **Validation effectuee** : `scripts/test_migration_replay.sh` (nouveau,
  reexecutable a volonte) automatise : pg_dump d'une base reelle (35
  operateurs, 77 ATI, 176 documents, 513 evenements d'audit) -> restauration
  dans un Postgres+PostGIS jetable isole -> verification des comptages de
  lignes -> `alembic downgrade -1` puis `upgrade head` sur cette base
  **remplie** (pas vide comme en CI) -> nouvelle verification des comptages.
  Execute deux fois de suite avec succes, aucune perte de donnee, cycle
  down/up propre sur une migration DDL reelle (ajout/suppression de
  colonne).
- **Limite assumee** : ce test valide le cycle backup/restore + le
  comportement down/up de la *derniere* migration sur donnees reelles. Il
  ne rejoue pas une bascule depuis un snapshot historique anterieur a
  plusieurs migrations (aucun tel snapshot de prod n'existe encore — la
  prod n'a pas ete ouverte). A relancer/etendre une fois des sauvegardes
  de prod reelles disponibles.
- **Effort** : 8 j-h (backup réel + replay + tests).
- **Recommandation** : **Fix**.

### D-011 — Pas de séparation logique réseau entre back et redis
- **Catégorie** : SEC / INFRA
- **Description** : Redis est dans le même réseau Docker que le backend.
  Si le backend est compromis, Redis est accessible sans authentification.
- **Effort** : 4 j-h (mot de passe Redis + ACL + isolation VLAN).
- **Recommandation** : **Fix**.

### D-012 — `PNPI_SECRET_KEY` géré par fichier `.env`
- **Catégorie** : SEC
- **Description** : pas de coffre-fort de secrets (Vault, ANINF KMS).
  Risque sur les opérations DevOps (commit accidentel, lecture par
  prestataire).
- **Effort** : 10 j-h (Vault self-hosted + intégration FastAPI).
- **Recommandation** : **Fix**.

### D-013 — Pas de plan de bascule (PRA) testé
- **Catégorie** : INFRA / CONF
- **Description** : `docs/pra_pca.md` existe mais n'a jamais été exécuté
  en grandeur réelle.
- **Effort** : 10 j-h pour un test de bascule supervisé + rapport.
- **Recommandation** : **Fix** — exigence audit ISO 22301.

## 5. Items MOYENS

### D-014 — Pagination non systématique sur les listes longues
- **Catégorie** : PERF
- **Description** : `core/pagination.py` existe et est utilisé sur
  certains routers. Quelques endpoints listant des sous-ressources
  (commentaires, tags, historiques) renvoient encore des listes complètes.
- **Effort** : 5 j-h.
- **Recommandation** : **Fix**.

### D-015 — Index PostgreSQL partiels — audite avec vraies donnees, corrige (lot 100)
- **Catégorie** : PERF
- **Description initiale** : la migration 32 a ajouté des index composites
  mais certaines requêtes du `pnpi_dashboard` feraient encore du seq scan.
- **Methode** : jeu de données synthétique réaliste (~15k operateurs,
  ~30k ATI, générés puis nettoyés) injecté dans le Postgres de dev — les
  ~110 lignes réelles ne permettent aucun signal `EXPLAIN` significatif
  (Postgres choisit à raison un seq scan sur une si petite table).
- **Résultat de l'audit** :
  - Les index composites de la migration 32
    (`ix_ati_statut_date_soumission`, `ix_ati_instructeur_statut`) sont
    **correctement utilisés** (Index Scan / Bitmap Heap Scan confirmés).
  - `WHERE is_active = true` et les GROUP BY à faible sélectivité (ex:
    `statut != 'expire'`) font du seq scan **à raison** — la requête
    retourne 80-90% de la table, un index serait plus lent.
  - **Vrai problème trouvé** : les recherches `ILIKE '%terme%'`
    (`search.py`, `pnpi_dashboard.py`) sur `raison_sociale`, `ville`,
    `numero_ati`, `type_activite` faisaient un seq scan complet (46ms à
    15k lignes, dégradation linéaire avec le volume) — un index btree
    standard ne peut pas accélérer un motif substring ILIKE.
- **Fix** : migration `20260810_49` — extension `pg_trgm` + 4 index GIN
  trigram. Vérifié avant/après (46ms → ~1-4ms, soit ~10-40x) et après un
  cycle downgrade/upgrade complet sur la base réelle.
- **Recommandation** : **Fait**. `nif_gabon` volontairement pas indexé en
  trigram (masqué depuis D-003, majoritairement des astérisques — sans
  valeur de recherche) ; `observations` (texte libre plus volumineux) à
  évaluer séparément si besoin observé en usage réel.

### D-016 — Cache Redis sans politique TTL globale formalisée
- **Catégorie** : PERF / DOC
- **Description** : `core/cache.py` permet de mettre en cache mais chaque
  appelant choisit son TTL ad hoc. Pas de table de référence.
- **Effort** : 3 j-h.
- **Recommandation** : **Fix** — créer `docs/architecture/cache-policy.md`.

### D-017 — `frontend` : doublons entre `app/components` (28+ composants)
- **Catégorie** : FE / QUA
- **Description** : des composants similaires existent (KPICard variants,
  StatusBadge, EmptyState multiples). Refactor en design system unique.
- **Effort** : 8 j-h.
- **Recommandation** : **Fix**.

### D-018 — Pas d'i18n côté backend (messages d'erreur)
- **Catégorie** : QUA / FE
- **Description** : les messages d'erreur HTTP sont en français codés en
  dur. Bloquant pour la version Guinée équatoriale (espagnol).
- **Effort** : 6 j-h (Babel-py + extraction).
- **Recommandation** : **Fix** — préalable au tenant Guinée Eq.

### D-019 — Logs JSON non envoyés à Loki en prod
- **Catégorie** : INFRA
- **Description** : `core/logging_config.py` produit du JSON, mais pas
  d'agrégateur configuré.
- **Effort** : 4 j-h (Promtail + Loki).
- **Recommandation** : **Fix**.

### D-020 — Frontend : TypeScript `strict: false` sur certains modules
- **Catégorie** : FE / QUA
- **Description** : ~12 fichiers (hooks, composants legacy) ont `// @ts-nocheck`.
- **Effort** : 6 j-h.
- **Recommandation** : **Fix**.

### D-021 — GraphQL sans rate limiting fin — trou bien plus large que prevu, corrige (lot 99)
- **Catégorie** : SEC / PERF
- **Description initiale** : `routers/graphql_api.py` etait suppose derriere
  le rate limiter global mais sans query depth limit ni complexity
  analysis.
- **Constat reel (verifie en direct)** : l'hypothese de depart etait
  fausse — `/graphql` n'avait **aucun** rate limiting, pas juste un
  rate limiting grossier. `request_context_middleware`
  (`main.py`) utilisait une liste d'**inclusion** de prefixes
  (`/admin/`, `/pilotage/`, `/pnpi/`) : tout router hors de cette liste
  echappait silencieusement au throttling. Confirme par 70 requetes
  consecutives vers `/search/global` toutes en 200 avant correctif.
  Concerne au moins ces routers, tous montes hors `/pnpi/*` :
  `graphql_api`, `search`, `push`, `scheduled_reports`, `announcements`,
  `calendar`, `chat`, `checklists`, `conventions`, `delegations`,
  `documents`, `feedback`, `geo`, `heatmap`, `integration`,
  `integration_health`, `messages`, `notes`, `open_data`, `polls`,
  `reminders`, `reports`, `templates`, `workflows`.
- **Fix applique** : liste d'inclusion remplacee par une liste
  d'**exclusion** (`_RATE_LIMIT_EXEMPT_PREFIXES` = `/health`, `/metrics`,
  `/docs`, `/redoc`, `/openapi.json` + racine `/`) — toute route est
  desormais rate-limitee par defaut, un nouveau router ne peut plus
  echapper silencieusement au throttling comme les precedents. Verifie en
  direct : `/search/global` et `/graphql` basculent en 429 apres 60
  requetes/60s ; `/health` et `/metrics` restent illimites (necessaire
  pour les sondes de sante et le scraping Prometheus).
- **Reste ouvert** : le depth limit / complexity analysis GraphQL
  specifique (empecher une requete imbriquee couteuse malgre un volume de
  requetes sous le seuil) n'est pas fait — risque residuel plus faible
  maintenant que le volume brut est plafonne.
- **Effort restant** : ~3 j-h (depth limit GraphQL).
- **Recommandation** : **Fix** partiellement applique — depth limit GraphQL
  a traiter separement si l'API GraphQL reste exposee au-dela du prototype.

### D-022 — Pas de documentation OpenAPI publique versionnée
- **Catégorie** : DOC
- **Description** : `/docs` Swagger est exposé mais pas de schema
  OpenAPI versionné par release pour les futurs intégrateurs CEMAC.
- **Effort** : 12 j-h (CI génération + hébergement Redoc).
- **Recommandation** : **Fix**.

## 6. Items BAS

### D-023 — Configuration ESLint `frontend` permissive
- **Catégorie** : FE / QUA
- **Effort** : 3 j-h.
- **Recommandation** : **Fix** — durcir progressivement.

### D-024 — Pas de tests visuels (Chromatic / Percy)
- **Catégorie** : FE / QUA
- **Effort** : 4 j-h.
- **Recommandation** : **Accept** — coût/valeur faible à court terme.

### D-025 — Pas de génération automatisée de PDF pour les rapports
- **Catégorie** : FE
- **Description** : `routers/exports.py` génère du XLSX/CSV. Le PDF
  d'arrêté est généré côté backend mais sans templating riche.
- **Effort** : 5 j-h (WeasyPrint + templates).
- **Recommandation** : **Fix** — préalable à la signature qualifiée
  ADR-005.

### D-026 — Code Flutter : pas de séparation `domain/data/presentation`
- **Catégorie** : MOB / QUA
- **Effort** : 4 j-h (refactor partiel).
- **Recommandation** : **Accept** — surface de l'app reste modeste.

### D-027 — Pas de bannière de cookie / consentement RGPD CEMAC
- **Catégorie** : CONF / FE
- **Effort** : 2 j-h.
- **Recommandation** : **Fix** — préalable au tenant Cameroun.

## 7. Plan d'action recommandé

### Sprint 0 (J+1 → J+30 — pré-ouverture officielle)
- D-001, D-003, D-008, D-011, D-012 — **39 j-h**, 1,5 dev × 4 sem.

### Sprint 1 (J+30 → J+60 — stabilisation)
- D-002 (pentest), D-004, D-006, D-009, D-010 — **49 j-h**.

### Sprint 2 (J+60 → J+90 — hardening + qualité)
- D-005, D-007, D-013, D-014–D-022 — **63 j-h**.

### Sprint 3 (post-J+90 — finition)
- Items BAS + résiduel — **18 j-h**.

## 8. Ce qui n'est *pas* dans ce document

- Les évolutions fonctionnelles demandées par les utilisateurs (cf.
  `docs/strategie/05-questions-cabinet.md`).
- La dette stratégique (posture juridique, modèle économique) — couverte
  par le dossier stratégique.
- La dette de produit (parcours utilisateurs, UX) — à traiter par un
  audit UX dédié.

---

*Fin du document.*
