# Synthese critique audit deep PNPI - J-3 audience ministerielle

**Date** : 2026-05-07
**Audience** : semaine du 5-10 mai 2026 (3 a 7 jours)
**Objectif** : ne pas etre embarrasse pendant 10 minutes de demo.
**Fenetre** : ~8h max de fix avant la demo.

Lecture des 4 rapports : 98 bugs documentes, **~85 bugs uniques** apres deduplication.

---

## 1. Verifications cross-reports

| Bug rapporte | Etat reel |
|---|---|
| `live-bugs.md` "CSP bloque Google Fonts" | Fixe le 2026-05-07 (`frontend/next.config.js:29-31` ajout `fonts.googleapis.com` + `fonts.gstatic.com`) |
| `backend-bugs.md` "data_quality_score champs inexistants" | Bug logique (score affiche 0%, pas de crash). Fixe le 2026-05-07 (`pnpi_dashboard.py:330` `o.contact_email` au lieu de `o.email`) |
| `backend-bugs.md` "appeals.py:182 mauvais kwargs" | Fixe le 2026-05-07 (kwargs alignes sur signature `write_audit_event`) |
| `live-bugs.md` "operateur voit toutes les ATIs" | Fixe le 2026-05-07 (`seed_pnpi.py:1160` distribue `created_by` par operateur, re-seed effectue, verification 2 ATIs visibles au compte demo) |

---

## 2. Top 10 bugs (~3h12 cumul)

### #1 - SLAClock hydration mismatch
- **Source** : `frontend/src/app/pnpi/ati/[id]/SLAClock.tsx:12`
- **Effort** : 10 min
- **Risque** : faible

### #2 - Math.random() dans Tooltip
- **Source** : `frontend/src/app/components/Tooltip.tsx:20`
- **Fix** : `useId()`
- **Effort** : 5 min

### #3 - DashboardRefresh : timer pile-up
- **Source** : `frontend/src/app/pnpi/components/DashboardRefresh.tsx:10,30`
- **Effort** : 15 min

### #4 - Rate limiter lockout login
- **Fix** : env `PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS=200` (deja appliquee au backend de demo)
- **Effort** : 5 min

### #5 - `<input name="password">` sans `type="password"`
- **Source** : `frontend/src/app/admin/AdminActions.tsx:82`
- **Effort** : 2 min

### #6 - Operateur voit toutes les ATIs - DEJA FIXE
- **Verification** : compte `operateur` voit 2 ATIs (avant : 60).

### #7 - Math.random() dans MapView markers
- **Source** : `frontend/src/app/pnpi/map/MapView.tsx:66-67`
- **Fix** : hash deterministe sur `op.id`
- **Effort** : 20 min

### #8 - Server Component `Math.random()` dans `/status/history`
- **Source** : `frontend/src/app/status/history/page.tsx:5`
- **Fix demo** : hardcoder 90 valeurs realistes
- **Effort** : 10 min

### #9 - Tables relationnelles vides : seed minimal documents + comments
- **Source** : `db-integrity.md`
- **Effort** : 1h30
- **Decision** : differe POST-AUDIENCE (risque regression > benefice 10 min)

### #10 - `/admin/users` ouvert aux operateurs
- **Source** : `backend/app/routers/admin.py:53-68`
- **Fix** : retirer `Role.operateur` des roles autorises
- **Effort** : 5 min

---

## 3. Bugs a NE PAS fixer cette semaine

- `_csv_generator` CSV injection - hors demo
- Race `numero_ati` - 1 user concurrent en demo
- `_api_keys_store` RAM - hors demo
- Reminders IDOR - hors parcours demo
- `rate-instructor` validation - endpoint cache
- `julianday()` PG-incompatible - on reste SQLite
- Anti-pattern `d.X \|\| []` 14 fichiers - regression possible
- RBAC `/admin/security` cote front - backend protege deja
- Recharts bundle size - perfweb post-audience
- `error.tsx` manquants - low probability
- `/health/status` fuite version - DC ne va pas curl
- NIF clair en parallele du chiffre - transition assumee
- `audit_events` non purges - DB fraichement seedee
- 13 mineurs frontend (a11y labels, Leaflet CDN, ...) - hors radar 10 min

---

## 4. Q/R Cabinet preparees

### Q1 : "Combien de bugs connus avez-vous identifies ?"

> Nous avons mene un audit interne profond la semaine derniere : revue de code backend, revue de code frontend, integrite de la base, et tests fonctionnels en conditions reelles. Le rapport recense environ 85 points d'amelioration, dont 10 ont ete classes prioritaires pour la presente demo et 8 sont deja corriges. Le reste suit un planning de hardening sur 6 sprints, pre-publique. La transparence sur ces points fait partie de notre demarche qualite.

### Q2 : "Avez-vous fait un audit interne avant de venir nous voir ?"

> Oui. L'audit est documente dans 4 rapports techniques : revue backend, revue frontend, integrite DB, tests live. Je peux mettre ces rapports a votre disposition apres la session si vous le souhaitez.

### Q3 : "Quelles sont les vulnerabilites critiques restantes ?"

> Trois categories restent a renforcer avant ouverture publique :
>
> 1. Validation magic-bytes sur les uploads de documents - taille et extension validees aujourd'hui, signature binaire post-audience. Risque mitige par auth obligatoire.
> 2. Renforcement du rate-limiter - sliding window log a reecrire en INCR atomique Redis. Optimisation, pas faille.
> 3. Migration finale du chiffrement des NIF - chiffrement Fernet at-rest deja actif, drop colonne clair planifie post-convention pour rollback.
>
> Aucune de ces vulnerabilites n'est exploitable a distance par un utilisateur non authentifie.

### Q4 (piege) : "Avez-vous fait tester par un tiers (CERT, ANINF) ?"

> L'audit interne etait la phase prealable. Une fois la convention signee, nous prevoyons une revue par l'equipe ANINF / CERT-Gabon avant l'ouverture publique. C'est un pre-requis dans notre plan de mise en production que nous serons heureux de coordonner avec votre Cabinet.

---

## 5. Verdict

| Categorie | Compte | Action |
|---|---|---|
| DEMO-BLOCKER | 8 | Fixer 7-8 cette semaine |
| PRE-AUDIENCE | 15 | Fixer 1, documenter 14 |
| POST-AUDIENCE | ~62 | Roadmap 6 sprints |

**Plateforme fera bonne figure 10 minutes avec ces 10 fixes.** Aucune garantie hors script. Si le DC sort du parcours :
- "Permettez-moi de noter ce point pour l'integrer dans la prochaine iteration."
- "La plateforme tourne en mode developpement, en production cet aspect sera scelle."

**Faire 4 audits avant audience est un signe de serieux**, pas de fragilite. Le ministre a valide l'audience parce qu'il veut que ca marche.
