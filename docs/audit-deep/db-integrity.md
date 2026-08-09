# Audit integrite DB pnpi.db

**Date** : 2026-05-07 (J-3 audience ministerielle)
**DB** : `backend/pnpi.db` (SQLite, ~38 migrations Alembic)
**Mode** : audit statique. Bash + PowerShell ont ete refuses par la sandbox
sur cette session, donc impossible d'executer `sqlite3` ou un script
`python -c "import sqlite3 ..."`. Les findings ci-dessous sont issus de
l'analyse statique du schema (`backend/app/models/*.py`), des 38 migrations
Alembic et du seed (`backend/scripts/seed_pnpi.py`). Les requetes SQL sont
documentees pour que tu puisses les rejouer toi-meme avant la demo.

> **Action requise avant la demo** : autoriser l'execution de `sqlite3` ou
> de Python sur cette session, ou rejouer les requetes ci-dessous a la main
> dans DB Browser for SQLite. Sans ca, plusieurs sections (volumetrie reelle,
> dates farfelues, doublons effectifs) ne peuvent etre confirmees que par
> inspection statique du seed.

---

## Volumetrie globale (ATTENDUE selon seed_pnpi.py)

| Table | Rows attendues | Notes |
|---|---|---|
| `user_accounts` | 11 | admin, ministre, directeur, instructeur, instructeur_bois, instructeur_mines, inspecteur, inspecteur_nord, inspecteur_sud, operateur, operateur_bois |
| `operateurs_industriels` | 35 | Repartis sur 9 provinces |
| `agrements_ati` | 60 | 11 soumis + 17 en_instruction + 11 en_validation + 33 approuve + 5 rejete |
| `ati_transitions` | ~140 | 1 par ATI hors `soumis` (49) + 1 pour ceux en_validation/approuve/rejete (49) + 1 pour approuve/rejete (38) = ~136 |
| `inspections_conformite` | 16 | 8 conforme + 4 non_conforme + 4 partiel |
| `announcements` | 3 | Reglementation bois, formation, maintenance |
| `notifications` | 6-7 | Plus 1 alerte SLA dynamique |
| `ati_appeals` | 0 | Table existe (migration 36) mais pas seedee |
| `ati_comments` / `ati_tags` / `ati_checklist_items` | 0 | Tables vides apres seed |
| `documents_dossier` | 0 | **Risque demo** : aucune ATI n'a de piece jointe |
| `messages` / `user_favorites` / `delegations` / `polls` | 0 | Idem |
| `field_reports` / `inspection_photos` | 0 | Idem |
| `units` / `declarations` / `trace_batches` | 4-5 / 5 / 3 | Seedees uniquement par `seed_if_empty()` dans `app/main.py` (legacy) |
| `audit_events` | inconnu (cumul) | Non purgee par le seed → cumul historique |
| `login_history` | inconnu (cumul) | Non purgee par le seed → cumul historique |
| `refresh_tokens` | inconnu | Tokens potentiellement expires non purges (cf section 4) |

---

## [CRITIQUE] — SQLite foreign_keys est OFF

**Categorie** : 1 (Orphans / FK pendantes)
**Fichier** : `backend/app/database.py` (config moteur)

**Probleme** : aucun `PRAGMA foreign_keys = ON` n'est emis a la connexion.
SQLite ignore donc TOUTES les contraintes FK declarees dans le schema. Tous
les `ForeignKey(...)` des ORM (`ati_id`, `operateur_id`, `username`, etc.)
ne sont enforces qu'au niveau applicatif. Une suppression directe d'un
operateur ou d'un ATI via DB Browser, un script ad-hoc ou un re-seed laisse
des orphans silencieux.

**Verification (a lancer depuis la racine repo)** :
```sql
PRAGMA foreign_keys;
-- Si retourne 0 : OFF (cas par defaut Python sqlite3)
```

**Fix propose** :
1. Ajouter dans `backend/app/database.py` un `event.listens_for(Engine, "connect")`
   qui execute `cursor.execute("PRAGMA foreign_keys = ON")` au moment du
   `connect`. Pattern SQLAlchemy standard.
2. **Avant** d'activer : lancer les requetes orphan ci-dessous et nettoyer
   les rows pendantes. Sans ca, `foreign_keys = ON` empechera tout commit
   sur les tables touchees.
