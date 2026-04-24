export default function CGUPage() {
  return (
    <div
      style={{
        padding: "40px 32px",
        maxWidth: 800,
        margin: "0 auto",
        fontFamily: "Manrope, system-ui",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
        Conditions Generales d'Utilisation
      </h1>
      <p style={{ color: "#526175", fontSize: 13, marginBottom: 24 }}>
        Derniere mise a jour : 22 mars 2026
      </p>

      {[
        {
          title: "1. Objet",
          content:
            "Les presentes Conditions Generales d'Utilisation (CGU) regissent l'acces et l'utilisation de la Plateforme Nationale de la Politique Industrielle (PNPI), editee par le Ministere de l'Industrie et de la Transformation Locale de la Republique Gabonaise.",
        },
        {
          title: "2. Acces a la plateforme",
          content:
            "L'acces a la PNPI est reserve aux utilisateurs disposant d'un compte valide delivre par l'administration. Les operateurs industriels peuvent demander un compte via le formulaire d'inscription. L'administration se reserve le droit de refuser ou suspendre tout compte.",
        },
        {
          title: "3. Obligations de l'utilisateur",
          content:
            "L'utilisateur s'engage a : fournir des informations exactes et a jour ; ne pas communiquer ses identifiants a des tiers ; activer l'authentification a deux facteurs (2FA) ; signaler toute utilisation non autorisee de son compte ; respecter les delais de soumission des dossiers ATI.",
        },
        {
          title: "4. Propriete intellectuelle",
          content:
            "La PNPI, son interface, ses fonctionnalites et ses contenus sont la propriete du Ministere de l'Industrie. Toute reproduction, representation ou diffusion non autorisee est interdite. Les donnees saisies par les operateurs restent leur propriete.",
        },
        {
          title: "5. Protection des donnees",
          content:
            "Les donnees personnelles sont traitees conformement a la politique de confidentialite. La PNPI collecte uniquement les donnees necessaires au traitement des agrements techniques industriels. Voir notre politique de confidentialite pour plus de details.",
        },
        {
          title: "6. Disponibilite",
          content:
            "Le Ministere s'efforce d'assurer une disponibilite maximale de la plateforme. Des interruptions peuvent survenir pour maintenance. Les utilisateurs seront informes via le systeme d'annonces ou la page de statut.",
        },
        {
          title: "7. Responsabilite",
          content:
            "Le Ministere ne saurait etre tenu responsable des dommages resultant d'une utilisation non conforme de la plateforme, d'une interruption de service ou d'une erreur dans les donnees saisies par les utilisateurs.",
        },
        {
          title: "8. Modification des CGU",
          content:
            "Le Ministere se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs seront informes de toute modification substantielle. L'utilisation continue de la plateforme vaut acceptation des CGU modifiees.",
        },
        {
          title: "9. Droit applicable",
          content:
            "Les presentes CGU sont soumises au droit gabonais. Tout litige sera porte devant les juridictions competentes de Libreville.",
        },
        {
          title: "10. Contact",
          content:
            "Pour toute question relative aux CGU, contactez : Ministere de l'Industrie et de la Transformation Locale, BP 3903, Libreville, Gabon. Email : juridique@pnpi-gabon.ga",
        },
      ].map((s) => (
        <div key={s.title} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.title}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>{s.content}</p>
        </div>
      ))}
    </div>
  );
}
