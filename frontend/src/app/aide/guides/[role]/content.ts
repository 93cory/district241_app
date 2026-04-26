export type Block =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "note"; text: string }
  | { kind: "warn"; text: string };

export interface Section {
  title: string;
  blocks: Block[];
}

export interface Guide {
  title: string;
  roleLabel: string;
  intro: string;
  sections: Section[];
}

export type RoleSlug =
  | "admin"
  | "ministre"
  | "directeur"
  | "instructeur"
  | "inspecteur"
  | "operateur";

const COMMON_SECURITY: Section = {
  title: "Sécurité de votre compte",
  blocks: [
    {
      kind: "p",
      text: "Votre compte donne accès à des données sensibles. Quelques règles simples protègent vous et la plateforme.",
    },
    { kind: "h3", text: "Mot de passe" },
    {
      kind: "ul",
      items: [
        "Au moins 12 caractères, avec majuscules, minuscules, chiffres et caractères spéciaux.",
        "Jamais réutilisé d'un autre service (banque, e-mail personnel, réseaux sociaux).",
        "À renouveler en cas de doute, immédiatement, depuis votre profil.",
      ],
    },
    { kind: "h3", text: "Double authentification (TOTP)" },
    {
      kind: "p",
      text: "Activez le second facteur depuis votre profil. À chaque connexion, l'application demandera un code à 6 chiffres généré par votre application d'authentification (Google Authenticator, Authy, Aegis...).",
    },
    { kind: "h3", text: "Bonnes pratiques" },
    {
      kind: "ul",
      items: [
        "Ne partagez jamais vos identifiants, même avec un collègue.",
        "Verrouillez votre poste dès que vous le quittez.",
        "Signalez toute connexion suspecte dans votre historique des connexions.",
      ],
    },
    {
      kind: "warn",
      text: "En cas de perte d'appareil ou de soupçon de compromission, contactez l'administrateur sans délai pour révoquer votre session.",
    },
  ],
};

const COMMON_SUPPORT: Section = {
  title: "Aide et contact",
  blocks: [
    {
      kind: "p",
      text: "L'assistant intégré (icône en bas à droite de chaque page) répond aux questions les plus fréquentes en s'appuyant sur la documentation officielle.",
    },
    {
      kind: "p",
      text: "Pour un signalement technique, utilisez la page « Aide » ou contactez l'administrateur de la plateforme.",
    },
    {
      kind: "note",
      text: "Tous les écrans disposent d'une icône de tour guidé qui vous explique les fonctionnalités principales en moins de deux minutes.",
    },
  ],
};