3. Ajouter un test `tests/test_db_integrity.py` qui boucle sur toutes les
   FK et verifie qu'aucun parent n'est manquant.

---

## [HAUTE] — Re-seed laisse 11 tables avec des FK pendantes

**Categorie** : 1 (Orphans)
**Fichier** : `backend/scripts/seed_pnpi.py:1045-1051`

**Requete SQL (a rejouer)** :
```sql
-- Orphans documents → ATI
SELECT d.id, d.ati_id
FROM documents_dossier d
LEFT JOIN agrements_ati a ON a.id = d.ati_id
WHERE a.id IS NULL;

-- Orphans transitions → ATI
SELECT t.id, t.ati_id
FROM ati_transitions t
LEFT JOIN agrements_ati a ON a.id = t.ati_id
WHERE a.id IS NULL;

-- Orphans appeals → ATI
SELECT ap.id, ap.ati_id
FROM ati_appeals ap
LEFT JOIN agrements_ati a ON a.id = ap.ati_id
WHERE a.id IS NULL;

-- Orphans inspections → operateurs
SELECT i.id, i.operateur_id
FROM inspections_conformite i
LEFT JOIN operateurs_industriels o ON o.id = i.operateur_id
WHERE o.id IS NULL;

-- Orphans inspection_photos → inspections
SELECT p.id FROM inspection_photos p
LEFT JOIN inspections_conformite i ON i.id = p.inspection_id
WHERE i.id IS NULL;

-- Orphans ati_comments / ati_tags / ati_checklist_items / ati_reminders
-- → ATI (FK declaree en VARCHAR libre, pas FK SQL)
SELECT c.id, c.ati_id FROM ati_comments c
LEFT JOIN agrements_ati a ON a.id = c.ati_id WHERE a.id IS NULL;

SELECT t.id, t.ati_id FROM ati_tags t
LEFT JOIN agrements_ati a ON a.id = t.ati_id WHERE a.id IS NULL;

SELECT ck.id, ck.ati_id FROM ati_checklist_items ck
LEFT JOIN agrements_ati a ON a.id = ck.ati_id WHERE a.id IS NULL;

SELECT r.id, r.ati_id FROM ati_reminders r
LEFT JOIN agrements_ati a ON a.id = r.ati_id WHERE a.id IS NULL;

-- Orphans user_favorites → ATI
SELECT f.id, f.ati_id FROM user_favorites f
LEFT JOIN agrements_ati a ON a.id = f.ati_id WHERE a.id IS NULL;

-- Orphans audit_events → cible (target peut etre ATI / operateur / user)
-- Ne pas DELETE : contient l'audit trail. Juste mesurer.
SELECT COUNT(*) FROM audit_events ae
WHERE ae.target LIKE 'ATI-%'
  AND ae.target NOT IN (SELECT id FROM agrements_ati);

SELECT COUNT(*) FROM audit_events ae
WHERE ae.target LIKE 'OPI-%'
  AND ae.target NOT IN (SELECT id FROM operateurs_industriels);
```

**Probleme** : `seed_pnpi.py` ne wipe que 5 tables (operateurs, ATIs,
transitions, inspections, announcements). Les tables relationnelles
secondaires (documents, comments, tags, checklists, favorites, reminders,
appeals, inspection_photos, audit_events, login_history) gardent les anciens
ID. Apres chaque re-seed, leurs FK pointent vers des operateurs et ATIs qui
n'existent plus (ID generes par `uid("OPI")` / `uid("ATI")` = uuid aleatoire).

**Exemple concret** : si on re-seed J-3 avant la demo et qu'un instructeur a
laisse un commentaire sur un ATI a J-7, le commentaire restera dans
`ati_comments` avec un `ati_id` orphelin. L'endpoint `/pnpi/ati/{id}/comments`
ne le retournera pas (FK invalide cote Python), mais il pollue les exports
et les analytics.

**Fix propose** :
1. **Avant la demo** : ne PAS re-seed. Si reseed obligatoire, ajouter dans
   `seed_pnpi.py` la purge des 11 tables relationnelles (avec confirmation
   utilisateur car destructif).
2. Apres backup, executer les `DELETE` orphans manuellement (ne **PAS**
   toucher `audit_events` qui doit etre conserve).

