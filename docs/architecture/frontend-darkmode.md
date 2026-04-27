# Mode sombre PNPI — diagnostic page par page

> Audit lot 79. Toggle disponible via `ThemeToggle` (haut de page) ou
> raccourci clavier (`AccessibilityPanel`).
> Persistance : localStorage `pnpi-theme`.

## Mecanique

1. `ThemeToggle.tsx` ecrit `data-theme="dark"` ou `data-theme="light"`
   sur `<html>` et persiste dans le localStorage.
2. `frontend/src/app/globals.css` redefinit les variables CSS principales
   sous `html[data-theme="dark"] { ... }` (cf lignes 3874+).
3. Les composants utilisant `var(--bg-base)`, `var(--surface)`,
   `var(--text-main)` basculent automatiquement.
4. Pour les inline-styles (`style={{ background: "#fff" }}`) qui ignorent
   les variables, le bloc `LOT 79 — DARK MODE COMPLEMENT` de `globals.css`
   ajoute des selecteurs d'attribut (`[style*="..."]`) pour forcer la
   correction.

## Pages auditees (lot 79)

### 1. `/pnpi` — Dashboard ministeriel

**Statut :** OK.
- Hero `pnpi-brief-hero` utilise variables CSS, gradient signature.
- KPIs `pnpi-kpi--*` ont des regles `data-theme="dark"` dans `globals.css`.
- Carte Leaflet : tuiles claires conservees (lisibilite cartographique
  prioritaire sur la coherence visuelle).

### 2. `/pnpi/ati` — Liste ATI

**Statut :** OK apres lot 79.
- Table principale : badges statut (pills colorees) restent OK en sombre
  (couleurs vives transparentes).
- Surlignage des lignes en retard `#fef9eb` -> override
  `rgba(217, 119, 6, 0.18)` en sombre.
- Selection bleue `rgba(0,63,143,0.06)` -> renforce a `0.18` en sombre.

### 3. `/profil` — Profil utilisateur

**Statut :** OK.
- Avatar gradient `#003F8F -> #009440` conserve (cohérent avec drapeau).
- Cards `chart-card` heritent automatiquement des variables.
- Couleurs de texte gris `#6b7280`, `#374151` overridees vers
  `var(--text-soft)` en sombre.

### 4. `/inspecteur` — Espace inspecteur

**Statut :** OK apres lot 79.
- Hero `linear-gradient(135deg, #051B36 0%, #006233 100%)` conserve, deja
  contraste eleve.
- Sous-cartes `rgba(255, 255, 255, 0.72)` -> `rgba(255, 255, 255, 0.08)`
  en sombre (verre fume).
- Table inspections : utilise `.annex-table` -> heritage automatique.

### 5. `/open-data` — Statistiques publiques

**Statut :** OK.
- Cards `CARD_BASE` avec `background: #fff` -> override par
  `[style*="background: #fff"]` (rare, mais a surveiller).
- Histogrammes `repartitions` : barres colorees (`--gabon-green`,
  `--pnpi-amber`) restent lisibles en sombre.

### 6. `/aide/guides/[role]`

**Statut :** OK.
- Pages quasi-statiques : prose dans `chart-card`, heritage CSS.

### 7. `/admin`

**Statut :** OK apres lot 79.
- Cards `table-card` : ok.
- Items inline avec `border-bottom: 1px solid #eef1f5` -> overrides.
- Texte secondaire `color: #6c7a8c`, `#3a4351` -> `var(--text-soft)`.

## Composants critiques

| Composant | Comportement sombre |
|---|---|
| `MegaNav` | OK, panels en `var(--surface)` |
| `MobileNav` | OK, drawer en `var(--bg-layer)` |
| `RepubliqueBand` | Conserve la palette drapeau (institutionnel) |
| `Footer` | OK, regle `data-theme="dark"` dans lot 79 |
| `BriefingAudio` | OK, hover ambre conserve |
| `EmptyState` | SVG monochromes, lisibles sur fond sombre |
| `Skeleton` | Shimmer adapte (override sur `.skeleton-line` et inline) |

## Limitations connues

1. **Tuiles Leaflet** restent en mode clair (decision UX : la carte
   ministerielle doit etre instantanement lisible quel que soit le theme).
2. **Recharts** : les axes adoptent `currentColor`. A surveiller sur les
   pages `/pnpi/stats` qui ont des couleurs hardcodees dans les configs
   `tooltip` et `legend`.
3. **Iframes embarquees** (`/embed/kpis`, `/embed/status`) ignorent le
   theme parent — par design (elles sont integrees dans des sites tiers).
4. Les **inline-styles avec `color` ou `background`** restent un anti-pattern.
   Quand vous touchez a une page : remplacez par `var(--text-soft)` ou
   `var(--surface)` plutot que d'ajouter un override CSS.

## Comment ajouter une page au mode sombre

1. Verifier d'abord que la page utilise `chart-card` / `table-card` —
   l'heritage CSS suffit dans 80 % des cas.
2. Si inline-styles inevitables, prefixer le selecteur :
   ```css
   html[data-theme="dark"] .ma-section h3 {
     color: var(--text-main);
   }
   ```
3. Tester avec le toggle dans la nav.
4. Mettre a jour ce document.
