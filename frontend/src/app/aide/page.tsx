export default function AidePage() {
  const sections = [
    {
      title: "Premiers pas",
      items: [
        {
          q: "Comment me connecter ?",
          a: "Rendez-vous sur la page de connexion (/connexion). Entrez votre identifiant et mot de passe fournis par l'administrateur. Si la 2FA est activee, saisissez le code TOTP.",
        },
        {
          q: "Comment activer la biometrie ?",
          a: "Depuis votre profil (Mon profil), activez l'option 'Connexion biometrique'. Cela fonctionne sur les appareils mobiles compatibles.",
        },
        {
          q: "Comment changer mon mot de passe ?",
          a: "Rendez-vous sur votre profil et utilisez le formulaire 'Changer le mot de passe'. Le mot de passe doit contenir 12 caracteres minimum avec majuscules, minuscules, chiffres et caracteres speciaux.",
        },
      ],
    },
    {
      title: "Agrements Techniques Industriels (ATI)",
      items: [
        {
          q: "Comment soumettre une demande ATI ?",
          a: "Depuis le Guichet (Mon espace), cliquez sur 'Nouvelle demande'. Remplissez le formulaire avec le secteur, l'activite, et les observations. Joignez les documents requis.",
        },
        {
          q: "Quels sont les statuts possibles ?",
          a: "Soumis → En instruction → Valide (par directeur) → Approuve ou Rejete. Chaque etape est tracee dans la timeline du dossier.",
        },
        {
          q: "Comment resoumettre apres un rejet ?",
          a: "Ouvrez le detail de l'ATI rejete et cliquez sur 'Resoumettre'. Corrigez les observations et joignez les documents complementaires.",
        },
        {
          q: "Qu'est-ce que le SLA ?",
          a: "Le SLA (Service Level Agreement) est le delai maximum de traitement. Par defaut 45 jours. Un depassement declenche une escalade automatique vers la hierarchie.",
        },
        {
          q: "Comment telecharger le certificat ?",
          a: "Pour un ATI approuve, cliquez sur 'Telecharger le certificat PDF' dans la page detail. Le certificat contient un QR code de verification.",
        },
      ],
    },
    {
      title: "Inspections",
      items: [
        {
          q: "Comment creer une inspection ?",
          a: "Les inspecteurs peuvent creer une inspection depuis l'application mobile ou le web en selectionnant l'operateur et en remplissant le formulaire de conformite.",
        },
        {
          q: "Comment ajouter des photos ?",
          a: "Lors de la creation ou modification d'une inspection, utilisez la galerie photo pour ajouter des preuves visuelles du terrain.",
        },
        {
          q: "Comment generer le rapport PDF ?",
          a: "Depuis le detail d'une inspection, cliquez sur 'Telecharger rapport PDF'. Le rapport est au format officiel du ministere.",
        },
      ],
    },
    {
      title: "Dashboard et rapports",
      items: [
        {
          q: "Comment personnaliser mon dashboard ?",
          a: "Rendez-vous sur /pnpi/dashboard-config pour activer/desactiver et reordonner les widgets affiches.",
        },
        {
          q: "Comment generer un rapport personnalise ?",
          a: "Depuis la page Rapports, selectionnez les donnees (ATI, inspections, operateurs), le groupement (secteur, province, mois), et la periode. Exportez en CSV.",
        },
        {
          q: "Comment comparer deux periodes ?",
          a: "Utilisez la page Comparaison pour selectionner deux plages de dates et voir les indicateurs cote a cote avec les evolutions en pourcentage.",
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          q: "Comment creer un utilisateur ?",
          a: "Depuis /admin, utilisez le formulaire de creation. Attribuez un ou plusieurs roles (admin, ministre, directeur, instructeur, inspecteur, operateur) et une province si necessaire.",
        },
        {
          q: "Comment importer des operateurs ?",
          a: "Utilisez la section 'Import CSV' de l'admin. Le fichier doit contenir les colonnes : raison_sociale, nif_gabon, secteur, province (separateur point-virgule).",
        },
        {
          q: "Comment consulter le journal d'audit ?",
          a: "Depuis /admin/audit-log, recherchez par acteur, action, cible ou periode. Exportez les resultats en CSV.",
        },
      ],
    },
    {
      title: "Securite",
      items: [
        {
          q: "Comment activer la 2FA ?",
          a: "Depuis votre profil, section 'Authentification a deux facteurs'. Scannez le QR code avec une application TOTP (Google Authenticator, Authy). Sauvegardez vos codes de secours.",
        },
        {
          q: "Que faire si je perds mon appareil 2FA ?",
          a: "Utilisez un code de secours pour vous connecter, puis desactivez la 2FA depuis votre profil pour la reconfigurer.",
        },
        {
          q: "Comment voir l'historique de mes connexions ?",
          a: "Rendez-vous sur votre profil, section 'Historique de connexion'. Les tentatives echouees sont signalees en rouge.",
        },
      ],
    },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Centre d'aide PNPI</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 28px" }}>
        Guide d'utilisation de la Plateforme Nationale de la Politique Industrielle.
      </p>

      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              margin: "0 0 12px",
              color: "var(--accent, #006233)",
            }}
          >
            {section.title}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {section.items.map((item) => (
              <details
                key={item.q}
                style={{
                  borderRadius: 12,
                  padding: "12px 16px",
                  border: "1.5px solid var(--line, #dce4ef)",
                  background: "var(--bg-layer, #fff)",
                  cursor: "pointer",
                }}
              >
                <summary style={{ fontWeight: 600, fontSize: 14 }}>{item.q}</summary>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    color: "var(--text-soft, #526175)",
                    lineHeight: 1.6,
                  }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      ))}

      <div
        style={{
          marginTop: 32,
          padding: 20,
          borderRadius: 16,
          background: "linear-gradient(135deg, #051B36, #0c7eb4)",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Besoin d'aide supplementaire ?
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
          Contactez l'equipe technique via la messagerie interne ou par email.
        </div>
        <a
          href="/pnpi/messages/new"
          style={{
            display: "inline-block",
            padding: "8px 20px",
            borderRadius: 10,
            background: "#fff",
            color: "#051B36",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Contacter le support
        </a>
      </div>
    </div>
  );
}
