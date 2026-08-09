# PNPI — Infrastructure, cybersécurité et déploiement V5

Version de travail : V5  
Usage : cadrage de production, dossier de décision, préparation cahier des charges  
Statut : document indicatif à valider avec le Ministère, l’ANINF et les responsables sécurité.

---

## 1. Objectif

Ce document précise les exigences minimales pour héberger, sécuriser, déployer et exploiter la PNPI dans un cadre institutionnel.

Il couvre :

- infrastructure ;
- hébergement ;
- cybersécurité ;
- sauvegardes ;
- supervision ;
- PRA/PCA ;
- déploiement ;
- exploitation ;
- prérequis avant mise en production.

---

## 2. Position de principe

La PNPI manipule des données sensibles relatives :

- aux entreprises industrielles ;
- aux autorisations administratives ;
- aux inspections ;
- aux documents ;
- aux décisions ;
- aux statistiques industrielles ;
- aux investissements ;
- aux échanges interinstitutionnels.

Le principe recommandé est donc :

> hébergement souverain, accès contrôlés, audit complet, chiffrement, sauvegardes, supervision et pentest avant toute production officielle.

---

## 3. Hébergement recommandé

### 3.1 Option cible : hébergement souverain

L’hébergement cible recommandé est un hébergement en territoire gabonais, idéalement dans un cadre validé avec l’ANINF ou une infrastructure publique compétente.

Avantages :

- souveraineté des données ;
- cohérence avec un système ministériel ;
- meilleure maîtrise institutionnelle ;
- conformité plus lisible ;
- argument fort devant les partenaires.

### 3.2 Préproduction temporaire

Une préproduction temporaire peut être utilisée pour :

- démonstrations ;
- tests ;
- formation ;
- recette métier ;
- audit sécurité.

Condition :

> les données utilisées en préproduction doivent être anonymisées, fictives ou officiellement autorisées.

---

## 4. Environnements nécessaires

| Environnement | Usage | Accès |
|---|---|---|
| Développement | développement quotidien | équipe technique |
| Test | tests automatisés et fonctionnels | équipe technique |
| Préproduction | recette métier, formation, pentest | équipe projet + référents |
| Production | usage officiel | utilisateurs habilités |
| Secours | restauration et continuité | équipe exploitation |

Règles :

- bases séparées ;
- secrets séparés ;
- accès séparés ;
- logs séparés ;
- aucune donnée de production copiée en test sans autorisation.

---

## 5. Architecture d’infrastructure cible

```text
Utilisateurs
  │
  ▼
HTTPS / Reverse proxy
  │
  ▼
Frontend PNPI
  │
  ▼
Backend API
  │
  ├── Base PostgreSQL/PostGIS
  ├── Redis
  ├── Stockage documents
  ├── Logs / audit
  ├── Supervision
  └── Sauvegardes
```

---

## 6. Dimensionnement indicatif

### 6.1 Pilote

| Composant | Dimension indicative |
|---|---|
| Serveur applicatif | 4 vCPU, 8 à 16 Go RAM |
| Base de données | PostgreSQL, 100 à 200 Go |
| Stockage documents | 100 à 500 Go |
| Sauvegardes | rétention 30 jours |
| Utilisateurs | 50 à 200 |

### 6.2 Production initiale

| Composant | Dimension indicative |
|---|---|
| Frontend | 1 instance dédiée |
| Backend | 1 à 2 instances |
| Base de données | PostgreSQL/PostGIS, disque SSD |
| Cache | Redis |
| Documents | stockage objet ou volume sécurisé |
| Supervision | Prometheus/Grafana ou équivalent |
| Sauvegardes | quotidiennes + tests restauration |
| Utilisateurs | 200 à 2 000 selon phase |

### 6.3 Production renforcée

- réplication base ;
- bascule automatique ou semi-automatique ;
- stockage objet redondé ;
- journalisation centralisée ;
- surveillance sécurité ;
- environnement de secours ;
- tests de charge réguliers.

---

## 7. Cybersécurité

### 7.1 Mesures minimales

| Domaine | Exigence |
|---|---|
| Authentification | mots de passe robustes, expiration configurable, MFA profils sensibles |
| Autorisation | RBAC strict par rôle |
| Sessions | cookies httpOnly, durée de session, révocation |
| Transport | HTTPS obligatoire |
| API | rate limiting, validation, sanitation |
| Fichiers | contrôle extension, taille, type MIME, versioning |
| Données sensibles | chiffrement selon classification |
| Logs | audit des actions sensibles |
| Administration | accès restreint, journalisé |
| Production | secrets hors code |
| Dépendances | audit régulier |

### 7.2 Profils sensibles

