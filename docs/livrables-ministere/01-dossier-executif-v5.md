# PNPI — Dossier exécutif de présentation

Version de travail : V5  
Destinataires : Ministre, Secrétariat Général, Directions concernées  
Objet : présentation de la Plateforme Nationale de Pilotage Industriel

---

## 1. Résumé exécutif

La Plateforme Nationale de Pilotage Industriel (PNPI) vise à doter le Ministère de l’Industrie d’un système intégré de connaissance, de gestion, de coordination et d’aide à la décision sur l’appareil industriel national.

Le message central est simple : le PNPI ne doit pas être présenté comme une application isolée, mais comme l’infrastructure numérique de pilotage industriel du pays. Il permet au Ministère de passer d’une logique de dossiers dispersés à une capacité nationale de suivi, d’arbitrage et d’anticipation.

Elle permet de relier :

```text
Unités industrielles
  │
  ▼
Autorisations
  │
  ▼
Contrôles
  │
  ▼
Production et statistiques
  │
  ▼
Investissements
  │
  ▼
Filières et chaînes de valeur
  │
  ▼
Décision ministérielle
```

La PNPI ne se substitue pas aux administrations ou organismes partenaires. Elle consolide, orchestre, trace et rend exploitables les informations nécessaires au pilotage industriel national.

La décision proposée à ce stade n’est pas de généraliser immédiatement la plateforme. Elle consiste à autoriser un cadrage officiel, limité et maîtrisé, afin de valider le périmètre prioritaire, les données, la sécurité, l’architecture cible, le budget et le plan pilote.

---

## 2. Problème à résoudre

Le pilotage industriel national souffre généralement de plusieurs limites :

- dispersion des données entre services ;
- absence d’un référentiel unique des unités industrielles ;
- difficulté à suivre les autorisations, inspections et obligations ;
- faible visibilité sur les investissements et projets industriels ;
- manque de tableaux de bord fiables pour la décision ;
- dépendance à des procédures manuelles ;
- faible traçabilité des décisions administratives ;
- difficulté à produire rapidement des statistiques consolidées.

La PNPI répond à ces limites par une plateforme unique, progressive et gouvernée.

---

## 3. Vision cible

La PNPI doit devenir le socle numérique du pilotage industriel gabonais.

Elle doit permettre de répondre rapidement à des questions stratégiques :

- quelles unités industrielles existent ?
- où sont-elles localisées ?
- quelles autorisations possèdent-elles ?
- quelles inspections ont été réalisées ?
- quelles non-conformités doivent être suivies ?
- quels investissements sont en cours ?
- quelles filières sont stratégiques ?
- où sont les opportunités de transformation locale ?
- quels partenaires doivent être mobilisés ?
- quels indicateurs doivent guider la décision ?

---

## 4. Périmètre fonctionnel consolidé

Le prototype et le Livre Blanc couvrent déjà plusieurs familles fonctionnelles :

| Domaine | Apport pour le Ministère |
|---|---|
| Référentiel Industriel National | Connaissance structurée des opérateurs et unités industrielles |
| ATI | Dématérialisation du cycle des autorisations |
| Inspection / conformité | Contrôle terrain, constats, sanctions, actions correctives |
| ONI | Statistiques industrielles et observation économique |
| Investissements | Suivi des projets, montants, emplois, secteurs et territoires |
| Zones industrielles | Suivi des sites, occupation, infrastructures et capacités |
| Filières | Lecture des chaînes de valeur et souveraineté productive |
| Innovation | Industrie 4.0, R&D, propriété industrielle, technologies |
| Capital humain | Compétences, formation, emplois et métiers en tension |
| Durabilité | Énergie, carbone, circularité et résilience |
| Sécurité | IAM, audit, traçabilité, cybersécurité |
| Interopérabilité | Échanges contrôlés avec les organismes partenaires |

Les domaines plus récents du Livre Blanc, notamment les partenariats industriels et PPP, seront intégrés comme extension stratégique de la plateforme.

---

## 5. État du prototype

Le prototype actuel démontre déjà :

- un tableau de bord national ;
- un annuaire d’opérateurs industriels ;
- des fiches RIN 360° ;
- un workflow ATI complet ;
- un centre de traitement ATI ;
- une carte de contrôle ATI ;
- des inspections de conformité ;
- un centre national de contrôle inspection ;
- un cockpit ONI ;
- des modules filières, innovation, capital humain, durabilité ;
- un cockpit sécurité et audit ;
- une navigation par rôle ;
- un parcours de démonstration ministre.

