# Plan multi-tenant CEMAC — Architecture et industrialisation

> **Document interne** · Architecture PNPI · Version 1.0 — Avril 2026
> Auteur : Jean Baptiste MBA NDONG (Architecte / Concepteur)
> Document associé : ADR-004 (décision proposée)

---

## 1. Objectif

Permettre à la PNPI de servir, à terme, **les six États de la zone CEMAC**
(Gabon, Cameroun, Congo, Tchad, Centrafrique, Guinée équatoriale) avec :

- une plateforme **commune** sur le plan logiciel et fonctionnel,
- une **souveraineté nationale** stricte sur les données,
- une **personnalisation locale** sur les nomenclatures, langues et
  référentiels,
- un **modèle économique soutenable** pour le concepteur et pour les États
  clients,
- une posture diplomatique reconnaissant le **Gabon comme État pionnier**.

## 2. Diagnostic des trois stratégies

### Stratégie A — Instance dédiée par pays (recommandée)

Chaque pays = sa propre instance complète (frontend + backend + base +
documents). Code source unique, mais déploiements indépendants.

```
   Code source unique (GitHub privé, tag v1.x.y)
              │
   ┌──────────┼──────────┬──────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼          ▼
 pnpi.ga    pnpi.cm    pnpi.cg    pnpi.td    pnpi.cf    pnpi.gq
 (ANINF)    (Camtel)  (Brazza)  (Sotel-T)  (CNSI)     (GETESA)
   │          │          │          │          │          │
  DB GA      DB CM      DB CG      DB TD      DB CF      DB GQ
```

### Stratégie B — Base partagée avec `tenant_id`

Une seule base PostgreSQL pour les 6 pays, isolation par filtrage SQL.

```
                  Code unique
                       │
              ┌────────┴────────┐
              ▼                 ▼
        pnpi.cemac.org    DB PostgreSQL
                          (rangée tenant_id)
```

### Stratégie C — Hybride

Code et frontend partagés, base par pays.

```
        pnpi-cemac (frontend unique)
                  │
                  ▼
            Backend partagé
              │ │ │ │ │ │
              ▼ ▼ ▼ ▼ ▼ ▼
            DB GA CM CG TD CF GQ
```

### Comparaison

| Critère | A : Instance dédiée | B : Base partagée | C : Hybride |
|---|:---:|:---:|:---:|
| Souveraineté nationale | **+++** | – | + |
| Coût infrastructure | – | +++ | + |
| Migrations Alembic | – | +++ | – |
| Risque IDOR transfrontalier | **+++** | – – – | + |
| SLA différenciés possibles | +++ | – | + |
| Analytics CEMAC consolidées | – | +++ | + |
| Personnalisation par pays | +++ | – | + |
| Acceptabilité politique | **+++** | – – – | + |

## 3. Recommandation

**Stratégie A — Instance dédiée par pays** (cf. ADR-004).

Argumentaire principal :

1. **Souveraineté non négociable** : aucun État CEMAC n'acceptera que
   ses dossiers d'agréments industriels — données économiques sensibles —
   vivent dans une base hébergée chez un voisin.
2. **Sécurité par isolation** : un incident dans un pays ne contamine pas
   les autres. Critère retenu par les agences cyber africaines (ANSSI/SN,
   ANSI/SN, FFCC).
3. **Discours politique vendable** : « vous restez maître de votre
   plateforme nationale, le Gabon vous transfère un standard ».
4. **Conformité naturelle** au futur règlement CEMAC sur la protection
   des données personnelles (en cours de finalisation 2026).

## 4. Architecture du *country pack*

Pour rendre la stratégie A viable opérationnellement, chaque pays est
configuré par un **country pack** : un ensemble de fichiers de
configuration et de jeux de données seed.

```
config/
  country/
    common.yml           # Config partagée
    ga.yml               # Gabon
    cm.yml               # Cameroun
    cg.yml               # Congo
    td.yml               # Tchad
    cf.yml               # Centrafrique
    gq.yml               # Guinée équatoriale
  seeds/
    ga/
      provinces.csv
      secteurs_industriels.csv
      banques_homologuees.csv
      nomenclature_isic.csv
    cm/
      ...
```