MFA recommandé pour :

- administrateurs ;
- ministre / cabinet ;
- directeur ;
- comptes techniques ;
- comptes avec droit de signature ou décision.

### 7.3 Audit

À prévoir :

- audit interne automatisé ;
- revue manuelle du code sensible ;
- pentest externe avant production ;
- re-test après correction ;
- registre des risques ;
- plan de remédiation.

---

## 8. Classification des données

| Niveau | Exemple | Exigence |
|---|---|---|
| Public | statistiques agrégées validées | publication contrôlée |
| Interne | tableaux de bord Ministère | accès authentifié |
| Sensible | dossiers ATI, inspections, documents | RBAC + audit |
| Très sensible | secrets, mots de passe, clés, décisions critiques | chiffrement + accès restreint |

---

## 9. Sauvegardes

Exigences minimales :

- sauvegarde base quotidienne ;
- sauvegarde documents ;
- rétention définie ;
- chiffrement des sauvegardes ;
- stockage séparé ;
- test de restauration mensuel ;
- journal des restaurations.

Objectifs indicatifs :

| Indicateur | Pilote | Production |
|---|---:|---:|
| RPO | 24 h | 1 h à 4 h |
| RTO | 24 h | 4 h à 8 h |
| Test restauration | mensuel | mensuel |
| Rétention | 30 jours | 30 à 90 jours selon politique |

---

## 10. PRA / PCA

Le Plan de Reprise d’Activité doit préciser :

- incidents couverts ;
- personnes responsables ;
- ordre de restauration ;
- sauvegardes à utiliser ;
- procédures de bascule ;
- tests périodiques ;
- communication de crise ;
- critères de retour à la normale.

Scénarios à tester :

1. panne serveur applicatif ;
2. panne base de données ;
3. corruption de données ;
4. suppression accidentelle ;
5. indisponibilité réseau ;
6. compromission d’un compte ;
7. incident sur stockage documents.

---

## 11. Supervision

La production doit suivre :

- disponibilité frontend ;
- disponibilité backend ;
- santé base de données ;
- files d’erreurs ;
- temps de réponse ;
- erreurs 5xx ;
- connexions échouées ;
- actions sensibles ;
- espace disque ;
- sauvegardes réussies ou échouées ;
- expiration certificats ;
- charge système.

Tableaux de bord recommandés :

- supervision technique ;
- sécurité ;
- usage métier ;
- qualité données ;
- SLA dossiers ;
- disponibilité.

---

## 12. Déploiement

### 12.1 Déploiement manuel contrôlé

Adapté à la phase pilote :

```text
Validation code
  │
  ▼
Build
  │
  ▼
Tests
  │
  ▼
Sauvegarde
  │
  ▼
Déploiement préproduction
  │
  ▼
Recette
  │
  ▼
Déploiement production
```

### 12.2 Déploiement continu encadré

Possible après stabilisation :

- branches protégées ;
- revue obligatoire ;
- tests automatiques ;
- scan dépendances ;
- build Docker ;
- déploiement préproduction ;
- approbation manuelle production ;
- rollback documenté.

---

## 13. Préproduction

Avant production, la préproduction doit valider :

- login ;
- rôles ;
- RIN ;
- ATI ;
- documents ;
- inspections ;
- ONI ;
- tableaux de bord ;
- exports ;
- audit ;
- sauvegarde/restauration ;
- performance ;
- sécurité.

---

## 14. Critères avant mise en production

La production ne doit pas être ouverte tant que les points suivants ne sont pas validés :

| Critère | Statut attendu |
|---|---|
| Hébergement validé | oui |
| Secrets de production séparés | oui |
| HTTPS actif | oui |
| Base PostgreSQL prête | oui |
| Sauvegarde testée | oui |
| RBAC vérifié | oui |
| Isolation opérateurs vérifiée | oui |
| Audit sécurité réalisé | oui |
| Pentest externe réalisé | recommandé |
| Données initiales validées | oui |
| Support identifié | oui |
| Formation réalisée | oui |

---

## 15. Exploitation

L’exploitation doit prévoir :

- support utilisateurs ;
- suivi incidents ;
- suivi changements ;
- sauvegardes ;
- mises à jour ;
- gestion comptes ;
- surveillance sécurité ;
- rapports mensuels ;
- comité de suivi.

---

## 16. Conclusion

La PNPI peut être industrialisée progressivement, mais elle ne doit pas être traitée comme une simple application web.

Elle doit être considérée comme une plateforme publique sensible, nécessitant :

- hébergement maîtrisé ;
- sécurité ;
- supervision ;
- gouvernance ;
- procédures ;
- formation ;
- exploitation durable.

