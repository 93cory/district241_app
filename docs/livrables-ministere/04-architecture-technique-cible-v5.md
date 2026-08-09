# PNPI — Architecture technique cible V5

Version de travail : V5  
Usage : dossier ministériel, cadrage technique, préparation cahier des charges

---

## 1. Objectif du document

Ce document présente l’architecture technique cible de la Plateforme Nationale de Pilotage Industriel (PNPI).

Il ne remplace pas les spécifications détaillées, mais fournit une vision claire de l’industrialisation attendue :

- composants applicatifs ;
- données ;
- sécurité ;
- hébergement ;
- interopérabilité ;
- supervision ;
- sauvegarde ;
- évolutivité.

---

## 2. Principes d’architecture

La PNPI doit respecter les principes suivants :

1. **souveraineté** : données industrielles hébergées dans un cadre maîtrisé par l’État ;
2. **sécurité dès la conception** : authentification, rôles, audit, chiffrement, sauvegardes ;
3. **interopérabilité** : API et conventions d’échange avec les organismes partenaires ;
4. **modularité** : chaque domaine métier peut évoluer sans bloquer les autres ;
5. **traçabilité** : toute action sensible doit être journalisée ;
6. **progressivité** : passage du prototype à une production par phases ;
7. **résilience** : capacité de restauration et continuité d’activité ;
8. **données gouvernées** : qualité, sources, règles, propriétaires métiers.

---

## 3. Vue d’ensemble cible

```text
Utilisateurs
  │
  ├── Ministre / Cabinet
  ├── Secrétariat Général
  ├── Directions
  ├── Instructeurs
  ├── Inspecteurs
  ├── Opérateurs industriels
  └── Partenaires autorisés
        │
        ▼
Portail web PNPI / accès mobile terrain
        │
        ▼
Couche applicative
        │
        ├── RIN
        ├── ATI
        ├── Inspections
        ├── ONI
        ├── Investissements
        ├── Filières
        ├── Documents
        ├── Sécurité / audit
        └── Tableaux de bord
        │
        ▼
API sécurisées
        │
        ▼
Données, documents, logs, indicateurs
        │
        ▼
Supervision, sauvegardes, cybersécurité
```

---

## 4. Stack technique actuelle du prototype

Le prototype repose déjà sur une architecture moderne :

| Couche | Choix actuel |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Backend | Python 3.12, FastAPI |
| Base de données | PostgreSQL / PostGIS cible, SQLite possible en développement |
| ORM / migrations | SQLAlchemy 2.x, Alembic |
| Cache | Redis |
| Documents | Stockage local / cible MinIO compatible S3 |
| Authentification | JWT, cookies httpOnly, rôles |
| Sécurité | CSRF, rate limiting, headers sécurité, audit |
| Supervision | métriques Prometheus, logs structurés |
| Déploiement | Docker Compose |

---

## 5. Architecture applicative cible

### 5.1 Frontend

Le frontend doit fournir :

- portail institutionnel ;
- espace par rôle ;
- tableau de bord national ;
- guichet opérateur ;
- espace inspecteur ;
- cockpit ministre ;
- pages de reporting ;
- parcours de formation ;
- mode démonstration ;
- compatibilité faible débit.

Règle cible :

> Le navigateur ne doit pas appeler directement le backend interne. Toutes les requêtes passent par une couche proxy sécurisée.

### 5.2 Backend

Le backend doit exposer :

- API métier ;
- gestion des rôles ;
- workflows ;
- audit ;
- documents ;
- exports ;
- notifications ;
- intégrations ;
- moteurs de règles ;
- statistiques.

Règle cible :

> Chaque endpoint sensible doit vérifier le rôle, l’appartenance des données et journaliser les opérations critiques.

### 5.3 Données

La base de données cible doit gérer :

- référentiel opérateurs ;
- unités industrielles ;
- ATI ;
- inspections ;
- constats ;
- actions correctives ;
- déclarations ONI ;
- investissements ;
- zones ;
- documents ;
- utilisateurs ;
- audit ;
- logs d’intégration.

---

## 6. Sécurité cible

La PNPI doit intégrer au minimum :

| Domaine | Exigence |
|---|---|
| Authentification | mot de passe robuste, MFA pour profils sensibles |
| Autorisation | RBAC strict par rôle |
| Sessions | cookies httpOnly, expiration, rotation |
| Données sensibles | chiffrement selon classification |
| Audit | journal des actions sensibles |
| API | rate limiting, validation, sanitation |
| Documents | contrôle type/taille, versioning, preuve de dépôt |
| Administration | séparation des rôles admin/métier |
| Production | secrets hors code, TLS, sauvegardes |
| Tests sécurité | audit interne + pentest externe avant production |

