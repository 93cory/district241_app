export default function ConfidentialitePage() {
  return (
    <div style={{ padding: "40px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Politique de Confidentialite</h1>
      <p style={{ color: "#526175", fontSize: 13, marginBottom: 24 }}>Derniere mise a jour : 22 mars 2026</p>

      {[
        { title: "1. Responsable du traitement", content: "Le Ministere de l'Industrie et de la Transformation Locale est responsable du traitement des donnees personnelles collectees via la PNPI." },
        { title: "2. Donnees collectees", content: "Nous collectons : nom, prenom, adresse email, telephone, NIF Gabon, raison sociale, adresse professionnelle, donnees de connexion (IP, navigateur), historique d'utilisation de la plateforme." },
        { title: "3. Finalites du traitement", content: "Les donnees sont traitees pour : la gestion des agrements techniques industriels ; le suivi des inspections de conformite ; la generation de statistiques anonymisees ; la communication avec les utilisateurs ; la securite de la plateforme." },
        { title: "4. Base legale", content: "Le traitement des donnees est fonde sur : la mission de service public du Ministere ; le consentement de l'utilisateur lors de l'inscription ; l'execution du contrat d'agrement technique." },
        { title: "5. Destinataires", content: "Les donnees sont accessibles aux : agents du Ministere habilites ; instructeurs et inspecteurs dans le cadre de leurs missions ; services douaniers et fiscaux dans le cadre des verifications legales." },
        { title: "6. Duree de conservation", content: "Les donnees des comptes actifs sont conservees pendant toute la duree de l'activite. Les ATI expires sont archives pendant 10 ans. Les donnees de connexion sont conservees 1 an." },
        { title: "7. Securite", content: "Nous mettons en oeuvre des mesures techniques (chiffrement, 2FA, controle d'acces) et organisationnelles pour proteger vos donnees. Les acces sont traces dans un journal d'audit." },
        { title: "8. Droits des utilisateurs", content: "Vous disposez d'un droit d'acces, de rectification et de suppression de vos donnees. Pour exercer ces droits, contactez : dpo@pnpi-gabon.ga" },
        { title: "9. Cookies", content: "La PNPI utilise des cookies techniques necessaires au fonctionnement (session, preferences de theme, langue). Aucun cookie publicitaire n'est utilise." },
        { title: "10. Transferts internationaux", content: "Les donnees sont hebergees sur des serveurs situes au Gabon ou dans la zone CEMAC. Aucun transfert vers des pays tiers n'est effectue sans garanties appropriees." },
      ].map(s => (
        <div key={s.title} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.title}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>{s.content}</p>
        </div>
      ))}
    </div>
  );
}