---

## [HAUTE] — Secteur "peche" inconnu du domaine

**Categorie** : 2 (Donnees incoherentes)
**Fichiers** :
- `backend/app/models/pnpi.py:12` — `SECTEURS_GABON = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services", "autre"]`
- `backend/scripts/seed_pnpi.py:366,377,514` — secteur `"peche"`

**Requete SQL** :
```sql
SELECT id, raison_sociale, secteur
FROM operateurs_industriels
WHERE secteur NOT IN ('bois','mines','agroalimentaire','btp','petrole','services','autre');
```

**Resultat attendu** : 4 operateurs avec `secteur='peche'` :
- SGPI (PECHE INDUSTRIELLE) — Port-Gentil
- ATLANTIQUE PECHE SARL — Port-Gentil
- PECHE DU SUD GABON SARL — Mayumba
- + 1 ATI cree depuis ces operateurs avec `secteur='peche'`

Le seed declare aussi `TYPES_ACTIVITE["peche"]` (ligne 628) qui n'existe pas
dans la liste autorisee. Cela passe car la validation Pydantic n'applique
pas un `Literal[*SECTEURS_GABON]`. **A verifier dans les schemas avant la
demo** : si une page filtre par `secteur in SECTEURS_GABON`, ces 4 operateurs
disparaissent du dashboard.

**Probleme** : si la demo presente le tableau "Operateurs par secteur" avec
les 7 secteurs autorises, on aura 35 operateurs - 4 = 31 affiches. Si un
inspecteur filtre par "peche" via un dropdown et que ce dropdown lit
`SECTEURS_GABON`, l'option n'apparait pas → les 4 operateurs sont invisibles.

**Fix propose** :
- Soit ajouter `"peche"` dans `SECTEURS_GABON` (1 ligne) et regenerer la
  doc + l'OpenAPI. Recommande : la peche est un secteur reel au Gabon
  (Port-Gentil, Mayumba).
- Soit re-classer les 4 operateurs en `"agroalimentaire"` via UPDATE :
  ```sql
  UPDATE operateurs_industriels
  SET secteur = 'agroalimentaire'
  WHERE secteur = 'peche';
  UPDATE agrements_ati
  SET secteur = 'agroalimentaire'
  WHERE secteur = 'peche';
  ```

---

## [HAUTE] — Tous les ATIs ont `created_by='operateur'`

**Categorie** : 2 (Donnees incoherentes) + risque RBAC
**Fichier** : `backend/scripts/seed_pnpi.py:1160` — `created_by="operateur"`

**Requete SQL** :
```sql
SELECT created_by, COUNT(*) FROM agrements_ati GROUP BY created_by;
```

**Resultat attendu** : 60 rows avec `created_by='operateur'`.

**Probleme** :
1. **Demo non credible** : 35 operateurs industriels reels (ROUGIER, COMILOG,
   OLAM, etc.) mais TOUS leurs ATIs sont attribues au seul utilisateur
   `operateur` (Jean-Claude MOUSSAVOU). En realite, chaque entreprise a son
   propre compte.
2. **Risque RBAC** : le helper `check_ati_access(ati, current_user)` autorise
   l'acces si `ati.created_by == current_user.username`. Donc le user
   `operateur` voit les 60 ATIs (tous les secteurs, toutes les provinces, tous
   les concurrents). C'est demontrable dans la demo si quelqu'un se connecte
   en operateur et voit ROUGIER + COMILOG + PERENCO en meme temps.
3. Le user `operateur_bois` (Raymond OYANE) ne voit AUCUN ATI car aucun ATI
   n'a `created_by='operateur_bois'`. Si quelqu'un teste ce compte en demo,
   le tableau de bord est vide.

**Fix propose** : repartir les `created_by` pour que ca colle a la realite :
```sql
-- Affecter tous les ATIs des operateurs bois au user operateur_bois
UPDATE agrements_ati
SET created_by = 'operateur_bois'
WHERE secteur = 'bois';
-- Garder operateur pour le reste (mais idealement creer 5-6 comptes
-- operateur_<entreprise> pour mieux refleter le modele)
```

---

## [MOYENNE] — Inspections recentes datees dans le futur (sur PC mal configure)

