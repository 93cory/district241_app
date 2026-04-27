# Plan de mise en production J0–J+90

> **Document opérationnel** · Architecture PNPI · Version 1.0 — Avril 2026
> Auteur : Jean Baptiste MBA NDONG (Architecte / Concepteur)

---

## 1. Cadre

Ce calendrier court le jour où le **protocole de partenariat** entre le
concepteur (ou sa structure juridique) et le Ministère de l'Industrie est
signé (J0). Il vise une **ouverture officielle** au J+60 et un **retour
d'expérience formel** au J+90.

Hypothèses de départ :
- Posture stratégique C (hybride) retenue — droit d'usage perpétuel cédé
  à l'État, PI conservée.
- Forfait annuel maintenance/évolution validé (28 M FCFA Option Avancée).
- ANINF disponible pour héberger la production.
- Cabinet ministériel mobilise les utilisateurs pour la formation.

## 2. Vue d'ensemble du calendrier

```
J0   Signature                                    Périmètre Cabinet
J+1  ──┐
       │ Cadrage opérationnel (équipe, accès)
J+7  ──┼──┐
       │  │ Provisioning serveurs ANINF + secrets
J+15 ──┼──┼──┐
       │  │  │ Pentest externe + remédiation
J+30 ──┼──┼──┼──┐
       │  │  │  │ Formation 6 profils utilisateurs
J+45 ──┼──┼──┼──┤
       │  │  │  │ Bascule + ouverture progressive
J+60 ──┼──┼──┼──┴── Ouverture officielle Cabinet
       │  │  │      Communication publique
J+75 ──┼──┴──┘   Phase pilote suivie
       │
J+90 ──┴── Retour d'expérience + ajustements
```

## 3. Étapes détaillées

### J0 — Signature du protocole

**Objectif** : avoir un cadre juridique, financier et technique signé.

| # | Tâche | Responsable | Livrable | Critère d'acceptation |
|---|---|---|---|---|
| 0.1 | Signature de la convention (cf. `docs/strategie/04-convention-protocole.md`) | Cabinet Ministre + concepteur | Convention signée | Document paraphé recto-verso |
| 0.2 | Émission de l'ordre de service | DGSI Ministère | OS écrit | Numéro OS communiqué |
| 0.3 | Communication interne au Ministère | Cabinet | Note de service | Diffusée aux 6 profils utilisateurs |
| 0.4 | Démarrage du compteur paiement T1 | Trésorerie | Échéancier validé | Date de premier paiement notifiée |

**Risques** : signature reportée pour validation Conseil d'État (atténuer
en obtenant a priori le visa de la Direction des Affaires Juridiques).

---

### J+1 → J+7 — Cadrage opérationnel + provisioning

**Objectif** : socle technique prêt et équipe identifiée.

| # | Tâche | Responsable | Livrable | Critère d'acceptation |
|---|---|---|---|---|
| 1.1 | Désignation du Référent fonctionnel Ministère | Cabinet | Nomination | Nom + email + téléphone |
| 1.2 | Désignation du Référent technique ANINF | ANINF | Nomination | Idem |
| 1.3 | Mise en place du canal d'incident (Telegram / mail dédié) | Concepteur | Bot ou alias | Premier message test reçu |
| 1.4 | Provisioning VM ANINF (4 vCPU / 16 Go RAM / 200 Go SSD × 2) | ANINF | VMs livrées | SSH OK depuis poste concepteur |
| 1.5 | Création du nom de domaine `pnpi.gov.ga` (ou équivalent) + certificat TLS | ANINF + ARCEP | DNS + certificat | HTTPS OK |
| 1.6 | Génération initiale des secrets (`PNPI_SECRET_KEY`, mots de passe DB, etc.) | Concepteur + ANINF | Secrets dans coffre | Test connexion DB OK |
| 1.7 | Premier déploiement Docker Compose en pré-production | Concepteur | App accessible interne | Login admin fonctionnel |
| 1.8 | Backup initial automatisé (cron quotidien) | Concepteur | Job cron + 1ère sauvegarde | Restauration testée sur env. annexe |

**Livrables clés** :
- Pré-production fonctionnelle, accessible aux référents Cabinet/ANINF.
- Procédure de déploiement validée (`docs/deployment-guide.md`).

