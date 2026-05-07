# Audit live · Bugs detectes via Playwright + curl · J-3 demo

Tests reels effectues sur frontend `localhost:3000` + backend `localhost:8000`
le 2026-05-02. Backend SQLite seede, dev mode, env `NODE_ENV=development`.

---

## [DEMO-BLOCKER] — Operateur voit les ATIs de TOUTES les entreprises

**Page** : `/pnpi/ati` connecte comme `operateur` / `Operateur@PNPI2026!`
**Symptome** : Le compte "Jean-Claude MOUSSAVOU" affiche **25 dossiers en page 1 + page 2 disponible** mixant Bois, Mines, Agro, Petrole, Peche, BTP, Services. Toutes les entreprises confondues.
**Cause** : `backend/scripts/seed_pnpi.py:1160` hardcode `created_by="operateur"` pour les 60 ATIs. Le helper `check_ati_access` filtre correctement par owner mais comme tous les ATIs ont le meme owner, l'isolation RBAC est invisible.
**Impact demo** : Le DC ou ministre va demander "votre operateur peche voit aussi Petrole et Mines ?". Argument souverainete-isolation effondre.
**Fix** :
```python
# seed_pnpi.py: distribuer created_by selon une logique credible
# Soit creer plusieurs comptes operateur (operateur_bois, operateur_mines, ...)
# Soit attacher operateur a UNE entreprise et ses 5-6 ATIs uniquement
```

---

## [CRITIQUE] — CSP bloque les Google Fonts

**Page** : toutes (landing, connexion, /pnpi, /admin, ...)
**Console** :
```
Loading the stylesheet 'https://fonts.googleapis.com/...' violates CSP directive
"style-src 'self' 'unsafe-inline' https://unpkg.com"
```
**Cause** : `frontend/next.config.js:29` declare `style-src 'self' 'unsafe-inline' https://unpkg.com` sans inclure `https://fonts.googleapis.com` ni `https://fonts.gstatic.com`.
**Impact demo** : **Polices Playfair Display + Inter + Cormorant Garamond ne se chargent pas**. La PNPI est rendue en polices systeme (Times New Roman / Arial) → identite visuelle institutionnelle cassee. Visible immediat au ministre.
**Fix** :
```js
// next.config.js
"style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
"font-src 'self' data: https://fonts.gstatic.com",
```

---

## [CRITIQUE] — Rate limiter lockout sur login admin

**Endpoint** : `POST /auth/token` apres ~15 tentatives en 60s
**Symptome** : Le proxy `/api/auth/login` retourne `500` car le backend repond `429 Trop de requetes. Reessayez dans 60 secondes.`
**Cause** : `backend/app/main.py:2615` applique le middleware rate limiter sur path login. Confirmation du bug agent backend `core/rate_limiter.py:check` qui ajoute toujours au set sliding window meme apres lockout → fenetre ne se vide jamais si les requetes continuent.
**Impact demo** : Si le ministre tape mal son mot de passe 3 fois, ou si la demo redemarre apres tests, **personne ne peut plus se connecter pendant 60s**. La demo se fige.
**Fix immediat** : `PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS=100` (env) avant la demo.
**Fix definitif** : revoir `rate_limiter.check()` pour ne pas bump quand limite depassee.

---

## [MAJEUR] — Proxy /api/health route vers chemin inexistant

**Console** : `/api/health 503 Service Unavailable` (sur toutes les pages)
**Cause** : Frontend appelle `/api/health` ; backend expose `/health` (legacy) et `/api/v1/health`. Le catch-all proxy `/api/[...path]/route.ts` forward vers `/health` qui repond 200 OK. Mais le composant qui appelle est `frontend/src/app/components/SessionStatusBadge.tsx` qui hit `/api/health` → 503 retourne par le proxy quand le backend n'est pas joignable au moment du fetch (rate-limit / restart).
**Impact demo** : Le badge "Latence 184ms" peut clignoter "Session invalide" → impression instabilite.
**Fix** : verifier le retour du backend, distinguer 401/429 et eviter de propager 503.

---

## [MAJEUR] — Manifest PWA pointe vers icone absente

**Console** : `GET /icons/pnpi-192.png 404 Not Found`
**Cause** : `frontend/public/manifest.json` declare un icone `/icons/pnpi-192.png` qui n'existe pas dans `frontend/public/icons/`.
**Impact demo** : Si le ministre installe la PWA, l'icone d'app sera generique. Console rouge sur F12.
**Fix** : Soit generer l'icone PNG 192x192 a partir de `pnpi-logo-mark.svg`, soit retirer la reference du manifest.

---

## [MAJEUR] — `/api/admin/notifications` 405 Method Not Allowed

**Console** : sur `/admin` post-login : `405 Method Not Allowed`
**Cause** : Le composant qui poll les notifs envoie une methode HTTP que le proxy ne supporte pas (probablement DELETE ou PATCH non liste dans le catch-all). Verifier `frontend/src/app/api/[...path]/route.ts` quels exports sont definis (GET, POST, PUT, DELETE, PATCH).
**Impact demo** : Notifications admin partiellement cassees.

---

## [MAJEUR] — `/api/auth/session` + `/api/announcements/active` retournent 401 sur landing publique

**Console** sur `/` (non authentifie) : 401 sur `/api/auth/session` et `/api/announcements/active`
**Cause** : Le layout root appelle ces endpoints meme quand l'utilisateur n'est pas connecte. Pour `/api/announcements/active` une variante publique devrait exister.
**Impact demo** : Erreurs visibles en console ouverte. Pas de blocage fonctionnel.

---

## [MINEUR] — Backend logs SLA spammed au boot

**Backend log** : 25 ATI(s) en retard listed, 5 ATIs CRITICAL declenchant escalades ministre, 1 ATI ESCALADE directeur — au boot.
**Impact demo** : Si le ministre demande a voir les notifications, il en aura **35+ critiques au boot**. Inutilement alarmiste.
**Fix** : reseed avec dates plus realistes (pas 67j sur ATI-2026-0035).

---

## Synthese

| ID | Severite | Cassure | Effort fix |
|---|---|---|---|
| 1 | DEMO-BLOCKER | Operateur voit toutes ATIs | 30 min (re-seed) |
| 2 | CRITIQUE | CSP fonts | 5 min (next.config.js) |
| 3 | CRITIQUE | Rate limiter lockout login | 5 min (env) + 30 min (fix code) |
| 4 | MAJEUR | /api/health proxy 503 | 15 min |
| 5 | MAJEUR | /icons/pnpi-192.png 404 | 10 min |
| 6 | MAJEUR | /api/admin/notifications 405 | 15 min |
| 7 | MAJEUR | landing 401 noises | 15 min |
| 8 | MINEUR | SLA spam boot | 30 min (reseed) |

**Effort total fixes critiques + majeurs avant demo : ~2h.**
