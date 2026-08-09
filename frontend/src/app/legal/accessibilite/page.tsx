export default function AccessibilitePage() {
  return (
    <div style={{ padding: "40px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
        Declaration d'Accessibilite
      </h1>
      <p style={{ color: "#526175", fontSize: 13, marginBottom: 24 }}>
        PNPI · Plateforme Nationale de Pilotage Industriel
      </p>

      {[
        {
          title: "Engagement",
          content:
            "Le Ministere de l'Industrie s'engage a rendre la PNPI accessible conformement aux standards WCAG 2.1 niveau AA. Cette declaration decrit les mesures prises et les limitations connues.",
        },
        {
          title: "Mesures d'accessibilite",
          content:
            "La PNPI integre les fonctionnalites suivantes : taille de texte ajustable (80-150%) ; mode haut contraste ; reduction des animations ; police adaptee a la dyslexie ; labels ARIA sur les elements interactifs ; navigation au clavier ; lien 'Aller au contenu principal' ; raccourcis clavier (appuyez sur '?').",
        },
        {
          title: "Conformite",
          content:
            "La PNPI est partiellement conforme au RGAA 4.1 et aux WCAG 2.1 niveau AA. Un audit complet est prevu pour 2026.",
        },
        {
          title: "Contenus non accessibles",
          content:
            "Certains graphiques et visualisations (cartes Leaflet, graphiques SVG) ne disposent pas encore de descriptions textuelles alternatives completes. Les documents PDF generes ne sont pas encore balises pour les lecteurs d'ecran.",
        },
        {
          title: "Technologies utilisees",
          content:
            "HTML5, CSS3, JavaScript (React/Next.js), ARIA, SVG. Compatibilite testee avec : Chrome, Firefox, Safari, Edge (dernieres versions) ; lecteurs d'ecran NVDA et VoiceOver.",
        },
        {
          title: "Retour d'information",
          content:
            "Si vous rencontrez un probleme d'accessibilite, contactez-nous : accessibilite@pnpi-gabon.ga. Nous nous engageons a repondre sous 5 jours ouvrables.",
        },
        {
          title: "Voies de recours",
          content:
            "En cas de reponse insatisfaisante, vous pouvez saisir le Mediateur de la Republique Gabonaise.",
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
