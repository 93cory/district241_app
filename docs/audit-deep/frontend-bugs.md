# Audit frontend deep · Bugs caches PNPI · J-3 demo ministerielle

Audit de `frontend/src/`, focalise sur les 10 angles du mandat.
Bugs verifies ligne par ligne, tries par severite decroissante.

Convention : sev **CRITIQUE** = casse pendant la demo / hydration mismatch / RBAC contourne ; **MAJEUR** = bug visible mais recuperable ; **MINEUR** = degradation UX / a11y.

---

## [CRITIQUE] — Hydration mismatch garanti dans SLAClock

**Fichier** : `frontend/src/app/pnpi/ati/[id]/SLAClock.tsx:12`
**Categorie** : 1 (Hydration)
**Code actuel** :
```tsx
const [now, setNow] = useState(new Date());
```
**Probleme** : `new Date()` est evalue au moment du render. Le SSR genere du HTML avec timestamp X, le client hydrate avec timestamp Y > X. React detecte le mismatch et invalide l'arbre. Tout le bloc compteur SLA risque de blanker.
**Scenario** : Le ministre ouvre `/pnpi/ati/<id>` pendant la demo. Le compteur SLA reste fige a 00:00 ou flash ; warnings React rouges en console publique.
**Fix propose** :
```tsx
const [now, setNow] = useState<Date | null>(null);
useEffect(() => { setNow(new Date()); /* ... */ }, []);
if (!now) return <SkeletonSLA />;
```

---

## [CRITIQUE] — Page Server Component avec Math.random()

**Fichier** : `frontend/src/app/status/history/page.tsx:5`
**Categorie** : 1 (Hydration)
**Code actuel** :
```tsx
export default function UptimeHistoryPage() {
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (89 - i));
    const uptime = 95 + Math.random() * 5;
    // ...
```
**Probleme** : Composant sans `"use client"` (Server Component par defaut). `Math.random()` et `new Date()` au render → valeur differente a chaque RSC. Tout le tableau d'uptime est genere fictivement cote serveur.
**Scenario** : Demo ouvre `/status/history`, affiche "99.4% disponibilite" qui change si on F5. Soupcon de credibilite immediat — pas de vraies donnees.
**Fix propose** :
```tsx
const days = await fetchUptimeHistory({ days: 90 });
```

---

## [CRITIQUE] — Math.random() dans le rendu d'une page client (Tooltip)

