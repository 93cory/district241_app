# Modèle financier PNPI — Projection 36 mois

> Hypothèse de base : posture C (Hybride) · Convention pluri-annuelle · Option Avancée 28 M FCFA/an
> Document interne. Tous les montants en FCFA sauf indication contraire.

---

## 1. Hypothèses de revenus (3 scénarios)

### Scénario CONSERVATEUR (probabilité 60 %)

| Année | Revenu Gabon | Revenu CEMAC | Total |
|---|---|---|---|
| Année 1 (M1–M12) | 18 M (Standard, démarrage) | 0 | **18 M** |
| Année 2 | 22 M (passage Avancé partiel) | 0 | **22 M** |
| Année 3 | 28 M (Avancé) | 0 | **28 M** |

### Scénario CENTRAL (probabilité 25 %)

| Année | Revenu Gabon | Revenu CEMAC | Total |
|---|---|---|---|
| Année 1 | 28 M (Avancé direct) | 0 | **28 M** |
| Année 2 | 28 M | 12 M (1er pays CEMAC : Cameroun) | **40 M** |
| Année 3 | 32 M | 24 M (2 pays CEMAC) | **56 M** |

### Scénario OPTIMISTE (probabilité 15 %)

| Année | Revenu Gabon | Revenu CEMAC | Total |
|---|---|---|---|
| Année 1 | 28 M | 0 | **28 M** |
| Année 2 | 32 M | 24 M (2 pays) | **56 M** |
| Année 3 | 42 M (Premium) | 60 M (4 pays) | **102 M** |

---

## 2. Charges récurrentes (par an)

| Poste | Année 1 | Année 2 | Année 3 | Notes |
|---|---|---|---|---|
| **Infrastructure cloud** | | | | |
| Serveur prod (ANINF / OVH Dakar) | 4 M | 4.5 M | 5 M | scale-up à mesure |
| Storage S3 / MinIO + backups | 1 M | 1.5 M | 2 M | rétention 30j puis archivage |
| Domaine + HTTPS | 0.1 M | 0.1 M | 0.1 M | Let's Encrypt gratuit |
| **Services tiers** | | | | |
| Crédits Anthropic / Claude | 1.8 M | 2.4 M | 3 M | chat assistant + IA reco |
| SMTP transactionnel | 0.4 M | 0.6 M | 0.8 M | SendGrid ou AWS SES |
| Monitoring (Grafana Cloud, Sentry) | 0.6 M | 0.8 M | 1 M | |
| **Sécurité & conformité** | | | | |
| Pentest annuel externe | 3 M | 4 M | 5 M | obligatoire pour ministériel |
| Audit ISO 27001 (préparation) | 0 | 5 M | 0 | une fois sur 3 ans |
| **Structure** | | | | |
| Avocat / fiscal / structure légale | 1.5 M | 1 M | 1 M | création + gestion |
| Comptabilité (cabinet ext.) | 1.2 M | 1.5 M | 1.8 M | |
| Assurance RC pro | 0.8 M | 0.9 M | 1 M | |
| **Outils dev** | | | | |
| GitHub Pro + CI minutes | 0.3 M | 0.4 M | 0.5 M | |
| IDE / licences | 0.2 M | 0.3 M | 0.3 M | |
| **Marketing / déplacements** | | | | |
| Site vitrine + branding | 0.5 M | 0.3 M | 0.3 M | |
| Déplacements CEMAC (S2/S3) | 0 | 2 M | 4 M | démarches Cameroun, Congo |
| **TOTAL CHARGES** | **15.4 M** | **25.3 M** | **25.8 M** | |

---

## 3. Compte d'exploitation simplifié — Scénario CENTRAL

| | Année 1 | Année 2 | Année 3 |
|---|---|---|---|
| **Revenus** | 28.0 | 40.0 | 56.0 |
| Charges (cf. ci-dessus) | -15.4 | -25.3 | -25.8 |
| **EBE avant rémunération** | **12.6** | **14.7** | **30.2** |
| Rémunération concepteur (vous) | -12.0 | -14.0 | -22.0 |
| **EBE final** | **0.6** | **0.7** | **8.2** |
| Réserve / investissement | 0.6 | 0.7 | 8.2 |

→ En **Année 3**, la PNPI dégage 8 M de réserve qui peut financer une 1ʳᵉ embauche (junior dev ou ops).

---

## 4. Trésorerie — points d'attention

### Risque : délai paiement public

L'État Gabonais paie typiquement à **60–180 jours** sur facture. Avec 28 M annuels facturés trimestriellement (7 M / trimestre), un retard de 90 jours = besoin de fonds de roulement de **14 M minimum**.