**Categorie** : 2 (donnees incoherentes / dates futures)
**Fichier** : `backend/scripts/seed_pnpi.py` — toutes les dates sont
calculees via `now_utc() - timedelta(days=N)`.

**Requete SQL** :
```sql
SELECT id, date_inspection
FROM inspections_conformite
WHERE date_inspection > datetime('now');

SELECT id, date_soumission
FROM agrements_ati
WHERE date_soumission > datetime('now');
```

**Probleme** : `now_utc()` au moment du seed = aujourd'hui. Le seed n'utilise
pas de date future, donc en theorie 0 row. **Mais** : si le seed a tourne
sur un PC avec horloge mal reglee (date avancee), tout sera dans le futur
relativement a la machine de demo. A verifier le matin de la demo.

**Fix propose** : controle d'horloge le matin de la demo. Si date du
serveur frontale ≠ date du serveur DB, certains tris vont casser.

---

## [MOYENNE] — Helper `check_ati_access` ne sait pas distinguer 2 operateurs partageant `created_by`

**Categorie** : 2 / RBAC
**Fichier** : `backend/app/routers/ati.py:check_ati_access`

**Probleme** : le seed ecrit `created_by="operateur"` sur les 60 ATIs. Si
demain on cree un 2e user `operateur` (autre entreprise) et qu'on lui assigne
un ATI different, les deux verront leurs deux dossiers respectifs car la
check fait `ati.created_by == current_user.username`. **Pour une demo
ministerielle**, il faut qu'il y ait visiblement plusieurs comptes
operateurs distincts avec des perimetres distincts.

**Fix propose** : voir [HAUTE — created_by='operateur'] ci-dessus. Aussi,
ajouter un test `test_rbac_operateur_cross_visibility.py` qui cree 2 comptes
operateurs et verifie qu'ils ne se voient pas mutuellement.

---

## [MOYENNE] — `audit_events` et `login_history` non purges par le seed

**Categorie** : 6 (volumetrie / hygiene)
**Fichier** : `backend/scripts/seed_pnpi.py:1045-1051`

**Requete SQL** :
```sql
SELECT COUNT(*) FROM audit_events;
SELECT COUNT(*) FROM login_history;
SELECT MIN(timestamp), MAX(timestamp) FROM audit_events;
SELECT MIN(created_at), MAX(created_at) FROM login_history;
```

**Probleme** : ces 2 tables grossissent a chaque interaction avec l'app
sans aucune retention configuree. Pour une demo a J+90 d'usage, tu peux
avoir des dizaines de milliers de rows. Pas un risque de plantage immediat
(les indexes 32 et 38 couvrent les requetes courantes), mais un risque de
**lenteur** sur l'ecran "Historique de connexion" et sur l'audit trail.

**Fix propose** :
1. Ajouter un cron mensuel qui supprime `login_history.created_at <
   now - 90j` et `audit_events.timestamp < now - 365j`.
2. Avant la demo : si le compteur depasse 10 000, faire un export CSV
   puis un `DELETE FROM login_history WHERE created_at < datetime('now', '-30 days')`.

---

## [MOYENNE] — `refresh_tokens` jamais purges des tokens expires

**Categorie** : 4 (champs sensibles + hygiene)
**Fichier** : `backend/app/models/core.py:150` (`RefreshTokenORM`)

**Requete SQL** :
```sql
SELECT COUNT(*) FROM refresh_tokens
WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL;
```

**Probleme** : aucune migration ni cron ne purge les tokens expires. Le
volume grossit, et chaque token expire reste un hash bcrypt en DB. Sur une
demo, c'est juste une fuite de volume. Sur un audit securite, c'est une
non-conformite (retention illimitee de credentials revoque).

**Fix propose** : ajouter un job dans `backend/scripts/cron_tasks.py` qui
execute :
```sql
DELETE FROM refresh_tokens
WHERE expires_at < datetime('now', '-7 days') OR revoked_at IS NOT NULL;
```

---

## [RESOLU lot 89/91] — NIF stockes en clair en parallele du chiffre

**Categorie** : 4 (champs sensibles non chiffres)
**Fichier** :
- `backend/app/models/pnpi.py` — `nif_gabon` (masque), `nif_gabon_encrypted`,
  `nif_gabon_hash` (empreinte HMAC pour recherche exacte/unicite)