**Risques** : retard ANINF sur le provisioning (atténuer par démarrage
double-piste — pré-prod sur infra concepteur en attendant).

---

### J+8 → J+15 — Pentest externe + remédiation

**Objectif** : valider le niveau de sécurité par un tiers indépendant.

| # | Tâche | Responsable | Livrable | Critère d'acceptation |
|---|---|---|---|---|
| 2.1 | Sélection du prestataire pentest (cabinet local ou France) | Cabinet + concepteur | Bon de commande | Prestataire mobilisé |
| 2.2 | Pentest boîte grise sur la pré-production | Prestataire | Rapport intermédiaire J+12 | Rapport reçu |
| 2.3 | Tri des findings (CVSS) | Concepteur | Tableau trié | Tous les findings classés |
| 2.4 | Remédiation des findings CRITIQUES + HAUTS | Concepteur | Commits + tests | 0 critique, 0 haut résiduel |
| 2.5 | Re-pentest ciblé sur findings remédiés | Prestataire | Rapport final | Validation écrite |
| 2.6 | Communication au Cabinet du verdict | Concepteur | Note synthèse | Verdict accepté |

**Budget indicatif** : 4 à 6 M FCFA pour un pentest sérieux (5 j × tarif
cabinet local).

**Risque majeur** : finding CRITIQUE non remédiable en 5 jours → bascule
de la date d'ouverture officielle. Plan B : ouvrir avec un périmètre
réduit (lecture seule) le temps de la remédiation.

---

### J+16 → J+30 — Formation des 6 profils utilisateurs

**Objectif** : 100 % des utilisateurs nominaux capables d'utiliser la
PNPI sur leur périmètre.

| # | Profil | Effectif cible | Durée | Format | Livrable |
|---|---|---|---|---|---|
| 3.1 | Administrateurs techniques | 2-3 | 2 j | Présentiel + console | Manuel + droits attribués |
| 3.2 | Cabinet Ministre + Ministre | 3-5 | 0,5 j | Présentiel privatif | Démo personnalisée |
| 3.3 | Directeurs | 5-8 | 1 j | Présentiel | Manuel directeur |
| 3.4 | Instructeurs | 10-15 | 2 j | Présentiel + cas pratiques | Manuel + scénarios |
| 3.5 | Inspecteurs | 15-25 | 1 j présentiel + 0,5 j terrain | Présentiel + mobile | Manuel + app installée |
| 3.6 | Opérateurs industriels (pilote) | 20-30 | 0,5 j | Webinar | Tutoriels vidéo |

**Responsable** : concepteur (J+16 → J+25), puis référent Ministère (J+26
→ J+30). Validation par le Cabinet à J+30.

**Critère d'acceptation** : taux de complétion ≥ 90 % par profil + score
de satisfaction ≥ 7/10.

**Livrable** : 6 manuels utilisateur + 1 vidéo de présentation + journal
de formation.

**Risque** : indisponibilité des inspecteurs (déplacements terrain) →
prévoir 2 sessions de rattrapage en J+45.

---

### J+31 → J+59 — Bascule progressive en production

**Objectif** : passer de pré-production à production sans rupture.

| # | Tâche | Responsable | Livrable | Critère d'acceptation |
|---|---|---|---|---|
| 4.1 | Bascule infra : pré-prod → prod (DNS, certificats, secrets prod) | Concepteur + ANINF | Prod accessible | Health check OK |
| 4.2 | Migration des données initiales (référentiel opérateurs, secteurs) | Concepteur + DGI Industrie | Base remplie | Validation fonctionnelle |
| 4.3 | Phase pilote 10 opérateurs volontaires | Concepteur + Industriels | 10 ATI déposés en réel | Aucun blocage critique |
| 4.4 | Test de charge réaliste (k6 — 200 utilisateurs concurrents) | Concepteur | Rapport perf | p95 < 1s, taux d'erreur < 0,5 % |
| 4.5 | Test de bascule (chaos engineering supervisé) | Concepteur + ANINF | Rapport bascule | RTO < 4h, RPO < 1h |
| 4.6 | Préparation communication ouverture (presse, partenaires CEMAC) | Cabinet + concepteur | Dossier de presse | Validation Cabinet |

**Critère d'acceptation global** : aucun ticket bloquant ouvert depuis 3
jours, dashboards verts, équipe support prête.

