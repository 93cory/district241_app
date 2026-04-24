export default function ReglementationPage() {
  const textes = [
    { ref: "Loi 015/2023", titre: "Loi sur la promotion de la transformation locale", date: "2023-12-15", type: "loi", statut: "en_vigueur", resume: "Obligation de transformation locale de 35% des matieres premieres extractives. Incitations fiscales pour les industries de transformation." },
    { ref: "Decret 0234/2024", titre: "Conditions d'obtention de l'agrement technique industriel", date: "2024-03-01", type: "decret", statut: "en_vigueur", resume: "Fixe les criteres, delais et procedures pour l'obtention d'un ATI. Definit les SLA a 45 jours." },
    { ref: "Arrete 0089/2024", titre: "Normes de conformite environnementale industrielle", date: "2024-06-20", type: "arrete", statut: "en_vigueur", resume: "Impose une etude d'impact environnemental pour tout projet industriel. Seuils d'emission par secteur." },
    { ref: "Loi 008/2022", titre: "Code des investissements du Gabon", date: "2022-07-10", type: "loi", statut: "en_vigueur", resume: "Regime fiscal preferentiel pour les nouveaux investissements industriels. Exonerations douanieres sur les equipements." },
    { ref: "Decret 0156/2025", titre: "Zone economique speciale de Nkok · Phase III", date: "2025-01-15", type: "decret", statut: "en_vigueur", resume: "Extension de la ZERP de Nkok. Nouveaux lots industriels disponibles. Regime fiscal: 0% impot pendant 10 ans." },
    { ref: "Arrete 0045/2025", titre: "Reglementation des inspections de conformite", date: "2025-04-01", type: "arrete", statut: "en_vigueur", resume: "Frequence des inspections par categorie de risque. Formation obligatoire des inspecteurs." },
    { ref: "Loi 012/2024", titre: "Protection des donnees industrielles", date: "2024-09-30", type: "loi", statut: "en_vigueur", resume: "Cadre juridique pour le traitement des donnees des operateurs industriels. Obligations de confidentialite." },
    { ref: "Projet de loi", titre: "Reforme du code minier · Transformation locale", date: "2026-01-01", type: "projet", statut: "en_preparation", resume: "Augmentation du taux de transformation locale du manganese a 50%. Nouvelles redevances environnementales." },
  ];

  const TYPE_COLORS: Record<string, { color: string; label: string }> = {
    loi: { color: "#006233", label: "Loi" },
    decret: { color: "#0c7eb4", label: "Decret" },
    arrete: { color: "#7c3aed", label: "Arrete" },
    projet: { color: "#d97706", label: "Projet" },
  };

  const STATUT_STYLES: Record<string, { color: string; label: string }> = {
    en_vigueur: { color: "#006233", label: "En vigueur" },
    en_preparation: { color: "#d97706", label: "En preparation" },
    abroge: { color: "#b42318", label: "Abroge" },
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Veille reglementaire</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Textes de loi, decrets et arretes regissant l'activite industrielle au Gabon.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {textes.map(t => {
          const type = TYPE_COLORS[t.type] || TYPE_COLORS.loi;
          const statut = STATUT_STYLES[t.statut] || STATUT_STYLES.en_vigueur;
          return (
            <div key={t.ref} className="chart-card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${type.color}12`, color: type.color }}>{type.label}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${statut.color}12`, color: statut.color }}>{statut.label}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{t.titre}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 2 }}>{t.ref} · {new Date(t.date).toLocaleDateString("fr-FR")}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.5, margin: "8px 0 0" }}>{t.resume}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
