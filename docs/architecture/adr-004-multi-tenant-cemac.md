# ADR-004 — Multi-tenant CEMAC : instance dédiée par pays

- **Statut** : Proposé (à arbitrer en comité Cabinet + ANINF)
- **Date** : 2026-04-27
- **Auteur** : Jean Baptiste MBA NDONG
- **Décideurs concernés** : Cabinet du Ministère, ANINF, futurs partenaires
  CEMAC (Cameroun, Congo, Tchad, Centrafrique, Guinée équatoriale)
- **Documents liés** : `multi-tenant-cemac.md`, ADR-003

## Contexte

La posture stratégique retenue (cf. `docs/strategie/01-cadrage-strategique.md`,
posture C — Hybride) prévoit que le concepteur conserve la propriété
intellectuelle pour proposer la PNPI aux 5 autres pays de la CEMAC :

- Cameroun — ~28 M habitants, tissu industriel le plus dense de la zone.
- Congo (Brazzaville) — ~6 M habitants, économie pétrolière en
  diversification.
- Tchad — ~17 M habitants, tissu industriel naissant.
- Centrafrique — ~5 M habitants, reconstruction industrielle.
- Guinée équatoriale — ~1,5 M habitants, hispanophone.

Trois architectures multi-tenant sont possibles :

1. **Instance dédiée par pays** (deployment isolé, base PostgreSQL séparée,
   nom de domaine national, code commun déployé en `git tag`).
2. **Base partagée avec colonne `tenant_id`** (toutes les données dans une
   seule base, isolation logique par filtrage SQL).
3. **Hybride** : code et application partagés, base de données par tenant.

Contraintes propres au contexte CEMAC :
- **Souveraineté nationale** : aucun État CEMAC n'acceptera que ses données
  d'agréments industriels soient stockées dans la base d'un autre État.
- **Cadre juridique hétérogène** : chaque pays a son régime de protection
  des données (ou son absence).
- **Devises et secteurs locaux** : FCFA partagé (XAF), mais nomenclatures
  industrielles (ISIC), fiscalités, calendriers fériés et langues
  diffèrent (français + espagnol pour la Guinée Eq).
- **Maturité numérique disparate** : le Cameroun a un cloud public
  (Camtel/Cameroon Internet eXchange) ; la Centrafrique et le Tchad,
  beaucoup moins.

## Décision (proposée)

Nous proposons l'option **1 : instance dédiée par pays** comme architecture
cible CEMAC, avec les modalités suivantes :

- **1 base PostgreSQL par pays** (`pnpi_ga`, `pnpi_cm`, `pnpi_cg`, etc.).
- **1 instance applicative par pays** déployée sur un sous-domaine national
  (`pnpi.ga`, `pnpi.cm`, `pnpi.cg`).
- **1 référentiel de configuration par pays** (`config/country/{ga,cm,...}.yml`)
  pour les nomenclatures locales (provinces, secteurs, devises, langues
  par défaut).
- **1 code source unique** versionné. Chaque pays consomme un *git tag*
  validé après tests de non-régression.
- **Hébergement** : par défaut, dans le datacenter national du pays client
  (cloud public ou agence numérique nationale). En l'absence d'infra,
  hébergement temporaire à l'ANINF Gabon, sous mandat explicite.
- **Modèle commercial** : licence annuelle SaaS facturée à l'État client
  via la structure juridique du concepteur, avec un pourcentage rétrocédé
  au Gabon comme État pionnier.

## Conséquences

### Positives

- **Souveraineté nationale préservée** : chaque État garde le contrôle
  physique de ses données.
- **Sécurité par isolation** : une compromission au Tchad n'expose pas le
  Cameroun.
- **Personnalisation aisée** : chaque pays peut diverger sur les
  fonctionnalités locales sans impacter les autres.
- **Argument commercial fort** : « vous restez maître de votre
  infrastructure » — discours politiquement vendable.
- **Conformité naturelle** au RGPD-CEMAC en cours de finalisation.

### Négatives

- **Coût opérationnel multiplié** : N pays = N instances à superviser, N
  bases à sauvegarder, N déploiements à orchestrer.
- **Migrations de schéma plus lourdes** : chaque évolution Alembic doit
  être déployée N fois, avec un fenêtre de maintenance par pays.
- **Pas d'analytics CEMAC consolidées nativement** : il faut un *data
  warehouse* tiers pour agréger les KPI sous-régionaux.
- **Industrialisation indispensable** : sans Terraform / Ansible /
  GitOps, le modèle se grippe à 3 pays.

### Suivi

- **2026-T2** : prototype Terraform pour provisionner un tenant en
  <2 heures (cible).
- **2026-T2** : packaging d'un *country pack* (config par défaut + jeu de
  données seed).
- **2026-T3** : POC tenant Cameroun (sans déploiement officiel) pour
  valider la feuille de route.
- **2026-T4** : retour d'expérience tenant Gabon → patron de référence
  pour les pays suivants.

## Alternative considérée — Base partagée avec `tenant_id`

### Pour
- Coût infrastructure mutualisé (1 base PostgreSQL pour 6 pays).
- Migrations Alembic une seule fois.
- Analytics CEMAC nativement consolidées.
- Modèle SaaS classique éprouvé (Salesforce, Workday).

### Contre
- **Souveraineté impossible à garantir** : aucun État ne signera pour que
  ses données vivent dans une base hébergée chez un voisin.
- Risque d'IDOR multi-pays catastrophique : un bug = fuite croisée.
- Migrations risquées : un schéma cassé impacte les 6 pays simultanément.
- Difficile d'avoir des SLA différenciés par pays.

### Verdict
**Rejeté pour le périmètre CEMAC.** La contrainte de souveraineté est
politiquement non négociable. Modèle pertinent uniquement si un acteur
supranational (CEMAC, BEAC) devait porter la plateforme — scénario
hypothétique non actuellement envisagé.

## Alternative considérée — Hybride (code partagé, base par pays)

### Pour
- Conserve la souveraineté (base par pays).
- Mutualise les coûts d'infrastructure applicative.

### Contre
- Risque opérationnel : une instance applicative qui se connecte à 6 bases
  est un *single point of failure* régional.
- Difficulté à honorer des SLA différenciés.
- Latence : connexion transfrontalière à chaque requête.

### Verdict
À étudier comme **étape transitoire** pendant que les pays clients
construisent leur datacenter, mais pas comme cible long terme.

## Comparables

- **France-Connect** : monolocataire (uniquement la France).
- **Sénégal e-Gov vs CEDEAO** : Sénégal n'a pas exporté son socle —
  chaque pays CEDEAO recompose. Modèle inverse de ce que nous proposons.
- **Estonia X-Road / Finland Suomi.fi** : socle technique partagé,
  instances nationales. **Modèle de référence pour CEMAC.**
- **Workday** : multi-tenant en base partagée — non transposable au
  régalien.

---

*Fin de l'ADR-004.*