- `backend/alembic/versions/20260427_37_nif_encrypted.py`,
  `20260809_48_nif_gabon_hash.py` — migrations non destructives
- `backend/scripts/encrypt_existing_nifs.py` — backfill + masquage des
  lignes existantes
- `backend/app/core/encryption.py` — `hash_for_lookup()`, `mask_tail()`

**Constat initial (toujours utile pour comprendre la trajectoire)** : deux
problemes distincts avaient ete identifies :
1. `set_nif()` n'etait appele nulle part dans le code — tous les chemins de
   creation ecrivaient `nif_gabon=` directement, contournant totalement le
   chiffrement (`nif_gabon_encrypted` restait NULL pour toute nouvelle
   ligne). **Corrige lot 89** — 4 sites de creation reecrits.
2. Meme quand chiffre, `nif_gabon` (clair) restait aussi peuple en
   parallele — "chiffrement at-rest" techniquement vrai (Fernet) mais sans
   effet reel puisque le clair complet restait lisible directement.
   **Corrige lot 91** — `nif_gabon` ne recoit plus que la valeur masquee
   (derniers caracteres visibles) des lors que le chiffrement est actif ;
   une empreinte HMAC deterministe (`nif_gabon_hash`) permet toujours la
   recherche exacte / l'unicite sans jamais comparer de clair. ~14 fichiers
   de lecture (recherche, exports, API d'integration DGDI/DGI/MTEPS,
   cockpits) mis a jour pour lire la valeur dechiffree (`op.nif`) plutot
   que la colonne masquee quand l'affichage du NIF complet est requis.

**Limitation assumee** : la recherche partielle (ILIKE) sur le NIF ne
fonctionne plus que sur le suffixe visible (derniers caracteres) — une
recherche substring sur une valeur chiffree n'est pas possible sans la
stocker en clair. Documente dans `routers/search.py`.

**Reste a faire (hors code, decision operationnelle)** : lancer
`encrypt_existing_nifs.py` en production pour masquer les lignes creees
avant ce correctif (idempotent, sans risque a relancer).

---

## [BASSE] — Mots de passe par defaut hardcodes dans le seed

**Categorie** : 4 / 5 (creds visibles)
**Fichier** : `backend/scripts/seed_pnpi.py:87-165` + `:1340-1342`

**Probleme** : tous les mots de passe demo sont imprimes en clair en fin
de seed (`pwd: Admin@PNPI2026!`, etc.). Chaque user a un mdp deductible
de son role (`Ministre@PNPI2026!`, `Bois@PNPI2026!`...). Ils sont **bien
hashes en bcrypt** dans la DB (cf `pwd_context.hash(password)`), donc pas
de plain-text en base. Mais c'est public dans le code source du repo et
dans le terminal a chaque seed.

**Fix propose pour la demo** :
1. Avant la demo : changer les mots de passe via l'UI (compte par compte)
   ou ecraser via :
   ```python
   from passlib.context import CryptContext
   from app.database import SessionLocal
   from app.models.core import UserAccountORM
   pw = CryptContext(schemes=["bcrypt"]).hash("NouveauMdpFort!")
   with SessionLocal() as db:
       db.query(UserAccountORM).filter_by(username="ministre").update({"hashed_password": pw})
       db.commit()
   ```
2. Documenter que les mdp listes dans le terminal sont **defaults dev** et
   que `PNPI_<USERNAME>_PASSWORD` env override en prod (cf `_resolve_password`).

---

## [BASSE] — Tables de feature jamais peuplees par le seed

**Categorie** : 6 (volumetrie / endpoints qui plantent)
**Tables** : `documents_dossier`, `ati_comments`, `ati_tags`, `ati_checklist_items`,
`ati_reminders`, `messages`, `user_favorites`, `delegations`, `polls`,
`poll_votes`, `conventions`, `instructor_ratings`, `operator_feedback`,
`field_reports`, `inspection_photos`, `push_subscriptions`,
`document_versions`, `sticky_notes`, `ati_appeals`.

