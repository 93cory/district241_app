# PNPI — Plan de développement, budget et ressources V5

Version de travail : V5  
Usage : cadrage décisionnel, préparation budgétaire, discussion institutionnelle  
Important : les montants ci-dessous sont indicatifs et doivent être affinés après cadrage officiel.

---

## 1. Objectif

Ce document propose une trajectoire de développement de la PNPI depuis le prototype actuel jusqu’à une plateforme institutionnelle exploitable.

Il couvre :

- phases de développement ;
- lots fonctionnels ;
- ressources humaines ;
- budget indicatif ;
- infrastructure ;
- sécurité ;
- formation ;
- exploitation.

---

## 2. Hypothèses de cadrage

Les hypothèses de départ sont les suivantes :

- le prototype existe déjà et sert de base de démonstration ;
- le périmètre prioritaire doit être validé par le Ministère ;
- la phase 1 doit privilégier RIN, ATI, inspection, ONI, sécurité et tableaux de bord ;
- les modules avancés seront déployés progressivement ;
- les données réelles nécessitent un cadrage institutionnel ;
- l’hébergement souverain doit être privilégié ;
- un audit sécurité externe est recommandé avant toute production officielle.

---

## 3. Phasage recommandé

### Phase 0 — Validation et cadrage

Durée indicative : 2 à 4 semaines.

Objectifs :

- valider la vision ;
- identifier les directions concernées ;
- confirmer les priorités ;
- cadrer les données ;
- établir les règles de gouvernance ;
- définir les rôles ;
- préparer la phase pilote.

Livrables :

- note de cadrage ;
- périmètre phase 1 ;
- matrice des acteurs ;
- calendrier atelier ;
- décision d’hébergement ;
- plan de sécurité initial.

---

### Phase 1 — Stabilisation du socle

Durée indicative : 6 à 8 semaines.

Objectifs :

- sécuriser le prototype ;
- fiabiliser l’authentification ;
- vérifier l’isolation des données ;
- stabiliser les workflows ;
- consolider RIN, ATI, inspection, ONI ;
- préparer préproduction.

Lots :

1. audit technique ;
2. correction bugs bloquants ;
3. sécurité RBAC ;
4. migration base cible ;
5. qualité des données ;
6. sauvegardes ;
7. supervision ;
8. recette interne.

---

### Phase 2 — Pilote institutionnel

Durée indicative : 8 à 12 semaines.

Objectifs :

- mettre en place une préproduction ;
- former les premiers utilisateurs ;
- intégrer un jeu de données validé ;
- tester les parcours métier ;
- mesurer l’usage ;
- corriger les écarts.

Périmètre recommandé :

- 1 à 3 directions ;
- 10 à 30 opérateurs pilotes ;
- quelques dossiers ATI ;
- quelques inspections ;
- un cockpit Ministre ;
- un tableau de bord ONI.

---

### Phase 3 — Production initiale

Durée indicative : 3 à 6 mois.

Objectifs :

- ouvrir la plateforme à un périmètre officiel ;
- renforcer l’exploitation ;
- signer les conventions d’échange ;
- mettre en place le support ;
- produire des rapports réguliers ;
- préparer l’extension fonctionnelle.

---

### Phase 4 — Extension stratégique

Durée indicative : 6 à 18 mois.

Modules à renforcer :

- investissements ;
- filières ;
- zones industrielles ;
- capital humain ;
- durabilité ;
- PPP ;
- interopérabilité ;
- BI / IA contrôlée ;
- mobile terrain ;
- open data selon arbitrage.

---

## 4. Ressources humaines recommandées

### 4.1 Équipe minimale phase pilote

| Rôle | Charge indicative | Mission |
|---|---:|---|
| Chef de projet / Product Owner | 0,5 à 1 ETP | coordination, arbitrages, priorités |
| Architecte / Lead développeur | 1 ETP | architecture, backend, frontend, sécurité |
| Développeur full-stack | 1 ETP | fonctionnalités, corrections, UI |
| Référent données | 0,5 ETP | qualité, référentiels, import/export |
| Référent métier Ministère | 0,5 ETP | validation métier, ateliers |
| Référent sécurité | 0,25 ETP | RBAC, audit, conformité |
| Support / formation | 0,5 ETP | guides, assistance, formation |

### 4.2 Équipe cible production

| Rôle | Charge indicative |
|---|---:|
| Responsable produit PNPI | 1 ETP |
| Lead technique | 1 ETP |
| Développeurs full-stack | 2 ETP |
| DevOps / administrateur système | 1 ETP |
| Data manager | 1 ETP |
| RSSI ou référent cybersécurité | 0,5 ETP |
| Support utilisateurs | 1 à 2 ETP |
| Référents métiers directions | temps partiel |

---

## 5. Budget indicatif par poste

Les montants ci-dessous sont des ordres de grandeur pour discussion.

