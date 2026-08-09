# PNPI — Annexes domaines métiers V5

Version de travail : V5  
Usage : rattacher le Livre Blanc métier aux livrables exécutifs et au cahier des charges.

---

## 1. Objet

Ce document sert de passerelle entre :

- le Livre Blanc métier complet ;
- la matrice de couverture applicative ;
- le dossier exécutif ;
- la présentation ;
- le cahier des charges ;
- le prototype.

Il permet de suivre les domaines métier déjà consolidés et ceux qui doivent encore être intégrés.

---

## 2. Domaines consolidés dans la matrice applicative actuelle

| # | Code | Domaine | Statut applicatif |
|---:|---|---|---|
| 1 | FAM-RIN-001 | Référentiel Industriel National | fort |
| 2 | FAM-ATI-001 | Autorisations Techniques Industrielles | fort |
| 3 | FAM-INS-001 | Inspection, contrôle et conformité | fort |
| 4 | FAM-INV-001 | Investissements industriels | moyen à fort |
| 5 | FAM-AGN-001 | AGANOR / normalisation | moyen |
| 6 | FAM-OGP-001 | OGAPI / propriété industrielle | moyen |
| 7 | FAM-ZIN-001 | Zones industrielles | moyen à fort |
| 8 | FAM-OBS-001 | Observatoire National de l’Industrie | fort |
| 9 | FAM-GDO-001 | Gouvernance des données | moyen à fort |
| 10 | FAM-DOC-001 | Documents, coffre-fort et preuves | moyen à fort |
| 11 | FAM-SEC-001 | Sécurité, IAM, audit, résilience | fort |
| 12 | FAM-ADM-001 | Administration, exploitation, supervision | moyen à fort |
| 13 | FAM-INT-001 | Interopérabilité nationale | moyen à fort |
| 14 | FAM-ANA-001 | BI, analytique et IA | moyen à fort |
| 15 | FAM-PORT-001 | Portail, UX, omnicanalité | moyen à fort |
| 16 | FAM-GEO-001 | SIG et intelligence territoriale | moyen à fort |
| 17 | FAM-CHA-001 | Filières et chaînes de valeur | fort |
| 18 | FAM-INN-001 | Innovation et Industrie 4.0 | fort |
| 19 | FAM-CAP-001 | Capital humain industriel | moyen à fort |
| 20 | FAM-DUR-001 | Industrie durable, circularité, décarbonation | moyen à fort |

Source applicative :

- `docs/architecture/fam-implementation-matrix.md`

---

## 3. Domaines récents du Livre Blanc à intégrer

L’utilisateur indique que le Livre Blanc est avancé jusqu’au Domaine Métier 25 et que le Domaine Métier 26 portera sur :

- FAM-PPP-001 ;
- gouvernance des partenariats ;
- cartographie des partenaires ;
- architecture des montages de coopération industrielle ;
- responsabilités ;
- financements ;
- mécanismes de suivi.

Les domaines 21 à 25 doivent être intégrés après réception de leur contenu consolidé.

### Emplacements de suivi

| Domaine | Code | Titre | Statut d’intégration |
|---:|---|---|---|
| 21 | à confirmer | à confirmer | à intégrer |
| 22 | à confirmer | à confirmer | à intégrer |
| 23 | à confirmer | à confirmer | à intégrer |
| 24 | à confirmer | à confirmer | à intégrer |
| 25 | à confirmer | à confirmer | à intégrer |
| 26 | FAM-PPP-001 | Partenariats industriels et PPP | à intégrer après rédaction |

---

## 4. Critères d’intégration d’un nouveau domaine

Chaque nouveau domaine métier doit être analysé selon six questions :

1. Quelle est sa valeur ministérielle ?
2. Quel acteur métier en est responsable ?
3. Quelles données sont nécessaires ?
4. Quels écrans ou API seraient utiles ?
5. Quel niveau de priorité pour la démo ?
6. Le domaine doit-il entrer dans le cahier des charges phase 1, 2 ou 3 ?

---

## 5. Modèle de fiche domaine

```text
Code :
Titre :
Objectif :
Acteurs :
Données :
Processus :
Écrans nécessaires :
API nécessaires :
Risques :
Interopérabilité :
Sécurité :
Priorité démo :
Priorité cahier des charges :
Statut prototype :
```

---

## 6. Fiche préliminaire — FAM-PPP-001

### Code

FAM-PPP-001

### Titre

Partenariats industriels, PPP et montages de coopération

### Question métier

Lorsqu’un projet industriel stratégique est identifié, quels acteurs doivent être mobilisés, selon quel montage, avec quelles responsabilités, quels financements et quel mécanisme de suivi ?

### Objectif

Permettre au Ministère de cartographier, structurer, suivre et évaluer les partenariats nécessaires à l’exécution des projets industriels stratégiques.

### Acteurs possibles

- Ministère de l’Industrie ;
- autres ministères concernés ;
- investisseurs ;
- opérateurs industriels ;
- bailleurs ;
- institutions financières ;
- collectivités territoriales ;
- organismes techniques ;
- partenaires internationaux ;
- agences publiques compétentes.

### Capacités fonctionnelles pressenties

- cartographie des partenaires ;
- registre des partenariats ;
- typologie des montages ;
- matrice des responsabilités ;
- suivi des engagements ;
- suivi des financements ;
- suivi des risques ;
- tableau de bord d’exécution ;
- alertes sur retards ou blocages ;
- documentation des décisions.

### Intégration applicative possible

Phase 2 ou 3 :

- cockpit partenariats ;
- registre projets/partenaires ;
- matrice RACI ;
- suivi des engagements ;
- lien avec investissements ;
- lien avec filières ;
- lien avec zones industrielles ;
- lien avec budget et financement.

### Importance ministérielle

Très élevée pour les projets stratégiques, les investisseurs et l’exécution de la politique industrielle.

### Prudence institutionnelle

La PNPI doit suivre et coordonner les partenariats, mais ne doit pas créer artificiellement des pouvoirs d’engagement juridique ou financier sans validation institutionnelle.

---

## 7. Décision de priorisation

Pour la présentation immédiate, FAM-PPP-001 peut être présentée comme :

- extension stratégique ;
- domaine futur ;
- lien entre opportunités, investisseurs, projets et exécution ;
- capacité de pilotage des montages complexes.

Elle ne doit pas encore supplanter les modules prioritaires :

- RIN ;
- ATI ;
- inspection ;
- ONI ;
- tableaux de bord ;
- sécurité.

---

## 8. Mise à jour attendue

Lorsque les domaines 21 à 25 seront fournis :

1. compléter le tableau ;
2. ajouter une fiche par domaine ;
3. mettre à jour la matrice FAM ;
4. décider des impacts sur le dossier exécutif ;
5. décider des impacts sur le cahier des charges ;
6. décider s’il faut prototyper un écran.