### Champs typiques d'un country pack

| Champ | Exemple Gabon | Exemple Cameroun |
|---|---|---|
| `country_code` | `ga` | `cm` |
| `country_name_fr` | République Gabonaise | République du Cameroun |
| `country_name_en` | Gabonese Republic | Republic of Cameroon |
| `default_language` | `fr` | `fr` |
| `secondary_languages` | – | `en` |
| `currency_code` | `XAF` | `XAF` |
| `provinces` | 9 provinces | 10 régions |
| `nomenclature_secteur` | NACE-Gabon | NACE-Cameroun (différente) |
| `regulator_industrial` | Min. Industrie | MINMIDT |
| `regulator_tax` | DGI Gabon | DGI Cameroun |
| `regulator_company_registry` | RCCM Gabon | RCCM Cameroun |
| `signature_authority` | ARCEP | ANTIC |
| `default_tz` | `Africa/Libreville` | `Africa/Douala` |

### Champs propres à la Guinée équatoriale

- Langue principale : **espagnol**.
- Nomenclature sectorielle : à harmoniser avec NACE européen.
- L'app Flutter doit charger le bundle `es_ES`.

## 5. Adaptations nécessaires (chiffrées)

| Adaptation | Effort | Statut |
|---|---|---|
| i18n complet backend (Babel-py) | 6 j-h | Voir dette D-018 |
| i18n complet frontend (next-intl) | 8 j-h | Partiel |
| i18n complet Flutter | 4 j-h | Non démarré |
| Country pack : structure + parser | 4 j-h | Non démarré |
| Migration des données seed Gabon → format country pack | 3 j-h | Non démarré |
| Provisioning Terraform reproductible | 8 j-h | Non démarré |
| Nomenclatures sectorielles 6 pays | 12 j-h | Non démarré |
| Adaptation des PDF d'arrêtés (logo, mentions) | 5 j-h | Non démarré |
| Workflows régionaux différents (validations) | 8 j-h | Non démarré |
| Exports adaptés autorités locales | 6 j-h | Non démarré |
| **Total minimal** | **~64 j-h** | |

## 6. Souveraineté des données par pays

### Principe directeur

Chaque tenant héberge ses données **sur le territoire national de son
pays client**. Aucune donnée ne franchit les frontières sans autorisation
explicite.

### Cas particulier — pays sans datacenter Tier-III

Le Tchad et la Centrafrique n'ont pas, à date, d'opérateur national de
datacenter classé Tier-III.

Trois options :
1. **Hébergement ANINF Gabon en mode mandat** — le concepteur signe une
   convention de mandat tripartite avec l'État client + ANINF. Solution
   transitoire, étiquetée comme telle.
2. **Co-location dans un datacenter régional** (Libreville, Douala,
   Brazzaville, Yaoundé). Choisi par l'État client.
3. **Hébergement local sur infrastructure modeste** mais redondance
   ANINF en site secondaire.

Aucune option ne doit présenter la PNPI comme solution « hébergée à
l'étranger » — vocabulaire à proscrire dans les négociations.

### Transferts contrôlés

Cas où un transfert transfrontalier est **autorisé** :
- Vérification d'identité d'une entreprise enregistrée dans le pays voisin
  (RCCM CEMAC OHADA — données publiques).
- Statistiques agrégées (jamais nominatives).
- Audits inter-États sous accord bilatéral.

Tout transfert est tracé dans `core/audit.py` avec qualificatif
`cross_border=true` et logué pour le délégué à la protection des données
de l'État émetteur.

## 7. Modèle économique CEMAC

### Hypothèses de pricing