export const GUIDES: Record<RoleSlug, Guide> = {
  admin: {
    title: "Guide de l'Administrateur",
    roleLabel: "Administrateur",
    intro:
      "L'administrateur garantit la fiabilité technique et organisationnelle de la PNPI : comptes, sauvegardes, audit, intégrations.",
    sections: [
      {
        title: "Vos responsabilités",
        blocks: [
          {
            kind: "ul",
            items: [
              "Création, suspension et suppression des comptes utilisateurs.",
              "Attribution des rôles via la matrice RACI.",
              "Surveillance du journal d'audit (toute action sensible y est tracée).",
              "Pilotage des sauvegardes automatiques et tests de restauration.",
              "Gestion des intégrations (webhooks, services externes).",
              "Configuration des feature flags et de la rétention des données.",
            ],
          },
        ],
      },
      {
        title: "Gestion des comptes",
        blocks: [
          { kind: "h3", text: "Créer un compte" },
          {
            kind: "p",
            text: "Menu Admin → Utilisateurs → « Nouveau ». Renseignez identifiant, nom complet, rôles. Un mot de passe initial est généré : il devra être changé à la première connexion.",
          },
          { kind: "h3", text: "Suspendre un compte" },
          {
            kind: "p",
            text: "Désactivez l'utilisateur (is_active=false) plutôt que de le supprimer : cela préserve l'historique audit.",
          },
          {
            kind: "warn",
            text: "Une suppression définitive d'utilisateur conserve les actes administratifs qu'il a signés (intégrité juridique).",
          },
        ],
      },
      {
        title: "Sauvegardes et restauration",
        blocks: [
          {
            kind: "p",
            text: "La plateforme dispose d'un script automatisé qui exporte chaque nuit la base PostgreSQL vers S3/MinIO.",
          },
          {
            kind: "ul",
            items: [
              "Vérifier le succès de la sauvegarde nocturne dans GitHub Actions (workflow PNPI Backup).",
              "Tester la restauration sur staging au moins une fois par mois.",
              "Conserver 30 jours d'historique (lifecycle policy S3).",
            ],
          },
          {
            kind: "note",
            text: "Une notification d'échec de sauvegarde déclenche une alerte e-mail et Slack.",
          },
        ],
      },
      {
        title: "Journal d'audit",
        blocks: [
          {
            kind: "p",
            text: "Menu Admin → Audit. Filtres disponibles : utilisateur, type d'événement, plage de dates, ATI ciblé.",
          },
          {
            kind: "p",
            text: "Exportez les événements en CSV pour analyse externe ou conservation longue durée.",
          },
        ],
      },
      COMMON_SECURITY,
      COMMON_SUPPORT,
    ],
  },

  ministre: {
    title: "Guide du Ministre",
    roleLabel: "Ministre",
    intro:
      "Vue stratégique sur l'industrie nationale : décisions ministérielles, synthèses exécutives, tendances et projections.",
    sections: [
      {
        title: "Votre tableau de bord",
        blocks: [
          {
            kind: "p",
            text: "À la connexion, vous accédez directement au tableau de bord ministériel : volumes par secteur et province, dépassements SLA, scoring des opérateurs, projections IA.",
          },
          {
            kind: "ul",
            items: [
              "Briefing audio quotidien : un résumé vocal de 90 secondes des faits saillants de la journée.",
              "Comparatifs entre périodes (semaine, mois, trimestre, année).",
              "Carte interactive du tissu industriel par province et secteur.",
              "Alertes critiques (dossiers urgents, dérives SLA, signalements terrain).",
            ],
          },
        ],
      },
      {
        title: "Décisions ministérielles",
        blocks: [
          {
            kind: "p",
            text: "Les ATI parvenus au stade de validation finale apparaissent dans votre file « En attente de décision ».",
          },
          { kind: "h3", text: "Approuver un ATI" },
          {
            kind: "ul",
            items: [
              "Ouvrir le dossier, consulter l'historique d'instruction.",
              "Signer électroniquement (PNG ou signature qualifiée selon le déploiement).",
              "Saisir le numéro de référence de la décision (registre du Ministère).",
              "Valider : l'ATI passe en statut « Approuvé » et le certificat PDF est généré automatiquement.",
            ],
          },
          { kind: "h3", text: "Rejeter un ATI" },
          {
            kind: "p",
            text: "Le rejet exige une motivation formelle. L'opérateur peut resoumettre après corrections.",
          },
          {
            kind: "warn",
            text: "Toutes vos décisions sont horodatées, signées et archivées. Elles sont opposables et auditables sans limite de temps.",
          },
        ],
      },
      {
        title: "Synthèses et exports",
        blocks: [
          {
            kind: "p",
            text: "Génération à la demande de rapports exécutifs PDF, présentations PowerPoint pour conseil des ministres, exports Excel pour analyses externes.",
          },
          {
            kind: "p",
            text: "Rapports hebdomadaires automatiques envoyés tous les lundis à 06h00 (Cabinet et directeurs).",
          },
        ],
      },
      COMMON_SECURITY,
      COMMON_SUPPORT,
    ],
  },

  directeur: {
    title: "Guide du Directeur",
    roleLabel: "Directeur",
    intro:
      "Le Directeur coordonne l'équipe d'instructeurs, valide en intermédiaire et pilote la performance opérationnelle.",
    sections: [
      {
        title: "Pilotage de l'équipe",
        blocks: [
          {
            kind: "ul",
            items: [
              "Assignation des dossiers ATI aux instructeurs en fonction de la charge et de l'expertise sectorielle.",
              "Suivi des temps de traitement par instructeur, identification des blocages.",
              "Validation intermédiaire avant soumission au Ministre.",
              "Animation des points hebdomadaires (file de travail, dérives SLA, dossiers prioritaires).",
            ],
          },
        ],
      },
      {
        title: "Workflow ATI",
        blocks: [
          {
            kind: "p",
            text: "Vous intervenez à l'étape de validation intermédiaire entre l'instructeur et le Ministre.",
          },
          { kind: "h3", text: "Valider un dossier instruit" },
          {
            kind: "ul",
            items: [
              "Vérifier la complétude des pièces et la cohérence des observations.",
              "Apporter des annotations ou demander un complément d'instruction.",
              "Pousser au Ministre pour décision finale.",
            ],
          },
          { kind: "h3", text: "Renvoyer en instruction" },
          {
            kind: "p",
            text: "En cas de pièce manquante ou d'incohérence, renvoyez le dossier à l'instructeur avec une note explicative. Le délai SLA est mis en pause.",
          },
        ],
      },
      {
        title: "Indicateurs de performance",
        blocks: [
          {
            kind: "ul",
            items: [
              "Délai moyen de traitement par instructeur, par secteur.",
              "Taux d'approbation versus rejet.",
              "Volume de dossiers en cours, en retard SLA, terminés.",
              "Charge prévisionnelle (dossiers attendus par secteur).",
            ],
          },
        ],
      },
      COMMON_SECURITY,
      COMMON_SUPPORT,
    ],
  },

  instructeur: {
    title: "Guide de l'Instructeur",
    roleLabel: "Instructeur",
    intro:
      "Cœur du métier : vous recevez les dossiers, vérifiez les pièces, demandez les compléments et faites avancer les ATI dans le workflow.",
    sections: [
      {
        title: "Votre file de travail",
        blocks: [
          {
            kind: "p",
            text: "Onglet « Mes dossiers » : tous les ATI qui vous sont assignés, triés par échéance SLA.",
          },
          {
            kind: "ul",
            items: [
              "Code couleur SLA : vert (>50% restant), orange (<50%), rouge (dépassé).",
              "Filtre par secteur, statut, priorité.",
              "Recherche plein texte sur le numéro ATI ou la raison sociale de l'opérateur.",
            ],
          },
        ],
      },
      {
        title: "Instruire un dossier",
        blocks: [
          { kind: "h3", text: "1. Réception" },
          {
            kind: "p",
            text: "Ouvrez le dossier, consultez les pièces jointes (statuts, bilan, plan de site, certifications).",
          },
          { kind: "h3", text: "2. Vérification" },
          {
            kind: "ul",
            items: [
              "Cohérence raison sociale / NIF / dirigeants.",
              "Conformité du bilan (signé expert-comptable, exercice clos).",
              "Plan d'implantation et conformité aux normes sectorielles.",
              "Cohérence de l'effectif déclaré.",
            ],
          },
          { kind: "h3", text: "3. Demande de complément" },
          {
            kind: "p",
            text: "Si une pièce manque, utilisez le bouton « Demander un complément » : un message est envoyé à l'opérateur avec votre note. Le SLA est suspendu jusqu'à réception.",
          },
          { kind: "h3", text: "4. Transmission" },
          {
            kind: "p",
            text: "Une fois l'instruction terminée, transmettez au Directeur avec votre avis (favorable / défavorable / réservé) et une note de synthèse.",
          },
        ],
      },
      {
        title: "Outils utiles",
        blocks: [
          {
            kind: "ul",
            items: [
              "Génération automatique de courriers administratifs (accusé de réception, demande de complément, notification de décision).",
              "Templates pré-remplis selon le type de demande.",
              "Comparaison rapide avec les dossiers similaires du même secteur.",
            ],
          },
          {
            kind: "note",
            text: "L'assistant IA peut pré-remplir certains champs à partir des documents joints (OCR à venir).",
          },
        ],
      },
      COMMON_SECURITY,
      COMMON_SUPPORT,
    ],
  },

  inspecteur: {
    title: "Guide de l'Inspecteur",
    roleLabel: "Inspecteur",
    intro:
      "Sur le terrain, vous réalisez les inspections de conformité avec preuves photographiques géolocalisées et rapports détaillés.",
    sections: [
      {
        title: "Préparation de la mission",
        blocks: [
          {
            kind: "ul",
            items: [
              "Consultez la fiche de l'opérateur (historique, ATI en cours, dernières inspections).",
              "Téléchargez la check-list de conformité du secteur concerné.",
              "Préparez l'application en mode hors-ligne si vous vous rendez en zone sans réseau.",
            ],
          },
        ],
      },
      {
        title: "Sur place",
        blocks: [
          { kind: "h3", text: "Saisie de l'inspection" },
          {
            kind: "ul",
            items: [
              "Démarrez une nouvelle inspection depuis l'opérateur ou l'ATI concerné.",
              "Renseignez la date d'inspection, le statut de conformité, vos observations.",
              "Prenez des photos géolocalisées : la position GPS est automatiquement attachée.",
              "Décrivez les éventuelles mesures correctives demandées et le délai accordé.",
            ],
          },
          { kind: "h3", text: "Mode hors-ligne" },
          {
            kind: "p",
            text: "Vous pouvez saisir entièrement votre rapport sans connexion. La synchronisation s'effectue dès que le réseau revient.",
          },
          {
            kind: "warn",
            text: "Sécurisez vos photos avec géolocalisation activée : elles servent de preuves en cas de contestation.",
          },
        ],
      },
      {
        title: "Après la mission",
        blocks: [
          {
            kind: "ul",
            items: [
              "Génération automatique du rapport PDF avec toutes les photos.",
              "Mise à jour conditionnelle de l'ATI (si non-conformité, alerte vers l'instructeur).",
              "Programmation d'une contre-visite si des mesures correctives ont été demandées.",
            ],
          },
        ],
      },
      COMMON_SECURITY,
      COMMON_SUPPORT,
    ],
  },

  operateur: {
    title: "Guide de l'Opérateur",
    roleLabel: "Opérateur (entreprise)",
    intro:
      "Soumettez vos demandes d'agrément, suivez vos dossiers, téléchargez vos certificats — votre guichet personnel ouvert 24/7.",
    sections: [
      {
        title: "Premiers pas",
        blocks: [
          {
            kind: "ul",
            items: [
              "Connectez-vous avec les identifiants fournis par le Ministère lors de votre inscription.",
              "Renseignez le profil de votre entreprise : raison sociale, NIF, secteur, province, ville, contacts.",
              "Activez la double authentification pour sécuriser votre compte.",
            ],
          },
        ],
      },
      {
        title: "Soumettre un Agrément Technique Industriel",
        blocks: [
          { kind: "h3", text: "1. Initier la demande" },
          { kind: "p", text: "Depuis votre guichet, cliquez sur « Nouvelle demande d'ATI »." },
          { kind: "h3", text: "2. Renseigner les informations" },
          {
            kind: "ul",
            items: [
              "Type d'activité industrielle envisagée.",
              "Secteur (agroalimentaire, bois, mines, énergie, BTP...).",
              "Site d'implantation (province, ville, coordonnées GPS si possible).",
              "Effectif prévisionnel.",
              "Investissement projeté.",
            ],
          },
          { kind: "h3", text: "3. Joindre les pièces" },
          {
            kind: "ul",
            items: [
              "Statuts de la société.",
              "Bilan financier signé expert-comptable.",
              "Plan d'implantation du site.",
              "Certifications éventuelles (ISO, normes sectorielles).",
              "Tout document complémentaire pertinent.",
            ],
          },
          { kind: "h3", text: "4. Soumettre" },
          {
            kind: "p",
            text: "Vérifiez la complétude puis cliquez sur « Soumettre ». Vous recevez un accusé de réception immédiat avec un numéro de dossier unique.",
          },
        ],
      },
      {
        title: "Suivi de vos dossiers",
        blocks: [
          {
            kind: "p",
            text: "Le statut de chaque dossier évolue selon le workflow : Soumis → En instruction → Validé en intermédiaire → Décidé (Approuvé ou Rejeté).",
          },
          {
            kind: "ul",
            items: [
              "La timeline du dossier vous montre chaque étape avec date et auteur.",
              "Les notifications vous alertent à chaque changement de statut.",
              "En cas de demande de complément, déposez les pièces directement depuis le dossier.",
            ],
          },
          {
            kind: "note",
            text: "Le délai légal de traitement est de 45 jours. La PNPI vous alerte si une dérive est constatée.",
          },
        ],
      },
      {
        title: "Certificat et renouvellement",
        blocks: [
          {
            kind: "p",
            text: "Une fois l'ATI approuvé, téléchargez le certificat PDF officiel. Il contient un QR code permettant à toute personne (douanes, banques, partenaires) de vérifier son authenticité en ligne.",
          },
          {
            kind: "p",
            text: "L'ATI est valable un nombre d'années défini selon le secteur. Vous recevez des rappels automatiques 90, 60 et 30 jours avant expiration pour engager le renouvellement.",
          },
        ],
      },
      COMMON_SECURITY,
      COMMON_SUPPORT,
    ],
  },
};