---

## 7. Hébergement cible

Options possibles :

### Option A — Hébergement souverain ANINF

Avantages :

- cohérence avec un système ministériel ;
- souveraineté ;
- proximité institutionnelle ;
- contrôle de l’infrastructure.

Points à vérifier :

- disponibilité serveurs ;
- sauvegardes ;
- supervision ;
- équipe support ;
- certificats ;
- environnement préproduction.

### Option B — Cloud régional temporaire

Usage possible :

- préproduction ;
- démonstration ;
- continuité temporaire en attendant l’infrastructure souveraine.

Condition :

> aucune donnée réelle sensible ne doit être exposée hors cadre validé.

### Option C — Hybride

Approche recommandée pour le cadrage :

- préproduction contrôlée ;
- production souveraine ;
- sauvegardes testées ;
- environnement de secours.

---

## 8. Environnements nécessaires

| Environnement | Usage |
|---|---|
| Développement | travail technique quotidien |
| Test | validation fonctionnelle |
| Préproduction | recette métier et sécurité |
| Production | usage officiel |
| Secours | restauration / continuité |

Chaque environnement doit avoir :

- variables d’environnement propres ;
- secrets séparés ;
- base de données séparée ;
- logs séparés ;
- droits d’accès contrôlés.

---

## 9. Interopérabilité

La PNPI doit pouvoir dialoguer avec :

- AGANOR ;
- OGAPI ;
- administrations fiscales ou statistiques selon validation ;
- systèmes d’identification des entreprises ;
- services de notification ;
- plateformes de cartographie ;
- éventuellement plateformes d’investissement.

Principe :

> La PNPI orchestre les échanges et conserve une trace. Elle ne remplace pas les compétences légales des organismes partenaires.

Mécanismes :

- API REST ;
- webhooks ;
- import/export contrôlé ;
- fichiers signés ;
- journal d’échange ;
- conventions de données ;
- bac à sable partenaire.

---

## 10. Supervision et exploitation

La production doit disposer de :

- logs applicatifs ;
- logs sécurité ;
- métriques API ;
- métriques base de données ;
- alertes disponibilité ;
- alertes sécurité ;
- tableau de bord exploitation ;
- sauvegardes automatisées ;
- procédure de restauration ;
- runbook incident ;
- registre des changements.

---

## 11. Données et gouvernance

Chaque donnée importante doit avoir :

- une source ;
- un propriétaire métier ;
- une date de mise à jour ;
- un niveau de confiance ;
- une règle de correction ;
- une classification ;
- une durée de conservation.

Les tableaux de bord ministériels doivent préciser :

- période ;
- unité ;
- méthode de calcul ;
- source ;
- limite d’interprétation.

---

## 12. Résilience cible

Objectifs indicatifs à arbitrer :

| Indicateur | Cible initiale |
|---|---|
| RPO | 24 h au démarrage, puis 1 h |
| RTO | 24 h au démarrage, puis 4 h |
| Sauvegardes | quotidiennes, puis incrémentales |
| Tests de restauration | mensuels |
| Journalisation | continue |
| Disponibilité cible | 99 % phase pilote, 99,5 % phase production stabilisée |

---

## 13. Architecture de déploiement cible

```text
Internet / Réseau institutionnel
  │
  ▼
Reverse proxy HTTPS
  │
  ▼
Frontend Next.js
  │
  ▼
API FastAPI
  │
  ├── PostgreSQL / PostGIS
  ├── Redis
  ├── MinIO / stockage documents
  ├── Prometheus / métriques
  └── Sauvegardes
```

---

## 14. Passage du prototype à la production

Le passage à la production nécessite :

1. audit du code ;
2. sécurisation des secrets ;
3. validation RBAC ;
4. validation de l’isolation des données ;
5. migration PostgreSQL officielle ;
6. stratégie documents ;
7. supervision ;
8. sauvegardes ;
9. pentest ;
10. recette métier ;
11. formation ;
12. support.

---

## 15. Conclusion

L’architecture actuelle constitue une bonne base de démonstration et de cadrage.

La cible doit maintenant formaliser l’hébergement, la sécurité, la gouvernance des données, l’interopérabilité et l’exploitation afin de transformer le prototype en plateforme institutionnelle durable.

