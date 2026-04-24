export default function BeforeAfterPage() {
  const comparisons = [
    {
      aspect: "Delai moyen de traitement ATI",
      before: "120-180 jours",
      after: "35-45 jours",
      improvement: "-75%",
      icon: "\u23F1\uFE0F",
    },
    {
      aspect: "Tracabilite des dossiers",
      before: "Papier, classeurs physiques",
      after: "100% numerique, temps reel",
      improvement: "100%",
      icon: "\uD83D\uDCCB",
    },
    {
      aspect: "Taux de perte de dossiers",
      before: "~15% par an",
      after: "0% (archive numerique)",
      improvement: "-100%",
      icon: "\uD83D\uDCC2",
    },
    {
      aspect: "Verification ATI par tiers",
      before: "Appel telephonique, courrier",
      after: "QR code instantane",
      improvement: "Instantane",
      icon: "\uD83D\uDD0D",
    },
    {
      aspect: "Inspections documentees",
      before: "Rapport papier, 1 semaine apres",
      after: "Rapport PDF + photos, temps reel",
      improvement: "+95%",
      icon: "\uD83D\uDCF8",
    },
    {
      aspect: "Visibilite ministerielle",
      before: "Rapport trimestriel papier",
      after: "Dashboard temps reel, predictions IA",
      improvement: "Temps reel",
      icon: "\uD83D\uDCCA",
    },
    {
      aspect: "Communication operateur-ministere",
      before: "Courrier, deplacement physique",
      after: "Messagerie, notifications, SMS",
      improvement: "Instantane",
      icon: "\uD83D\uDCAC",
    },
    {
      aspect: "Transparence",
      before: "Aucune donnee publique",
      after: "Open data, verification publique",
      improvement: "100%",
      icon: "\uD83C\uDF0D",
    },
    {
      aspect: "Cout de traitement par ATI",
      before: "~850 000 FCFA",
      after: "~350 000 FCFA",
      improvement: "-59%",
      icon: "\uD83D\uDCB0",
    },
    {
      aspect: "Benchmark provincial",
      before: "Inexistant",
      after: "Score composite 9 provinces",
      improvement: "Nouveau",
      icon: "\uD83C\uDFC6",
    },
    {
      aspect: "Impact environnemental",
      before: "Non mesure",
      after: "CO2/secteur, arbres compensation",
      improvement: "Nouveau",
      icon: "\uD83C\uDF3F",
    },
    {
      aspect: "Formation des agents",
      before: "Formations presentielles rares",
      after: "E-learning integre, 5 modules",
      improvement: "Permanent",
      icon: "\uD83C\uDF93",
    },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Avant / Apres PNPI</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Impact concret de la digitalisation sur la gouvernance industrielle gabonaise.
      </p>

      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-base)" }}>
                <th
                  style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 700 }}
                >
                  Aspect
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#b42318",
                  }}
                >
                  Avant PNPI
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#006233",
                  }}
                >
                  Avec PNPI
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Gain
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr key={c.aspect} style={{ borderBottom: "1px solid var(--line, #eee)" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>
                    <span style={{ marginRight: 6 }}>{c.icon}</span>
                    <strong>{c.aspect}</strong>
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "#b42318",
                      background: "rgba(180,35,24,0.03)",
                    }}
                  >
                    {c.before}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "#006233",
                      background: "rgba(0,98,51,0.03)",
                      fontWeight: 600,
                    }}
                  >
                    {c.after}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        background: "#dcfce7",
                        color: "#006233",
                      }}
                    >
                      {c.improvement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