**Requete SQL** :
```sql
SELECT 'documents_dossier' AS t, COUNT(*) FROM documents_dossier
UNION ALL SELECT 'ati_comments', COUNT(*) FROM ati_comments
UNION ALL SELECT 'ati_tags', COUNT(*) FROM ati_tags
UNION ALL SELECT 'ati_checklist_items', COUNT(*) FROM ati_checklist_items
UNION ALL SELECT 'ati_reminders', COUNT(*) FROM ati_reminders
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'user_favorites', COUNT(*) FROM user_favorites
UNION ALL SELECT 'delegations', COUNT(*) FROM delegations
UNION ALL SELECT 'polls', COUNT(*) FROM polls
UNION ALL SELECT 'conventions', COUNT(*) FROM conventions
UNION ALL SELECT 'instructor_ratings', COUNT(*) FROM instructor_ratings
UNION ALL SELECT 'operator_feedback', COUNT(*) FROM operator_feedback
UNION ALL SELECT 'field_reports', COUNT(*) FROM field_reports
UNION ALL SELECT 'inspection_photos', COUNT(*) FROM inspection_photos
UNION ALL SELECT 'document_versions', COUNT(*) FROM document_versions
UNION ALL SELECT 'sticky_notes', COUNT(*) FROM sticky_notes
UNION ALL SELECT 'ati_appeals', COUNT(*) FROM ati_appeals;
```

**Probleme** : pour une demo "qualite production", un ministre va cliquer
sur un dossier et voir des sections completement vides : "Aucun commentaire",
"Aucun document", "Aucune piece jointe". L'illusion d'une plateforme
operationnelle s'effondre des le 2e clic. Le risque demo est **eleve** sur
les sections "Documents du dossier" et "Commentaires d'instruction".

**Fix propose** : etendre `seed_pnpi.py` pour ajouter (a J-3) :
- 2-3 documents par ATI approuve (placeholder PDF) → ~60 rows
  `documents_dossier`.
- 1-2 commentaires par ATI en cours d'instruction → ~30 rows `ati_comments`.
- 5-10 checklist items par ATI en validation → ~50-100 rows.
- 1-2 appeals sur les 5 ATIs rejetes → ~5 rows `ati_appeals`.
- Ces ajouts doivent etre **idempotents** (UPSERT) et lies a des IDs ATIs
  reels, pas regeneres a chaque run.

---

## [BASSE] — `polls.options` est du JSON dans une colonne TEXT

**Categorie** : 7 / lisibilite
**Fichier** : `backend/app/models/pnpi.py:331-339`

**Probleme** : `PollORM.options: Mapped[str] = mapped_column(Text, nullable=False)`
— stocke le JSON serialise. Pas de validation au niveau DB (pas de
`json_valid` check). Si un dev concatene au lieu de `json.dumps()`, on a
une corruption silencieuse.

**Fix propose** : ajouter un `CHECK (json_valid(options))` via migration.
Pas urgent pour la demo (table vide) mais a tracker.

---

## [BASSE] — Tables sans index sur leur cle FK

**Categorie** : 7 (indexes manquants)

**Probleme** : tables avec FK declarees en ORM mais pas d'index secondaire :

| Table | FK sans index | Volume si demo charge | Impact |
|---|---|---|---|
| `ati_comments` | `author_username` | <100 | faible |
| `ati_tags` | `created_by` | <100 | faible |
| `messages` | `sender_username` | inconnu | moyen si messages charges |
| `user_favorites` | `username` | <50 | faible |
| `delegations` | `from_username`, `to_username` | <20 | faible |
| `inspection_photos` | (`inspection_id` → indexe via migration 10) | OK | OK |
| `instructor_ratings` | `operator_username` | <50 | faible |
| `notification_preferences` | `username` (cle primaire = OK) | OK | OK |

**Requete SQL** :
```sql
SELECT name, sql FROM sqlite_master
WHERE type='index' AND tbl_name IN ('ati_comments','ati_tags','messages','user_favorites','delegations','instructor_ratings');
```

**Fix propose** : non urgent. Ajouter une migration 39 si la volumetrie le
justifie post-demo.

---

## [BASSE] — Doublons d'index (declarations vs implicit)

**Categorie** : 7 (indexes en double)

**Probleme** : la migration `20260304_05` cree explicitement
`ix_operateurs_nif` sur `(nif_gabon)` alors que la colonne est deja `unique=True`
(SQLite cree implicitement un index unique pour les colonnes `unique`). Cela
fait **deux** indexes sur la meme colonne pour `operateurs_industriels.nif_gabon`.

