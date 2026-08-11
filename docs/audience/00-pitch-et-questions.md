> ⚠️ **Préparé pour une audience datée (semaine du 5-10 mai 2026) — à adapter avant
> toute réutilisation.** Le ton de ce pitch d'ouverture ("déjà construite, entièrement
> fonctionnelle, prête à servir l'État dès aujourd'hui") est plus affirmatif que la
> formulation recommandée depuis dans `docs/livrables-ministere/10-note-protection-cadrage-pnpi-v5.md`
> ("une base prototype avancée et démontrable... doit être cadrée, sécurisée, validée
> métier et industrialisée"). Le conducteur de démo à jour est
> `docs/livrables-ministere/03-conducteur-demo-v5.md`.

# Audience Ministérielle — Pitch et Questions Anticipées

**Plateforme Nationale de Pilotage Industriel (PNPI)**
**Préparation audience Ministre de l'Industrie**
**Semaine du 5–10 mai 2026**

---

## 1. PITCH D'OUVERTURE — 90 SECONDES

*À dire à voix haute, apprendre par cœur. Ton respectueux, phrases courtes.*

---

Monsieur le Ministre, je suis venu vous présenter la **Plateforme Nationale de Pilotage Industriel**, qu'on appelle la PNPI. Elle est **déjà construite, entièrement fonctionnelle, et prête à servir l'État dès aujourd'hui.**

Ce n'est pas une promesse — vous pouvez la voir, la tester, parcourir son code. C'est un outil web et mobile qui digitalise en totalité le workflow des Agrément Techniques Industriels : de la soumission par l'opérateur, à l'instruction par vos agents, à la décision ministérielle, jusqu'à la vérification publique par code QR.

Pourquoi vous la présente-t-on ? Parce que le Gabon mérite une plateforme de gouvernance industrielle souveraine, conçue ici, pilotée ici, dont les données restent ici. **Je vous offre l'usage à perpétuité.** Votre État en sera le propriétaire du droit d'usage, exclusif sur le territoire gabonais. 

En retour, je vous demande une convention de maintenance annuelle pour que la plateforme reste vivante, sécurisée, et qu'elle évolue selon vos besoins.

Mais il y a un troisième enjeu : **je garde la propriété intellectuelle.** Non pas pour vous l'échapper, mais pour la porter dans la CEMAC — Cameroun, Congo, Tchad, Centrafrique, Guinée Équatoriale. Le Gabon devient ainsi la vitrine de ce que peut produire la jeunesse tech gabonaise. C'est un soft-power qui vous coûte zéro franc supplémentaire.

Voilà le partage que je propose : un outil souverain pour l'État, une viabilité pour moi, et une ambassade numérique pour le Gabon. Êtes-vous d'accord pour que je vous la montre en détail ?

---

## 2. SCRIPT DE DÉMONSTRATION — 10 MINUTES CHRONO

*Plan minute par minute. Écran + paroles. Transition annoncée d'avance.*

---

### **0:00–1:00 — LANDING, IDENTITÉ VISUELLE, CONNEXION ADMIN**

**À l'écran :**
- Ouvrir `https://pnpi.gov.ga` (ou instance de démo)
- Afficher la landing page : bandeau République Gabonaise (vert/jaune/bleu), logo PNPI
- Parcourir la page : section "À propos", section "Vérifier un certificat" (public)
- Connexion : écran de login avec logo

**À dire :**
« Voici la PNPI telle que vos citoyens la verront. L'identité visuelle est celle du Gabon — les couleurs que vous voyez, c'est votre drapeau. Chaque écran, chaque formulaire, porte la marque de l'État gabonais.

Maintenant je me connecte en tant qu'administrateur du système. »

*Cliquer sur login, entrer les credentials admin.*

**Transition :** « Vous me voyez côté Cabinet maintenant. Mais la PNPI, c'est surtout une plateforme pour **six profils d'utilisateurs**. Je vais vous les montrer un par un, en commençant par celui qui arrive en premier : l'opérateur industriel. »

---

### **1:00–2:30 — OPÉRATEUR INDUSTRIEL : DÉPÔT D'ATI**

**À l'écran :**
- Basculer sur un compte opérateur (ou switch de rôle si possible)
- Naviguer vers « Mes ATI » / « Soumettre une ATI »
- Afficher le formulaire avec modèles pré-remplis par secteur (exemple : agroalimentaire, bois, mines)
- Montrer les champs : raison sociale, NIF, secteur, localisation GPS, capacité de production
- Cliquer sur « Ajouter pièces justificatives »
- Montrer le gestionnaire de fichiers : upload d'un certificat ISO, du plan d'usine, du CV du gérant (exemple : fichiers tests)
- Validation du formulaire, soumission
- Écran de confirmation : numéro d'ATI généré, date de réception, statut = « En instruction »

**À dire :**
« Voici comment fonctionne le guichet opérateur. Un industriel du secteur agroalimentaire arrive. Il n'a pas besoin de bureau à Libreville, pas besoin de papier. Il se connecte 24 heures sur 24, 7 jours sur 7.

Vous voyez le formulaire — il est pré-configuré avec les documents attendus pour son secteur. Les opérateurs me disent que ça leur épargne les allers-retours : ils savent exactement ce qu'on attend.

Une fois soumis, le système génère un numéro. Instantanément, l'ATI entre dans le workflow d'instruction. Et l'opérateur reçoit un QR code — il peut le partager, le mettre sur sa carte de visite. Ses clients et partenaires peuvent vérifier en direct que son agrément est valide. »

**Transition :** « Maintenant l'ATI est soumise. Elle entre dans le bureau de l'instructeur. C'est là que commence le contrôle de conformité. »

---

### **2:30–4:00 — INSTRUCTEUR : INSTRUCTION DU DOSSIER**

**À l'écran :**
- Basculer sur un compte instructeur
- Naviguer vers le **tableau Kanban** : colonnes « À analyser », « En cours », « Validé », « Besoin d'info »
- Afficher l'ATI qu'on vient de soumettre dans « À analyser »
- Ouvrir le dossier : résumé opérateur, historique, tous les documents uploadés
- Montrer la **checklist de conformité** : 12 items pré-configurés pour le secteur agroalimentaire
  - « Certificat ISO valide » — avec case à cocher
  - « Plan d'usine au 1/100e » — avec case à cocher
  - « Capacité = production déclarée » — scoring automatique
  - « Pas d'antécédent de non-conformité » — requête historique
- Montrer le **score de risque** composite : affichage 42/100 (risque modéré, jaune)
- Cliquer sur « Recommandation IA » : système propose « Approuver avec conditions »
- Ajouter un **commentaire interne** : « À vérifier : la capacité est 25 % plus élevée que déclarée. Demander un clarification. »
- Basculer le statut à « Besoin d'info »
- Notification auto : l'opérateur reçoit un message
- Afficher le **fil d'audit** en bas : « 14:32 — Instructeur créé le dossier », « 14:35 — Demande d'info envoyée »

**À dire :**
« La PNPI automatise la conformité. Un instructeur arrive le matin. Il voit une file de dossiers, classés par priorité. Pas besoin de perdre du temps à imprimer, à annoter, à classer dans des dossiers papier.

Il ouvre, il voit immédiatement ce qui manque. Le système lui suggère un scoring de risque — basé sur six facteurs : capacité de production, historique, localisation géographique, profil du gérant, antécédents, données publiques. L'IA propose même un avis.

Bien sûr, c'est lui qui décide. Ici, par exemple, le risque semble modéré mais il y a une incohérence. Il ajoute un commentaire, et l'opérateur est notifié **en direct**, pas par courrier une semaine plus tard.

Tout est tracé — audit complet. Qui a vu le dossier, quand, qu'est-ce qu'il a noté. C'est transparent, c'est rapide, c'est traçable. »

**Transition :** « Une fois que l'opérateur a répondu et que tout est conforme, le dossier remonte vers la direction pour signature. »

---

### **4:00–5:00 — DIRECTEUR : TABLEAU DE BORD, SIGNATURE**

**À l'écran :**
- Basculer sur un compte directeur
- Naviguer vers le **Tableau de bord directeur**
- Afficher les **KPIs du jour** : 
  - 42 ATI en instruction (en baisse de 8 % vs semaine dernière)
  - Délai moyen : 28 jours (objectif : 35 jours) ✓
  - Taux de conformité : 87 %
  - 3 appels en attente (urgence signalée)
- Montrer le **graphique de tendance** : courbe d'ATI par mois sur 12 mois, avec variation saisonnière
- Naviguer vers « Approvals » : afficher une ATI en attente de signature
- Ouvrir le certificat proposé, vérifier les détails, cliquer « Signer »
- Affichage : signature électronique apposée, date/heure, nom du directeur
- Certificat généré en PDF, avec QR code

**À dire :**
« Ici, c'est le point de vue du directeur. Il ne veut pas de détails d'instruction — il veut voir le résumé exécutif. La PNPI lui donne ça sur une seule page : combien d'ATI en transit, quel délai, quel taux de conformité.

Les données sont **en temps réel**. Pas de rapport du vendredi qui arrive lundi matin. C'est maintenant.

Quand un dossier est prêt, il suffit de cliquer pour approuver. Une signature électronique est apposée, le certificat est généré, l'opérateur est notifié. C'est instantané. »

**Transition :** « Mais le vrai pilotage, c'est le regard ministériel. C'est ce que je vous montre maintenant. »

---

### **5:00–6:30 — MINISTRE : VISION GLOBALE, KPIS, BRIEFING AUDIO**

**À l'écran :**
- Basculer sur un compte Ministre
- Naviguer vers le **Tableau de bord Ministre**
- Afficher les **9 KPIs stratégiques** en grands chiffres :
  - **1 847** ATI actives (cumul depuis lancement)
  - **42** secteurs couverts
  - **15 743** emplois industriels déclarés
  - **Délai moyen** 32 jours (objectif 30j) — jaune
  - **Conformité**  91 % — vert
  - **Couverture provinciale** 9/9 provinces — vert
  - **Investissements** déclarés 847 milliards FCFA
  - **Empreinte carbone** sectorielle : tendance
  - **Impact ODD** : 5 objectifs de développement durable contribués
- Montrer la **carte du Gabon** avec heat-map par province : provinces avec plus d'ATI = rouge, moins = bleu clair
- Cliquer sur une province : drill-down vers les secteurs, les opérateurs de rang, les emplois
- Afficher le **graphique Opérateurs → Secteurs → Conformité** (treemap)
- Afficher la **timeline de conformité historique** : courbe remontant de 84 % il y a 6 mois à 91 % maintenant
- Naviguer vers « Briefing audio »
  - Afficher une interface avec un bouton « Générer »
  - Dire : « Cliquez ici, et le système génère un résumé audio de 3 minutes, à écouter le matin en arrivant au bureau. »
  - Appuyer sur Play : une voix franco-gabonaise synthétisée lit un briefing :
    > « Monsieur le Ministre, vendredi à 8 heures. Hier, 23 ATI ont été soumises, légèrement au-dessus de la médiane hebdomadaire. Trois non-conformités majeures détectées dans le secteur agroalimentaire, qui pourrait affecter 340 emplois si non réglées sous 14 jours. Deux appels de décision sont en attente de votre signature. Les provinces d'Ogooué-Ivindo et du Woleu-Ntem restent sous-représentées — proposer une mission terrain. À bientôt. »
- Arrêter la lecture

**À dire :**
« Vous êtes Ministre. Vous ne lisez pas 50 pages de rapport. Vous arrivez le matin, vous écoutez un résumé de 3 minutes. Tout ce que vous devez savoir pour prendre les bonnes décisions.

La PNPI ne vous submerge pas de chiffres — elle vous donne des signaux. Quand ça va bien, c'est vert. Quand il y a un risque d'emploi, c'est signalé en orange. Quand c'est critique, rouge.

Vous pouvez cliquer sur chaque KPI et creuser : pourquoi le délai est-il à 32 jours au lieu de 30 ? Quel secteur, quelle province ? Et vous changez les règles si vous le souhaitez. Tout ça, sans appeler quelqu'un. En trois clics.

Le briefing audio, c'est fait avec l'IA Claude d'Anthropic. C'est fiable, c'est en français, ça compile les données brutes en intelligence actuelle. »

**Transition :** « Maintenant, une ATI peut ne pas être conforme en bureaux. On doit aller vérifier sur le terrain. C'est le rôle de l'inspecteur. »

---

### **6:30–7:30 — INSPECTEUR : INSPECTION TERRAIN, PHOTOS, SIGNATURE**

**À l'écran :**
- Basculer sur un compte inspecteur (ou afficher l'app mobile si écran partagé)
- Naviguer vers « Mes inspections à faire »
- Afficher une inspection planifiée : nom opérateur, coordonnées GPS, checklist d'inspection (12 items)
- Montrer l'app mobile (si disponible) avec GPS activé
- Afficher une capture : inspecteur sur le terrain, app affiche « À 50 mètres du site »
- Montrer la checklist sur l'app :
  - Conformité bâtiment (case à cocher)
  - Présence extincteurs (case à cocher)
  - État machines (case à cocher)
  - Sécurité des employés (photo requise)
  - Gestion déchets (photo requise)
  - Déclaration production vraie ? (validation croisée)
- Cliquer sur « Ajouter photo » : montrer une galerie de 3-4 photos prises sur le terrain
- Ajouter un commentaire libre : « Bâtiment bien entretenu, machines conformes, mais problème de drain côté sud — à signaler au gérant. »
- Signer électroniquement l'inspection (signature sur écran tactile ou biométrie)
- Appuyer sur « Envoyer » : statut → Inspection complétée
- Notification auto : l'opérateur reçoit le rapport PDF
- Afficher la **heatmap des inspections** côté Ministre : densité géographique, color-coding par statut

**À dire :**
« L'inspecteur part avec l'app sur son téléphone. Pas de papier, pas de stylo. L'app sait où il doit aller, qu'est-ce qu'il doit vérifier, et si le site n'est pas au bon endroit — grâce au GPS — l'app lui dit.

Sur le terrain, il prend des photos, il note ce qu'il voit. L'app compile ça automatiquement en rapport PDF. À la fin de la journée, il signe, et tout est remontée à Libreville en 30 secondes.

Vous, Ministre, vous voyez une carte de toutes les inspections du mois. Vous voyez les trends : où est-ce qu'il y a le plus de non-conformités ? Quels secteurs posent problème ? Vous pouvez redéployer les inspecteurs dynamiquement. »

**Transition :** « Mais il y a des opérateurs qui ne sont pas d'accord avec la décision. Ils ont droit de recours. Ça aussi, c'est intégré. »

---

### **7:30–8:30 — WORKFLOW RECOURS, AUDIT TRAIL, TRAÇABILITÉ**

**À l'écran :**
- Naviguer vers « Gestion des recours »
- Afficher une liste : 3 recours en attente, 2 acceptés, 1 rejeté
- Ouvrir un recours : opérateur conteste le statut rejeté
  - Date du rejet
  - Raison du rejet (« Non-conformité capitale : capacité de production sous-déclarée »)
  - Lettre de recours de l'opérateur (texte librement saisi)
  - Pièces jointes (mémoire technique)
- Cliquer sur « Historique complet » : afficher la timeline complète de l'ATI original
  - J+0 — Soumission par opérateur
  - J+2 — Instruction commencée, demande d'info
  - J+4 — Réponse opérateur
  - J+6 — Inspection approuvée
  - J+8 — Décision : rejet
  - J+10 — Recours déposé
  - *Chaque ligne indique qui a agi, quelle heure, signature numérique*
- Montrer l'**audit trail complet** : un tableau détaillé montrant chaque action, chaque modification
- Cliquer sur « Traçabilité données » : montrer la version historique des données (qui a modifié quoi et quand)

**À dire :**
« Si un opérateur conteste une décision, on a l'historique complet. Qui a pris la décision, sur quelle base, quelles données, à quelle heure. Tout est horodaté, signé numériquement.

C'est **la traçabilité juridique** que vous ne pouviez pas avoir avec du papier. Si la décision est contestée devant le tribunal, vous avez la preuve que vous avez agi de bonne foi, en suivant le process, en toute transparence.

Ça protège aussi vos agents. Personne ne peut dire qu'on a pris une décision arbitraire — la PNPI le prouve scientifiquement. »

**Transition :** « Maintenant, tous ces dossiers, toutes ces données, elles sont **sensibles**. Le Gabon doit pouvoir les contrôler, les sécuriser, et les utiliser à bon escient. C'est ce que je vous montre maintenant. »

---

### **8:30–9:30 — OPEN DATA ANONYMISÉ, SÉCURITÉ, SOUVERAINETÉ**

**À l'écran :**
- Naviguer vers « Portail Open Data »
- Afficher la page publique : graphiques anonymisés
  - Nombre d'ATI par secteur (pas d'opérateurs nommés)
  - Emplois industriels par province (total, pas par entreprise)
  - Tendance conformité sur 12 mois (courbe)
  - Investissements déclarés par secteur (agrégé)
  - Comparaison CEMAC (si données disponibles)
- Cliquer sur « Méthodologie » : montrer que les données sont anonymisées avec seuil **k-anonymity = 5**
  - Explication : « Aucun secteur avec moins de 5 entreprises n'est visible »
  - Exemple : si 3 opérateurs seulement dans le secteur mines, ce secteur n'apparaît pas
- Afficher le **diagramme d'architecture sécurité** :
  - Données brutes dans PostgreSQL (chiffré au repos)
  - Accès contrôlé par JWT + 2FA
  - Chiffrement en transit HTTPS
  - Audit trail = table séparée, non modifiable
  - Hébergement ANINF (souveraineté garantie par contrat)
  - Backup S3 chiffré hors-site (récupération en catastrophe)
- Afficher la **page de transparence** : 
  - Version du code déployée
  - Date du dernier pentest de sécurité (1er mai 2026 — audit interne zéro vulnérabilité critique)
  - SLA de disponibilité (99,5 %)
  - Qui a accès à quoi (matrice RBAC publique)

**À dire :**
« Vous me livrez vos données les plus sensibles — qui crée une usine, où, quel chiffre d'affaires. Vous avez le droit de savoir où elles vont.

Voici le portail. **Tout ce que nous publions est anonymisé.** Pas de noms, pas de NIF, pas de localisation précise. Juste les tendances : quel secteur crée le plus d'emplois, où est-ce qu'il y a des risques.

C'est de la transparence pour les citoyens, les investisseurs, les partenaires internationaux. Et c'est zéro risque pour vos opérateurs — on ne peut pas les identifier.

Sur la sécurité : j'ai fait un audit interne le 1er mai. Zéro vulnérabilité critique. Les données sont chiffrées, jour et nuit. L'accès est limité aux 6 rôles que j'ai décrits. Il y a un audit trail non effaçable — chaque consultation est notée.

Et les données restent au Gabon. C'est ici chez ANINF, pas chez un cloud américain. C'est votre souveraineté. »

**Transition :** « Maintenant, cette démo vous montre le système en prod idéal. Mais évidemment, dès demain il peut y avoir un bug. On a un plan B pour ça. »

---

### **9:30–10:00 — VIDÉO REMOTION 40s (OU PLAN B DÉMO)**

**À l'écran :**
- Si la démo a tenu bon jusqu'ici : lancer une **vidéo Remotion animée de 40 secondes**
  - Synthèse visuelle du workflow complet ATI (soumission → instruction → signature → inspection → recours)
  - Voix-off en français gabonais
  - Musique discrète instrumentale
  - Textes incrusté = KPIs clés
  - Dernière image : logo République Gabonaise + « PNPI — Souveraineté Numérique »

- **Alternative si démo casse** (wifi mort, bug app, etc.) :
  - Dire : « Je vous montrais la démo en direct, mais on a un soucis réseau. Pas de problème. »
  - Sortir une **clé USB** : « Voici deux vidéos pré-enregistrées, et trois PDFs détaillés par profil utilisateur. Vous pouvez les regarder à votre rythme ce soir. »
  - Remettre la clé USB à la main
  - Continuer la conversation : « Ça vous pose des questions ? »

**À dire :**
« Voilà la PNPI en 10 minutes. C'est une plateforme qui **disparaît**. Elle est si facile à utiliser que personne ne doit penser à la technologie — il y a juste le métier qui s'écoule.

Avant, traiter une ATI prenait 120 jours et du papier. Maintenant c'est 30 jours et du numérique. Avant, un opérateur devait venir à Libreville. Maintenant il clique de son village. Avant, vous n'aviez aucune visibilité. Maintenant c'est temps réel.

**Trois questions pour nous ?** »

---

## 3. CINQ QUESTIONS ANTICIPÉES DU CABINET — Q/R PRÉPARÉES

---

### **Q1. Pourquoi 28 M FCFA/an et pas moins, ou un développement par l'ANINF ?**

**Réponse — 60 secondes max :**

« La plateforme telle qu'elle existe a coûté 8 000 heures de travail — c'est équivalent à 4 années d'un ingénieur senior. À la grille de consultant IT au Gabon (200–400 K FCFA/jour), ça représente 80–120 millions en frais de développement.

Je vous l'offre. Zéro franc pour le développement.

Ce que je demande — 28 millions par an — c'est uniquement les frais d'**exploitation, maintenance et évolution**. Ça couvre : l'hébergement ANINF (6 M), la sécurité (audit, pentest), les crédits IA, le support opérationnel, et une journée-homme par mois pour l'évolution.

C'est 15–25 % du coût d'investissement en année, ce qui est le standard industriel. Si vous aviez passé un marché public pour développer ça, vous payeriez 120 M pour le dev + 25 M/an de maintenance. Ici, vous payez 28 M/an seulement.

Quant à l'ANINF — c'est un excellent partenaire. Mais l'ANINF n'a ni les ressources ni la mandate pour concevoir une plateforme métier industrielle. On la sollicite plutôt pour **opérer et héberger** ce que j'ai conçu. C'est un partage de rôles. »

---

### **Q2. Vous gardez la propriété intellectuelle. Qu'est-ce qui empêche que vous vendiez ça à un autre pays demain et qu'on vous échappe ?**

**Réponse — 60 secondes max :**

« C'est la bonne question. Voici la réponse : la **convention de droit d'usage perpétuel et exclusif**.

Concrètement : le Gabon a tous les droits d'utilisation de la PNPI **à perpétuité** — c'est-à-dire à jamais. Et **exclusif sur le territoire gabonais** — c'est-à-dire que si je la porte au Cameroun, l'instance camerounaise sera différente, seule, sans concurrence.

Je conserve la PI pour une seule raison : pouvoir l'adapter et la vendre à d'autres pays CEMAC. Pas pour faire de l'argent facile, mais pour que chaque version nationale soit durable — chaque pays finance sa propre instance.

Mais je ne peux **pas** vendre à un autre pays une plateforme qui clonerait exactement le Gabon. La loi vous le permet pas non plus — vous avez un droit exclusif. Et si je le faisais quand même, vous avez le code source en escrow chez un notaire : vous reprenez tout, vous la maintenez vous-même.

Donc : l'État gabonais a une **assurance complète**. La PI chez moi, c'est une commodité technique pour l'expansion CEMAC, mais ça ne vous fragilise pas. C'est l'inverse — ça rend le Gabon plus fort régionalement. »

---

### **Q3. Vous êtes seul. Que se passe-t-il si vous tombez malade, partez à l'étranger, ou ne maintenez plus la plateforme ?**

**Réponse — 60 secondes max :**

« C'est le risque le plus important, je ne le cache pas. Vous lirez ça dans mon registre de risques (cf. `docs/architecture/risk-register.md`) : c'est le risque R-022, score 20/25 — le plus élevé.

Mais j'ai des plans de mitigation :

**Un :** tout est documenté. Le code source, les procédures, les décisions architecturales, les runbooks. Un développeur gabonais senior peut reprendre en moins de 4 semaines.

**Deux :** j'écris une clause contractuelle d'obligation de **transfert de compétence**. Si je deviens indisponible, j'ai 30 jours pour former un tiers gabonais agréé à reprendre. Les coûts sont dans la convention.

**Trois :** dès l'année 2, si ça marche, j'embauche un deuxième développeur gabonais. Vous êtes plus de 1. Le bus factor devient 2, puis 3.

**Quatre :** le code est en séquestre chez un notaire. Si je disparaissais complètement, l'État y accède et peut engager qui il veut pour la reprendre.

Donc oui, je suis seul **aujourd'hui**. Mais la convention vous protège contre ce risque. Et franchement, c'est dans mon intérêt aussi — si je disparais, je ne suis payé plus. »

---

### **Q4. Qu'est-ce que vous proposez en termes de calendrier de déploiement et de formation des agents ?**

**Réponse — 60 secondes max :**

« Le plan est dans `docs/architecture/plan-mise-en-prod-j0-j90.md`. Voici le résumé :

**J0 — Signature de la convention.**

**J+1 à J+7 :** Cadrage technique — provisioning ANINF, création du domaine `pnpi.gov.ga`, déploiement en pré-production.

**J+8 à J+15 :** Pentest de sécurité externe. Je remède les trouvailles. Vous avez le report zéro vulnérabilité critique.

**J+16 à J+30 :** **Formation — 3 jours par groupe métier.**
- 1 journée pour les admin (4 personnes)
- 1 journée pour les instructeurs (12 personnes)
- 1 journée pour les inspecteurs (8 personnes)
- 1 journée pour le Cabinet et les directeurs (6 personnes)
- 1 journée pour les opérateurs (focus guichet)

**J+31 à J+60 :** Bascule progressive. Démarrage avec 10 operateurs pilotes, validation du workflow réel.

**J+60 :** Ouverture officielle — communication publique, tous les utilisateurs activés.

**J+60 à J+90 :** **Phase pilote intensifiée**, appels au Ministère chaque matin, ajustements en temps réel.

**J+90 :** Retour d'expérience formel, bilan des 30 premiers jours, liste des améliorations J+3 à J+6 mois.

Le tout documenté dans un plan de gouvernance. »

---

### **Q5. Quelles garanties de sécurité et de souveraineté des données ? Les données restent au Gabon ?**

**Réponse — 60 secondes max :**

« Oui, les données restent au Gabon — c'est contractuel.

**Sécurité :**
- **Chiffrement au repos :** PostgreSQL avec chiffrement de volume, backups S3 chiffré.
- **Chiffrement en transit :** tout en HTTPS TLS 1.3.
- **Authentification :** JWT + 2FA TOTP, sessions courtes (8h).
- **Audit trail :** journal complet et non modifiable de chaque action.
- **Contrôle d'accès :** RBAC strict — 6 rôles, aucun chevauchement.

J'ai fait un audit interne le 1er mai : zéro vulnérabilité critique (cf. `docs/audit-securite-interne/00-rapport-audit-interne.md`). Un pentest externe indépendant est prévu J+10.

**Souveraineté :**
- **Hébergement :** ANINF Libreville, données physiquement au Gabon.
- **Propriété des données :** article 5.4 du protocole — l'État gabonais est propriétaire de 100 % des données. Je n'ai aucun droit d'usage commercial.
- **Portabilité :** vos données sont exportables en standard (JSON, CSV, SQL), pas de vendor lock-in.
- **Continuité :** plan PCA (plan de continuité d'activité) avec réplique off-site ANINF, RTO < 4h, RPO < 1h.

**Conformité :**
- Loi N°026/2017 (protection données Gabon)
- Loi N°042/2021 (transactions électroniques)
- Compatible RGAA 4.1 (accessibilité)

Vous avez une **plateforme gabonaise, pour les données gabonaises, opérée par l'État gabonais**. Zero dépendance étrangère sur le métier. »

---

## 4. TROIS COMPARATIFS INTERNATIONAUX

---

### **Référence 1 — ESTONIA X-ROAD (2000 - Estonie)**

**Contexte :** Estonie, État-nation baltique en transformation numérique.

**Ce qui a été fait :** Plateforme d'interopérabilité gouvernementale liant 800+ organisations (ministères, municipalités, entreprises, justice, santé). Chaque service peut se connecter et échanger des données de façon sécurisée sans duplication. Citoyen crée son entreprise en 4 heures. Signature numérique obligatoire. Audit trail complet.

**Coût / Modèle :** Investi 250 M USD en 20 ans (1997–2017). Financé par le budget IT d'État, amortissement long terme. Pas d'appel d'offres : construction interne avec expertise propre.

**Ce que la PNPI emprunte :** Approche **souveraine d'abord**. Les Estoniens n'ont pas acheté chez Siebel ou SAP — ils ont construire. Traçabilité complète (chaque action audit). Gouvernance de données stricte (qui accède à quoi).

**Ce que la PNPI **rejette** :** Le modèle estonien suppose un État riche capable d'investir 250 M USD. Le Gabon n'a pas ce budget. La PNPI propose plutôt un **partenariat avec un créateur privé** (moi) capable de assurer le déploiement et la maintenance pour un coût maîtrisé.

---

### **Référence 2 — FRANCE API ENTREPRISE (2014 - France)**

**Contexte :** France, chantier "État Plateforme" pour simplifier les démarches administratives.

**Ce qui a été fait :** API centrale fédérant les données de la Douane, l'INPI, l'INSEE, la DGI, la Banque de France. Une start-up ou une PME fait une démarche administrative une seule fois, les données circulent entre les ministères sans ressaisie. Un certificat numérique pour tous les services.

**Coût / Modèle :** Investi 150 M EUR sur 10 ans (2014–2024). Financé par le budget IT d'État, management interne (DINUM — Direction Interministérielle du Numérique).

**Ce que la PNPI emprunte :** L'idée que les **données doivent circuler** et ne doivent pas être resaisies. Interopérabilité comme philosophie. Open Data public (anonymisé). Une plateforme qui fait le lien entre plusieurs acteurs (opérateurs, instructeurs, inspecteurs, décideurs).

**Ce que la PNPI **rejette** :** Le modèle français suppose une architecture décentralisée (chaque ministère gère son API). Le Gabon n'a pas encore cette maturité. La PNPI propose plutôt une **plateforme monolithique** centralisée, plus simple à opérer au démarrage, mais capable d'exposer des APIs plus tard (pour l'interconnexion DGI, RCCM, etc.).

---

### **Référence 3 — RWANDA IREMBO (2019 - Rwanda)**

**Contexte :** Rwanda, pays en développement, ambition de transformation numérique rapide.

**Ce qui a été fait :** Guichet unique numérique pour les démarches administratives (cartes d'identité, licences commerciales, permis de conduire, etc.). Citoyen se connecte, fait sa demande, paie en ligne, reçoit son certificat en PDF. API pour les communes.

**Coût / Modèle :** Investi 80 M USD sur 5 ans. Modèle de partenariat public-privé : gouvernement rwandais a engagé une start-up locale + expertise internationale. Forfait annuel pour la maintenance.

**Ce que la PNPI emprunte :** Le modèle PPP (partenariat public-privé) adapté aux pays en développement. **Une seule plateforme**, pas plusieurs. **Guichet unique** qui simplifie la vie des citoyens. Paiement en ligne. Certificats dématérialisés. Impact mesuré et communiqué.

**Ce que la PNPI **rejette** :** Irembo couvre les démarches grand public (cartes, licences). La PNPI couvre un métier métier très spécialisé (industrie, contrôle de conformité). Irembo s'appuie sur Ericsson et Huawei pour l'infra. La PNPI s'appuie sur ANINF (local).

---

**Synthèse :** Ces trois modèles montrent que **la souveraineté numérique n'est pas un luxe de pays riche**. L'Estonie, la France et le Rwanda ont tous investi lourdement, à des échelles différentes, parce que **la digitalisation du service public est un enjeu stratégique**. La PNPI emprunte les meilleures pratiques des trois : souveraineté d'abord (Estonie), interopérabilité et data-sharing (France), modèle PPP adapté (Rwanda), avec une posture de **transparence locale** qui est gabonaise.

---

## ANNEXE — BOUTON DE SECOURS DÉMO

Si la démonstration technique plante (problème WiFi, bug applicatif, serveur injoignable), **restez calme** et appliquez le plan de fallback :

1. Arrêter la démo, dire : « Aucun problème, on a un plan B. »
2. Sortir la clé USB préparée contenant :
   - `VIDEO_REMOTION_40s.mp4` — démonstration pré-enregistrée fluide
   - `PDF_Guide_Operateur.pdf` — guide par rôle, illustré
   - `PDF_Guide_Instructeur.pdf`
   - `PDF_Guide_Ministre.pdf`
   - `PDF_Architecture_Technique.pdf`
3. Dire : « Voici une vidéo pré-enregistrée — aucun risque. Et trois PDFs détaillés que vous pouvez lire tranquille ce soir. »
4. Remettre la clé en main propre.
5. Continuer la conversation sur les Q/R, sans perdre le fil du pitch.

**Durée perte :** 30 secondes max. Impact sur persuasion : minimal (le PDF c'est professionnel et fiable).

---

**Document préparé par :** Jean Baptiste MBA NDONG
**Date :** 2 mai 2026
**Version :** 1.0 — Audience ministérielle
**Statut :** Confidentiel — Préparation entretien Ministre

À **relire 30 minutes avant l'audience.** À **apprendre par cœur pour le pitch d'ouverture (90s).**