Page de démonstration :

- `/pnpi/presentation`

---

## 6. Valeur institutionnelle

La PNPI apporte au Ministère :

1. une meilleure connaissance du tissu industriel ;
2. une réduction de la fragmentation administrative ;
3. une amélioration de la traçabilité ;
4. un suivi plus fiable des autorisations ;
5. une capacité d’inspection et de contrôle structurée ;
6. une production plus rapide d’indicateurs ;
7. une meilleure préparation des politiques industrielles ;
8. une capacité de dialogue renforcée avec les partenaires ;
9. une base pour attirer, suivre et sécuriser les investissements ;
10. un outil moderne de gouvernance industrielle.

Pour le Ministre et le Secrétariat Général, la valeur principale est la capacité de disposer rapidement d’une lecture consolidée :

- des opérateurs industriels actifs ;
- des autorisations en cours ou arrivées à échéance ;
- des inspections réalisées et des non-conformités ;
- des secteurs et territoires à suivre en priorité ;
- des projets industriels stratégiques ;
- des alertes nécessitant un arbitrage.

---

## 7. Gouvernance institutionnelle proposée

La PNPI doit être portée par une gouvernance progressive :

- un sponsor politique ;
- un comité de pilotage ;
- un comité métier ;
- une équipe projet ;
- des référents dans les directions ;
- une cellule données ;
- une cellule cybersécurité ;
- des correspondants partenaires.

AGANOR et OGAPI doivent rester autorités de référence dans leurs domaines respectifs. La PNPI peut intégrer ou afficher des informations issues de ces organismes selon des conventions validées, sans se substituer à leurs compétences.

---

## 8. Architecture cible simplifiée

```text
Utilisateurs
  │
  ├── Ministère
  ├── Directions
  ├── Inspecteurs
  ├── Opérateurs
  └── Partenaires autorisés
        │
        ▼
Portail PNPI
        │
        ▼
Services métiers
        │
        ├── RIN
        ├── ATI
        ├── Inspections
        ├── ONI
        ├── Investissements
        ├── Filières
        ├── Sécurité
        └── Interopérabilité
        │
        ▼
Données, audit, documents, tableaux de bord
```

---

## 9. Feuille de route proposée

### Phase 1 — Cadrage et stabilisation

- validation du périmètre prioritaire ;
- audit du prototype ;
- sécurisation des rôles ;
- documentation des parcours ;
- cadrage des données de référence.

### Phase 2 — Industrialisation du socle

- architecture cible ;
- base de données officielle ;
- sécurité ;
- audit ;
- sauvegarde ;
- hébergement ;
- environnement de test et production.

### Phase 3 — Déploiement métier

- RIN ;
- ATI ;
- inspections ;
- ONI ;
- tableaux de bord ;
- formation utilisateurs.

### Phase 4 — Extension stratégique

- investissements ;
- filières ;
- zones industrielles ;
- PPP ;
- interopérabilité ;
- BI / IA contrôlée.

---

## 10. Besoins à arbitrer

Les arbitrages attendus portent sur :

- le portage institutionnel ;
- le périmètre de la phase 1 ;
- l’hébergement ;
- la cybersécurité ;
- les partenaires à associer ;
- les ressources humaines ;
- le calendrier ;
- le budget ;
- la méthode de contractualisation.

---

## 11. Décision attendue

La décision recherchée est l’autorisation de lancer une phase de cadrage officiel permettant de :

1. valider le périmètre fonctionnel prioritaire ;
2. organiser des ateliers métiers ;
3. établir l’architecture technique cible ;
4. préparer le budget ;
5. formaliser le cahier des charges ;
6. définir le plan de déploiement.

Cette décision peut être formulée en trois actes simples :

| Acte | Décision proposée | Résultat attendu |
|---|---|---|
| 1 | Valider le principe d’une PNPI comme socle numérique du pilotage industriel | Mandat institutionnel clair |
| 2 | Désigner un comité de pilotage et des référents métiers | Gouvernance de cadrage opérationnelle |
| 3 | Autoriser une phase de cadrage de 45 à 60 jours | Périmètre prioritaire, budget, cahier des charges et plan pilote |

La phase de cadrage doit rester volontairement courte. Elle doit produire des éléments de décision, et non ouvrir un chantier indéfini.

---

## 12. Conclusion

La PNPI constitue une opportunité de moderniser profondément la gouvernance industrielle nationale.

Elle donne au Ministère une capacité nouvelle : voir, comprendre, suivre, contrôler, décider et anticiper à partir d’un socle numérique commun.