| Pays | Population | PIB indust. (% PIB) | Forfait cible /an |
|---|---:|---:|---:|
| Gabon | 2,3 M | ~5 % | 28 M FCFA (référence) |
| Cameroun | 28 M | ~14 % | 60-90 M FCFA |
| Congo | 6 M | ~12 % | 35-50 M FCFA |
| Tchad | 17 M | ~6 % | 25-40 M FCFA |
| Centrafrique | 5 M | ~5 % | 18-25 M FCFA |
| Guinée éq. | 1,5 M | ~6 % | 22-30 M FCFA |

**Total cible** à régime établi : **180-260 M FCFA/an** sur les 6 pays.

### Structuration

- Le concepteur facture via une structure juridique gabonaise (SARL ou
  équivalent).
- Chaque convention nationale **rétrocède un pourcentage symbolique
  (5-10 %)** au Gabon, formellement comme « État pionnier ».
- Le forfait inclut : licence, maintenance, support N2, mises à jour
  *country pack*, formation initiale.
- Le forfait n'inclut pas : développements spécifiques majeurs,
  hébergement (à la charge du pays client), pentest annuel (recommandé
  mais facturé séparément).

### Modèle annexe — *Marketplace* régional

À horizon 24 mois, possibilité d'un module SaaS optionnel mutualisé
(Open Data CEMAC, statistiques sectorielles) — non régalien — mutualisé
sur infrastructure ANINF, avec adhésion volontaire des pays.

## 8. Plan de bascule

### Phase préalable (T0 → T+6 mois)
- Stabiliser le tenant Gabon en production.
- Construire le *country pack* infrastructure.
- Industrialiser le déploiement (Terraform).

### Phase pilote (T+6 → T+12 mois)
- Identifier le pays pilote (recommandé : **Cameroun** — plus grand tissu
  industriel CEMAC, francophone, infra mature).
- Diplomatie technique : présentation au Ministère camerounais.
- POC technique sans déploiement officiel (pré-production).

### Phase essaimage (T+12 → T+24 mois)
- Premier déploiement officiel pays pilote.
- Retour d'expérience structuré.
- Ouverture aux 4 pays restants en fonction des opportunités
  diplomatiques.

### Phase régime (T+24 → T+36 mois)
- 6 tenants opérationnels.
- Equipe régionale (3-4 personnes).
- Revue annuelle des country packs.

## 9. Risques spécifiques CEMAC

| Risque | Mitigation |
|---|---|
| Refus politique d'un pays voisin | Posture « État pionnier Gabon », partenariat technique non-exclusif |
| Concurrence d'éditeurs internationaux (SAP, Oracle Public Sector) | Différenciation par souveraineté + langue + tarification adaptée |
| Hétérogénéité des écosystèmes tech locaux | Country pack + déploiement supervisé par concepteur |
| Stabilité politique (Tchad, Centrafrique) | Phasage : ces pays en dernier |
| Devises et change | Tout en FCFA (XAF) — aucun risque de change CEMAC |
| Coût de support multi-pays | Recrutement régional T+18 mois |

(Risques détaillés dans `risk-register.md`.)

## 10. Indicateurs de réussite régionale

| KPI | T+12 mois | T+24 mois | T+36 mois |
|---|---|---|---|
| Tenants en production | 1 | 2 | 6 |
| Tenants en POC | 1 | 1 | 0 |
| Revenus annualisés | 28 M | 70 M | 200 M+ |
| Equipe technique | 3 | 5 | 8 |
| Articles presse régionale | 5 | 15 | 40 |
| Reconnaissance Gabon (mentions officielles) | locale | sous-régionale | continentale |

## 11. Comparables internationaux

- **Estonia X-Road** : socle technique partagé, instances nationales.
  Modèle de référence. La Finlande a adopté X-Road pour Suomi.fi sans
  fusionner les bases.
- **France-Connect** : monolocataire, exporté à plusieurs pays
  africains avec **adaptations locales fortes**.
- **GovTech Singapore** : modèle régional ASEAN — proche de notre
  ambition CEMAC.
- **Sénégal e-Gov** : pas exporté à la CEDEAO faute de country pack —
  contre-exemple à éviter.

---

*Fin du document.*