**Requete SQL** :
```sql
SELECT name, sql FROM sqlite_master
WHERE type='index' AND tbl_name='operateurs_industriels';
-- Tu devrais voir : sqlite_autoindex_operateurs_industriels_1 (UNIQUE)
-- + ix_operateurs_nif (regulier)
```

**Fix propose** : drop `ix_operateurs_nif` dans une migration future. Pas
urgent (cout en ecriture marginal sur un seed de 35 rows).

Meme pattern probable sur `numero_ati` (`unique=True` + `ix_agrements_numero`).

---

## [PROPRE] — Sections sans probleme detecte

- **Doublons logiques** :
  - NIFs : analyse des 35 NIFs hardcodes dans le seed. Tous distincts (cf
    `seed_pnpi.py:187-577`). Si re-seed clean, 0 doublon.
  - `numero_ati` : genere par `f"ATI-2026-{seq:04d}"` avec `seq` unique.
    Aucun doublon possible cote seed.
  - `user_accounts.username` : cle primaire, doublon impossible structurellement.
- **Dates farfelues (annee < 2020)** : aucun champ de date hardcode avant
  2020 dans le seed (toutes via `days_ago(N)` relatif a aujourd'hui).
- **Lorem ipsum / TODO / FIXME** dans les seeds : 0 occurrence (`grep -i`
  sur `backend/scripts/`).
- **Noms d'operateurs farfelus** : aucun. Tous les 35 noms sont des
  entreprises gabonaises reelles ou plausibles (ROUGIER, COMILOG, OLAM,
  Brasseries du Gabon, Setrag, Perenco, Maurel & Prom, Sucaf, etc.). Pas
  d'embarras potentiel.
- **Motifs de rejet** : 5 motifs realistes et professionnels
  (`seed_pnpi.py:748-754`).
- **NIFs format** : tous au format `XXXXXXXXY` (8 chiffres + lettre),
  conforme.

---

## Recapitulatif executif (a presenter au ministre si question DB)

| # | Probleme | Severite | Action avant demo |
|---|---|---|---|
| 1 | `PRAGMA foreign_keys = OFF` | CRITIQUE | Activer apres clean (cf section 1) |
| 2 | Re-seed laisse FK pendantes (11 tables) | HAUTE | NE PAS re-seed, ou patcher le seed |
| 3 | Secteur `peche` hors taxonomie | HAUTE | Ajouter dans `SECTEURS_GABON` |
| 4 | Tous les ATIs `created_by='operateur'` | HAUTE | UPDATE pour reflecter realite |
| 5 | Tables relationnelles vides → demo creuse | BASSE-HAUTE | Etendre `seed_pnpi.py` |
| 6 | NIF clair stocke en parallele | MOYENNE | Documenter (transition assumee) |
| 7 | Mots de passe par defaut prevaibles | BASSE | Override via env / changement manuel |
| 8 | `audit_events` / `login_history` non purges | MOYENNE | Cron de retention |
| 9 | Tokens expires non purges | MOYENNE | Cron de purge |
| 10 | Doublon d'index sur `nif_gabon` | BASSE | Migration future |

---

## Methodologie & limites de cet audit

**Fait** :
- Analyse statique de 38 migrations Alembic.
- Analyse statique des 2 modeles ORM (`core.py`, `pnpi.py`, ~30 entites).
- Analyse statique de 11 scripts (`scripts/`).
- Verification de la presence de `PRAGMA foreign_keys` (absent).
- Verification de la coherence taxonomie secteurs (incoherence detectee).

**Non fait (sandbox bloque Bash + PowerShell)** :
- Aucune requete SQL executee sur `pnpi.db`.
- Volumetrie reelle, doublons effectifs, FK orphelines reelles, presence de
  Lorem/TODO dans des champs textuels (observations, motifs, comments) :
  **a verifier toi-meme** en lancant les requetes documentees ci-dessus
  dans DB Browser for SQLite ou via :
  ```bash
  sqlite3 backend/pnpi.db < scripts/audit_queries.sql
  ```

**Recommandation** : me redonner Bash ou PowerShell pour rejouer cet audit
en mode dynamique avec compteurs reels avant de l'envoyer au cabinet.