**Solution** : négocier dès la convention :
- Paiement d'avance trimestriel (50% à T0, 50% à T+45 jours)
- Pénalité de retard automatique au-delà de 60 jours
- Possibilité de cession Dailly à une banque locale (BICIG, BGFI) si la convention est ferme

### Besoin de fonds de roulement initial

| Poste | Montant |
|---|---|
| Trésorerie 6 mois charges (15.4 M / 12 × 6) | 7.7 M |
| Provision délai paiement (1 trimestre) | 7.0 M |
| Caution éventuelle marché public | 2.0 M |
| **Apport initial nécessaire** | **~17 M** |

**Sources possibles** :
- Apport personnel (épargne)
- Prêt bancaire (BGFI / Ecobank ont des produits PME tech)
- ANPI-Gabon (Agence Nationale de Promotion des Investissements) — subvention possible
- Concours / programmes (Orange Digital Center, Africa Innovation Challenge)
- Avance sur première convention (négociable)

---

## 5. Structure légale recommandée

### Option A — SARL classique
- Capital min. 1 M FCFA
- Coût création ~500 K FCFA (notaire + greffe + RCCM)
- Délai 4–6 semaines
- IS taxe normale (30 %)
- Régime fiscal réel ou simplifié selon CA

### Option B — SUARL (associé unique) — RECOMMANDÉE pour vous
- Solo founder = associé unique
- Capital min. 1 M FCFA
- Pas d'AGE/AGO obligatoire
- Coût et délai identiques à SARL
- Conformité OHADA

### Option C — Association reconnue d'utilité publique
- Pas d'IS si activité non lucrative
- Mais : difficile à utiliser comme prestataire facturant
- À écarter pour ce cas

→ **Décision recommandée** : SUARL « PNPI Gabon » ou « MBA Industrial Tech », associé unique = vous.

---

## 6. Variantes selon l'audience

### Si le Cabinet propose un **statut d'agent contractuel** au sein de l'ANINF

- Salaire grille fonction publique cadre A : ~1.2 M FCFA/mois brut = 14.4 M/an
- Avantages : sécurité de l'emploi, statut, retraite
- Inconvénients : capacité limitée pour CEMAC, perte de la PI, plafond salarial
- **À refuser poliment** sauf si proposition d'un poste haut (Directeur, Chargé de mission Ministre)

### Si le Cabinet propose un **partenariat mixte ANPI + Ministère**

- Convention pluri-annuelle de 24-36 mois renouvelable
- Cofinancement ANPI sur la création / scale-up CEMAC
- **À accepter avec engagement de KPIs clairs**

### Si le Cabinet propose une **acquisition** de la PNPI par l'État

- Évaluation du code source ~50–80 M FCFA (forfait one-shot)
- Vous devenez consultant freelance auprès du Ministère
- Avantages : cash immédiat
- Inconvénients : perte CEMAC, dépendance à un client unique
- **À négocier seulement si montant ≥ 80 M FCFA + contrat consultant 3 ans à 18 M/an**

---

## 7. Indicateurs de succès à proposer dans la convention

| KPI | Cible Année 1 | Cible Année 2 | Cible Année 3 |
|---|---|---|---|
| Disponibilité plateforme (uptime) | ≥ 99.0 % | ≥ 99.5 % | ≥ 99.9 % |
| Délai moyen traitement ATI | -20 % vs 2026 | -35 % | -50 % |
| Nombre d'utilisateurs actifs | 50 | 200 | 500 |
| Volume ATI traités / an | 200 | 500 | 1000+ |
| Taux satisfaction agents (NPS) | ≥ 30 | ≥ 50 | ≥ 70 |
| Incidents critiques résolus < 4h | ≥ 90 % | ≥ 95 % | ≥ 98 % |
| Données ouvertes publiées | Mensuel | Hebdo | Quotidien |

---

## 8. Synthèse 3-points pour l'audience

1. **« Je vous propose 28 M FCFA / an pour maintenir et faire évoluer une plateforme dont la valeur d'investissement équivalent serait 5x supérieure. »**
2. **« En 3 ans, le ratio coût/valeur est démontré : 84 M FCFA d'investissement public total contre 200+ M FCFA de coût alternatif. »**
3. **« Je conserve la propriété intellectuelle pour pouvoir faire rayonner ce modèle dans la sous-région CEMAC, à votre nom et à celui du Gabon. Aucun coût additionnel pour le contribuable gabonais. »**

---

*Note interne. Ne pas distribuer. Utiliser comme aide-mémoire pour l'audience.*