---

### J+60 — Ouverture officielle

**Objectif** : événement institutionnel marquant l'entrée en service
nominale.

| # | Tâche | Responsable | Livrable |
|---|---|---|---|
| 5.1 | Cérémonie d'ouverture (Cabinet + presse) | Cabinet + concepteur | Discours + démo live |
| 5.2 | Ouverture aux 100 % des opérateurs industriels | Concepteur | Activation flag PROD |
| 5.3 | Communication ANINF / partenaires CEMAC | Cabinet | Note diplomatique |
| 5.4 | Mise à disposition du portail public d'information | Concepteur | URL publique |
| 5.5 | Astreinte renforcée 7j/7 J+60 → J+75 | Concepteur | Planning |

**Critère d'acceptation** : événement tenu, communication diffusée,
plateforme accessible publiquement.

---

### J+61 → J+89 — Phase pilote suivie

**Objectif** : capter les retours réels, corriger les écarts d'usage.

Activités :
- Suivi quotidien des incidents.
- Synthèse hebdomadaire des KPI (utilisateurs actifs, ATI déposés, délai
  d'instruction observé, satisfaction).
- Patch correctifs (release tous les 7 jours).
- Permanence support : 2h/jour minimum, jours ouvrables.
- Détection des cas non couverts → backlog produit pour la phase suivante.

---

### J+90 — Retour d'expérience formel

**Objectif** : capitaliser, ajuster et passer en mode régime de croisière.

| # | Tâche | Responsable | Livrable |
|---|---|---|---|
| 6.1 | Réunion REX avec Cabinet | Concepteur + Cabinet | Compte-rendu signé |
| 6.2 | Bilan KPI vs cibles | Concepteur | Rapport `docs/architecture/historique/rex-j90.md` |
| 6.3 | Mise à jour du `risk-register.md` | Concepteur | Nouvelle version |
| 6.4 | Backlog priorisé pour Q+1 | Concepteur + Cabinet | Roadmap T+90 → T+180 |
| 6.5 | Communication des résultats aux ministères pairs CEMAC | Cabinet | Présentation préparée |
| 6.6 | Décision GO/NO-GO pour passage à la phase CEMAC | Cabinet | Décision écrite |

**Critère d'acceptation** : REX signé conjointement par le Cabinet et le
concepteur, roadmap T+90→T+180 validée.

## 4. Responsabilités RACI synthétique

| Domaine | Concepteur | ANINF | Cabinet | Prestataire |
|---|:---:|:---:|:---:|:---:|
| Code et déploiement | **R/A** | C | I | – |
| Infrastructure et secrets | C | **R/A** | I | – |
| Sécurité (pentest) | C | C | A | **R** |
| Formation utilisateurs | **R/A** | – | C | – |
| Communication publique | C | – | **R/A** | – |
| Données métier (référentiel) | C | – | **R/A** | – |

Légende : R = Réalise, A = *Accountable* (rend compte), C = Consulté,
I = Informé.

## 5. Risques projet J0-J+90

| Risque | Prob | Impact | Mitigation |
|---|---|---|---|
| Provisioning ANINF retardé | M | H | Double-piste pré-prod sur infra concepteur |
| Pentest révèle finding bloquant | M | H | Plan B ouverture périmètre réduit |
| Formation : refus inspecteurs | M | M | Sessions de rattrapage + sponsor Cabinet |
| Bug critique post-J+60 | M | H | Astreinte renforcée + rollback testé |
| Ouverture officielle reportée | F | M | Communication anticipée Cabinet |
| Concepteur indisponible (santé) | F | C | Recrutement appui T+1 mois (cf. R-022) |

(Détail complet dans `risk-register.md`.)

## 6. Budget indicatif J0-J+90

| Poste | Montant FCFA |
|---|---:|
| Pentest externe | 5 000 000 |
| Hébergement ANINF (3 mois) | 1 500 000 |
| Frais formation (logistique, déplacements) | 2 000 000 |
| Outillage (Vault, monitoring stack) | 800 000 |
| Communication ouverture | 1 500 000 |
| Provision aléas (10 %) | 1 100 000 |
| **Total J0-J+90** | **11 900 000** |

À comparer au forfait annuel 28 M FCFA — cohérent avec la phase
d'investissement initial.

---

*Fin du document.*