**Fichier** : `frontend/src/app/components/Tooltip.tsx:20`
**Categorie** : 1 (Hydration)
**Code actuel** :
```tsx
const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2, 8)}`).current;
```
**Probleme** : `useRef(... Math.random())` initialise UNE FOIS au render initial. En SSR, l'id sera `tooltip-abc123` cote serveur ; au client, l'id sera `tooltip-xyz789`. Mismatch de l'attribut `id`/`aria-describedby`. Tooltips utilises dans tout le mega-nav.
**Scenario** : Console pleine de warnings hydration. Si plusieurs tooltips, ids dupliques en cas de collision.
**Fix propose** :
```tsx
import { useId } from "react";
const tooltipId = useId();
```

---

## [CRITIQUE] — Math.random() dans MapView au render des markers

**Fichier** : `frontend/src/app/pnpi/map/MapView.tsx:66-67`
**Categorie** : 1 / 6 (Hydration + Performance)
**Code actuel** :
```tsx
const lat = coords[0] + (Math.random() - 0.5) * 0.3;
const lng = coords[1] + (Math.random() - 0.5) * 0.3;
```
**Probleme** : Decalage aleatoire applique a chaque execution de `useEffect`. A chaque re-render du parent (filtre secteur change), les markers sautent de plusieurs km.
**Scenario** : Le ministre clique "Tous" puis "Bois" dans `/pnpi/map`. Les memes operateurs reapparaissent a des positions differentes. Credibilite de la geolocalisation = zero.
**Fix propose** :
```tsx
const seed = hashId(op.id); const lat = coords[0] + (seed.x * 0.3); ...
```

---

## [CRITIQUE] — Hydration mismatch sur InspectionCreateForm.date_inspection

**Fichier** : `frontend/src/app/pnpi/inspections/components/InspectionCreateForm.tsx:20`
**Categorie** : 1 (Hydration)
**Code actuel** :
```tsx
const [form, setForm] = useState({
  ...
  date_inspection: new Date().toISOString().slice(0, 16),
  ...
});
```
**Probleme** : Component "use client" rendu cote SSR avec valeur initiale calculee au moment du SSR. A l'hydration client, `new Date()` retourne une valeur differente → input `datetime-local` defaut diverge → mismatch hydration.
**Scenario** : L'inspecteur ouvre le formulaire de creation, perd la valeur tapee au mount.
**Fix propose** :
```tsx
const [form, setForm] = useState({ ..., date_inspection: "" });
useEffect(() => { setForm(f => ({...f, date_inspection: new Date().toISOString().slice(0,16)})); }, []);
```

---

## [CRITIQUE] — DashboardRefresh: timer pile-up + hydration mismatch

**Fichier** : `frontend/src/app/pnpi/components/DashboardRefresh.tsx:10,30`
**Categorie** : 1 / 4
**Code actuel** :
```tsx
const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
// ...
}, [router, lastRefresh]);
```
**Probleme** : (1) `useState(new Date())` produit un mismatch SSR/CSR. (2) `useEffect` depend de `lastRefresh`, donc a chaque refresh, on cree DEUX nouveaux setInterval sans cleanup → memory leak + multiple refresh par seconde.
**Scenario** : Apres 5 min sur le dashboard PNPI, la page fait `router.refresh()` toutes les ~10s au lieu de 2 min. Le backend prend 502.
**Fix propose** :
```tsx
const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
useEffect(() => { /* timers */ }, [router]);
```

---

## [CRITIQUE] — Anti-pattern `d.X || []` (CLAUDE.md interdit)

**Fichier** : 14 occurrences :
- `frontend/src/app/admin/announcements/page.tsx:28`
- `frontend/src/app/components/AnnouncementBanner.tsx:27`
- `frontend/src/app/pnpi/calendar/page.tsx:46`
- `frontend/src/app/pnpi/polls/page.tsx:14`
- `frontend/src/app/pnpi/notes/page.tsx:36`
- `frontend/src/app/pnpi/ati/[id]/Checklist.tsx:36`
- `frontend/src/app/pnpi/ati/[id]/TagsManager.tsx:32`
- `frontend/src/app/pnpi/ati/[id]/FieldHistory.tsx:36`
- `frontend/src/app/pnpi/ati/[id]/DocumentVersions.tsx:24`
- `frontend/src/app/pnpi/operateurs/[id]/ComplianceTimeline.tsx:22`
- `frontend/src/app/pnpi/guichet/TemplateSelector.tsx:31`
- `frontend/src/app/admin/scheduled-reports/page.tsx:43`
- `frontend/src/app/profil/LoginHistory.tsx:31`
- `frontend/src/app/admin/security/page.tsx:18`

**Categorie** : 2 (Data fetching defensif)
**Code actuel** : `.then((d) => setItems(d.items || []))`
**Probleme** : Si le backend retourne `{detail: "Forbidden"}`, le pattern fallback peut passer un objet → `.map()` crash.
**Fix propose** :
```tsx
.then((d) => setAnnouncements(Array.isArray(d?.announcements) ? d.announcements : []))
```

---

## [CRITIQUE] — `setOperators(d.operateurs || d || [])` peut setter un objet erreur

**Fichier** : `frontend/src/app/pnpi/map/page.tsx:31`
**Categorie** : 2
**Code actuel** :
```tsx
.then((d) => setOperators(d.operateurs || d || []))
```
**Probleme** : Si `d` est `{detail:"..."}`, `d.operateurs` est falsy, donc on prend `d` lui-meme — un objet, pas un array. Ligne 35 : `operators.filter(...)` crash. Pattern interdit par CLAUDE.md.
**Scenario** : Auth expiree → carte refuse de charger, error boundary visible pendant demo.
**Fix propose** :
```tsx
.then((d) => setOperators(Array.isArray(d?.operateurs) ? d.operateurs : Array.isArray(d) ? d : []))
```

---

## [CRITIQUE] — RBAC manquant cote serveur sur /admin/security

**Fichier** : `frontend/src/app/admin/security/page.tsx:1-21`
**Categorie** : 3 / 7
**Code actuel** :
```tsx
"use client";
export default function SecurityPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { Promise.all([fetch("/api/metrics/usage")...]) }, []);
```
**Probleme** : Page client-only, AUCUN check de role ni `redirect("/connexion")`. Le RBAC repose entierement sur le backend.
**Scenario** : Operateur tape `/admin/security` directement → voit la page admin (vide / erreur) au lieu d'etre redirige.
**Fix propose** : Convertir en Server Component avec guard, comme `/admin/backups/page.tsx`.

---

## [CRITIQUE] — `<input name="password">` sans `type="password"` dans AdminActions

**Fichier** : `frontend/src/app/admin/AdminActions.tsx:82`
**Categorie** : 5 / 7
**Code actuel** :
```tsx
<input name="password" placeholder="Mot de passe" required style={fieldStyle} />
```
**Probleme** : Le mot de passe s'affiche en clair pendant la frappe. Sur le grand ecran de la salle ministerielle, tout le monde lit le mot de passe.
**Scenario** : Admin cree un compte instructeur en demo → mot de passe visible projete.
**Fix propose** :
```tsx
<input name="password" type="password" autoComplete="new-password" placeholder="..." required ... />
```

---

## [MAJEUR] — Server Component fige `now` dans relativeTime (notifications)

**Fichier** : `frontend/src/app/pnpi/notifications/page.tsx:36-49`
**Categorie** : 1
**Probleme** : Server Component qui appelle `Date.now()` au render. "Il y a 1 min" reste affiche apres 30 min.
**Scenario** : Demo dure 30 min, toutes les notifications affichent "Il y a 5 min" → impression de plateforme statique.
**Fix propose** : Composant client `<RelativeTime since={...} />` avec setInterval.

---

## [MAJEUR] — Server Component activity/page.tsx fige aussi `now`

**Fichier** : `frontend/src/app/pnpi/activity/page.tsx:33`
**Categorie** : 1

---

## [MAJEUR] — Server Component fige greeting "Bonjour/Bonsoir" a l'heure serveur

**Fichier** : `frontend/src/app/pnpi/page.tsx:77`
**Categorie** : 1 / 10
**Code actuel** :
```tsx
const greeting = pickGreeting(new Date().getHours());
```
**Probleme** : Le serveur est en UTC ; les utilisateurs sont en Afrique/Libreville (UTC+1). A 17h locale, le serveur dit "12h" → "Bonjour" alors qu'il fait fin d'apres-midi.

---

## [MAJEUR] — backendRequest cache 60s par defaut → KPIs figes

**Fichier** : `frontend/src/lib/backend.ts:73`
**Categorie** : 2 / 10
**Code actuel** :
```tsx
return fetch(`${BASE_URL}${path}`, { ...init, headers: requestHeaders, next: { revalidate: 60 } });
```
**Scenario** : Pendant la demo, l'admin valide un ATI dans un onglet. Le ministre rafraichit `/pnpi` → voit toujours le compteur d'avant.
**Fix propose** :
```tsx
return fetch(..., { ...init, headers, cache: "no-store" });
```

---

## [MAJEUR] — Proxy /api/* renvoie 401 dur sans refresh

**Fichier** : `frontend/src/app/api/[...path]/route.ts:35`
**Categorie** : 2 / 10
**Probleme** : Si le cookie access expire mais refresh est valide, le proxy retourne 401 sans tentative de refresh. Tous les fetch deviennent 401, l'UI casse.

---

## [MAJEUR] — `<style dangerouslySetInnerHTML>` dans Server Component

**Fichier** : `frontend/src/app/page.tsx:120` et `frontend/src/app/aide/guides/[role]/page.tsx:67`
**Categorie** : 1 / 7
**Probleme** : Selon les regles d'echappement, des sequences `</style>` literales peuvent casser le HTML. Pattern non-CSP-friendly.

---

## [MAJEUR] — `dangerouslySetInnerHTML={{ __html: qrSvg }}` pour QR 2FA

**Fichier** : `frontend/src/app/profil/TwoFactorSetup.tsx:247`
**Categorie** : 7
**Probleme** : Le SVG vient du backend. Si compromis, XSS direct dans la page de setup 2FA.

---

## [MAJEUR] — Toast: ids generes via Math.random() (collision)

**Fichier** : `frontend/src/app/components/Toast.tsx:41`
**Categorie** : 4 / 10

---

## [MAJEUR] — KeyboardShortcuts: useEffect deps incluent `shortcuts` recreee

**Fichier** : `frontend/src/app/components/KeyboardShortcuts.tsx:17-29,67`
**Categorie** : 4 / 6
**Probleme** : `shortcuts` recree a chaque render → `handleKey` change → useEffect re-attache l'event listener. Memory leak.
**Fix propose** :
```tsx
const shortcuts = useMemo(() => [...], [router]);
```

---

## [MAJEUR] — `as any` repandus dans pages admin

**Fichier** : `admin/api-usage/page.tsx`, `admin/security/page.tsx`, `inspecteur/page.tsx`, `pnpi/realtime-stats/page.tsx`, `pnpi/governor/page.tsx`, `pnpi/reports/page.tsx`
**Categorie** : 9
**Probleme** : `useState<any>(null)` interdit en strict mode. Pas de type-safety sur les KPIs.

---

## [MAJEUR] — Token JWT decode cote frontend (Buffer)

**Fichier** : `frontend/src/app/api/auth/session/route.ts:13`
**Categorie** : 7

---

## [MAJEUR] — Pas d'`error.tsx` dans les sous-routes critiques

**Manquants** : `app/admin/error.tsx`, `app/pnpi/error.tsx`, `app/pnpi/ati/error.tsx`, `app/pnpi/inspections/error.tsx`
**Categorie** : 8
**Probleme** : Si une erreur dans un Server Component admin, Next.js remonte au root error boundary → tout le shell disparait.

---

## [MAJEUR] — Liens `/api-docs`, `/embed`, `/changelog` dans Footer public

**Fichier** : `frontend/src/app/components/Footer.tsx:36-40`
**Categorie** : 3
**Probleme** : Liens visibles a tous (footer non auth). `/api-docs` et `/embed` exposent des informations techniques aux visiteurs non auth.

---

## [MAJEUR] — Toasts s'accumulent en cas d'erreurs reseau

**Fichier** : `frontend/src/app/components/Toast.tsx:43-46`
**Probleme** : Pas de limite max. En cas de coupure reseau, chaque retry empile un toast d'erreur.
**Fix propose** :
```tsx
setToasts((prev) => [...prev, ...].slice(-5));
```

---

## [MAJEUR] — useEffect du SessionTimeout depend de `showWarning`

**Fichier** : `frontend/src/app/components/SessionTimeout.tsx:51-66`

---

## [MAJEUR] — Imports recharts in entirety

**Categorie** : 6
**Probleme** : recharts pese ~95KB gzip. Importer `from "recharts"` charge tous les composants.
**Fix propose** : `import { LineChart } from "recharts/es6/chart/LineChart";`

---

## [MINEUR] — `<input type="file">` sans label dans AdminUserImport

**Fichier** : `frontend/src/app/admin/AdminUserImport.tsx:50`

---

## [MINEUR] — ChatAssistant input sans label

**Fichier** : `frontend/src/app/components/ChatAssistant.tsx:301`

---

## [MINEUR] — SkeletonLoader Math.random() dans width

**Fichier** : `frontend/src/app/components/SkeletonLoader.tsx:46`

---

## [MINEUR] — `alert()` natif au lieu de Toast dans PushNotifications

**Fichier** : `frontend/src/app/components/PushNotifications.tsx:38`

---

## [MINEUR] — Cookie consent: refus n'est pas applique

**Fichier** : `frontend/src/app/components/CookieConsent.tsx:18-21`

---

## [MINEUR] — `<a href>` au lieu de `<Link>` dans Inspecteur

**Fichier** : `frontend/src/app/inspecteur/page.tsx:80,150`

---

## [MINEUR] — Chemin Leaflet CSS hard-codé via CDN

**Fichier** : `frontend/src/app/pnpi/map/MapView.tsx:42-47`
**Probleme** : Dependance externe a unpkg.com sans SRI. Fuite IP utilisateur a unpkg.com.
**Fix propose** : `import "leaflet/dist/leaflet.css";`

---

## [MINEUR] — `console.error` en code prod ErrorBoundary

**Fichier** : `frontend/src/app/components/ErrorBoundary.tsx:26`, `frontend/src/app/error.tsx:7`

---

## [MINEUR] — Pagination dans `/pnpi/historique` perdue au refresh

**Fichier** : `frontend/src/app/pnpi/historique/page.tsx:71`

---

## [MINEUR] — TwoFactorSetup: `payload.detail` peut etre array/obj

**Fichier** : `frontend/src/app/profil/TwoFactorSetup.tsx:42, 73, 103`
**Probleme** : `payload.detail` Pydantic peut etre obj `{loc, msg, type}` → React crash si rendu directement.

---

## [MINEUR] — VoiceInput utilise `as unknown as` pour SpeechRecognition

**Fichier** : `frontend/src/app/components/VoiceInput.tsx:40`

---

## [MINEUR] — Breadcrumbs `<Link href="/">` redirige

**Fichier** : `frontend/src/app/components/Breadcrumbs.tsx:53`

---

## [MINEUR] — Onboarding tour sur `/connexion`

**Fichier** : `frontend/src/app/components/OnboardingTour.tsx:57-64`

---

## Recapitulatif

| Severite | Count |
|----------|-------|
| CRITIQUE | 10 |
| MAJEUR   | 14 |
| MINEUR   | 13 |
| **Total**| **37** |

### Priorites avant demo (J-3)
1. SLAClock.tsx hydration → CRITIQUE
2. DashboardRefresh, InspectionCreateForm new Date() → CRITIQUE
3. Math.random() dans Tooltip, MapView, SkeletonLoader → CRITIQUE
4. relativeTime/formatTime Server → composants client → MAJEUR
5. RBAC server-side a /admin/security → CRITIQUE
6. cache:"no-store" par defaut dans backendRequest → MAJEUR
7. d.X || [] → Array.isArray (CLAUDE.md compliance) → CRITIQUE
8. type="password" sur le password admin → MAJEUR
9. error.tsx dans /admin, /pnpi, /pnpi/ati → MAJEUR