| Poste | Cadrage officiel | Pilote institutionnel | Production initiale |
|---|---:|---:|---:|
| Cadrage fonctionnel et technique | 8 à 18 M FCFA | inclus / ajustement | inclus selon convention |
| Audit prototype, sécurité et données | 4 à 10 M FCFA | 8 à 18 M FCFA | 15 à 35 M FCFA |
| Développement / stabilisation | 3 à 8 M FCFA | 35 à 80 M FCFA | 90 à 250 M FCFA |
| Infrastructure / hébergement | 1 à 4 M FCFA | 8 à 20 M FCFA | 25 à 80 M FCFA/an |
| Sécurité / audit / pentest | 3 à 8 M FCFA | 10 à 25 M FCFA | 25 à 70 M FCFA/an |
| Formation utilisateurs | 2 à 5 M FCFA | 8 à 20 M FCFA | 25 à 70 M FCFA |
| Support / maintenance | non applicable | 10 à 25 M FCFA | 40 à 120 M FCFA/an |
| Documentation / cahier des charges | 5 à 12 M FCFA | 5 à 15 M FCFA | 10 à 30 M FCFA |

Ces montants doivent être compris comme des fourchettes de cadrage. Le budget final dépendra du périmètre validé, du mode d’hébergement, du niveau de sécurité exigé, du nombre d’utilisateurs, du volume documentaire, des intégrations partenaires et du rythme de déploiement territorial.

---

## 6. Scénarios budgétaires

### Scénario A — Pilote maîtrisé

Objectif : cadrage officiel, démonstration institutionnelle, préproduction et quelques directions.

Budget indicatif : 80 à 180 M FCFA.

Inclus :

- cadrage détaillé ;
- stabilisation ;
- hébergement préproduction ;
- sécurité de base et audit ;
- formation restreinte ;
- documentation ;
- support pilote.

### Scénario B — Production initiale

Objectif : première mise en service officielle sur périmètre prioritaire.

Budget indicatif : 250 à 700 M FCFA.

Inclus :

- industrialisation ;
- base PostgreSQL/PostGIS ;
- supervision ;
- sauvegardes ;
- audit sécurité ;
- formation ;
- support ;
- documentation complète.

### Scénario C — Programme national étendu

Objectif : plateforme nationale multi-domaines, interopérabilité et extension territoriale.

Budget indicatif : 800 M à 2,5 milliards FCFA et plus sur 24 à 48 mois.

Inclus :

- équipe dédiée ;
- infrastructure souveraine ;
- mobile terrain ;
- interopérabilité ;
- BI avancée ;
- cybersécurité renforcée ;
- accompagnement national ;
- conduite du changement.

### Scénario D — Cadrage seul

Objectif : obtenir une décision institutionnelle sans engager immédiatement une production nationale.

Budget indicatif : 15 à 40 M FCFA sur 45 à 60 jours.

Inclus :

- ateliers métiers ;
- audit du prototype ;
- architecture cible ;
- note cybersécurité ;
- budget détaillé ;
- cahier des charges ;
- plan pilote ;
- stratégie de contractualisation.

---

## 7. Infrastructure indicative

### Phase pilote

- 1 serveur applicatif ;
- 1 base de données ;
- sauvegarde quotidienne ;
- accès HTTPS ;
- stockage documents limité ;
- monitoring simple.

### Production initiale

- serveur frontend ;
- serveur backend ;
- serveur base de données ;
- stockage documents ;
- Redis/cache ;
- sauvegardes automatisées ;
- supervision ;
- environnement préproduction ;
- pare-feu / reverse proxy ;
- certificats TLS.

### Production renforcée

- haute disponibilité ;
- réplication base ;
- stockage objet robuste ;
- PRA/PCA ;
- monitoring avancé ;
- journalisation centralisée ;
- SOC ou supervision sécurité.

---

## 8. Formation et conduite du changement

Profils à former :

- Ministre / Cabinet ;
- Secrétariat Général ;
- directeurs ;
- instructeurs ;
- inspecteurs ;
- administrateurs ;
- opérateurs pilotes ;
- partenaires selon périmètre.

Supports :

- guides rapides ;
- vidéos courtes ;
- fiches par rôle ;
- FAQ ;
- sessions pratiques ;
- scénarios de démonstration ;
- assistance post-formation.

---

## 9. Risques principaux

| Risque | Impact | Mesure |
|---|---|---|
| Périmètre trop large | dispersion | phase 1 limitée et priorisée |
| Données non disponibles | tableaux incomplets | ateliers données et référents métiers |
| Sécurité insuffisante | blocage production | audit et pentest |
| Faible adoption | retour au papier | formation et accompagnement |
| Hébergement retardé | décalage calendrier | préproduction temporaire |
| Interopérabilité non validée | attentes irréalistes | conventions et mention “à valider” |

---

## 10. Jalons de décision

| Jalon | Décision attendue |
|---|---|
| J0 | validation principe PNPI |
| J+15 | validation périmètre phase 1 |
| J+30 | choix architecture et hébergement |
| J+45 | validation budget pilote |
| J+60 | lancement pilote |
| J+90 | retour d’expérience et arbitrage production |

---

## 11. Recommandation

La recommandation est de ne pas chercher immédiatement une couverture complète de tous les domaines du Livre Blanc.

Il faut d’abord sécuriser un noyau démontrable et utile :

```text
RIN
  │
  ├── ATI
  ├── Inspections
  ├── ONI
  └── Tableaux de bord Ministre
```

Puis étendre vers :

- investissements ;
- filières ;
- zones ;
- PPP ;
- interopérabilité ;
- durabilité ;
- capital humain.

---

## 12. Conclusion

Le prototype PNPI donne déjà une base crédible.

Le besoin immédiat est un cadrage officiel permettant de transformer cette base en programme structuré, budgété, sécurisé et gouverné.
