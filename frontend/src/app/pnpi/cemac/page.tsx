export default function CEMACPage() {
  const countries = [
    {
      name: "Gabon",
      flag: "\u{1F1EC}\u{1F1E6}",
      pib_mds: 19.3,
      pop_m: 2.4,
      industrialisation: 38,
      doing_business: 169,
      ati_system: true,
      highlight: true,
    },
    {
      name: "Cameroun",
      flag: "\u{1F1E8}\u{1F1F2}",
      pib_mds: 44.9,
      pop_m: 28.6,
      industrialisation: 28,
      doing_business: 167,
      ati_system: false,
      highlight: false,
    },
    {
      name: "Congo",
      flag: "\u{1F1E8}\u{1F1EC}",
      pib_mds: 12.5,
      pop_m: 6.0,
      industrialisation: 42,
      doing_business: 180,
      ati_system: false,
      highlight: false,
    },
    {
      name: "Tchad",
      flag: "\u{1F1F9}\u{1F1E9}",
      pib_mds: 11.8,
      pop_m: 17.4,
      industrialisation: 12,
      doing_business: 182,
      ati_system: false,
      highlight: false,
    },
    {
      name: "RCA",
      flag: "\u{1F1E8}\u{1F1EB}",
      pib_mds: 2.6,
      pop_m: 5.5,
      industrialisation: 8,
      doing_business: 184,
      ati_system: false,
      highlight: false,
    },
    {
      name: "Guinee Eq.",
      flag: "\u{1F1EC}\u{1F1F6}",
      pib_mds: 11.0,
      pop_m: 1.7,
      industrialisation: 55,
      doing_business: 178,
      ati_system: false,
      highlight: false,
    },
  ];

  const maxPib = Math.max(...countries.map((c) => c.pib_mds));
  const maxInd = Math.max(...countries.map((c) => c.industrialisation));

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Benchmark CEMAC</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Positionnement du Gabon parmi les 6 pays de la CEMAC en matiere d&apos;industrialisation.
      </p>

      {/* Table */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Pays</th>
                <th style={{ textAlign: "center" }}>PIB (Mds $)</th>
                <th style={{ textAlign: "center" }}>Population (M)</th>
                <th style={{ textAlign: "center" }}>Taux indust. (%)</th>
                <th style={{ textAlign: "center" }}>Doing Business</th>
                <th style={{ textAlign: "center" }}>Plateforme ATI</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr
                  key={c.name}
                  style={{ background: c.highlight ? "rgba(0,98,51,0.04)" : "transparent" }}
                >
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ marginRight: 6 }}>{c.flag}</span>
                    {c.name}
                    {c.highlight && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "#006233" }}>
                        {"\u2605"}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{ width: 40, height: 6, borderRadius: 3, background: "var(--line)" }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${(c.pib_mds / maxPib) * 100}%`,
                            background: c.highlight ? "#006233" : "#0c7eb4",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{c.pib_mds}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", fontSize: 13 }}>{c.pop_m}</td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          c.industrialisation >= 35
                            ? "#dcfce7"
                            : c.industrialisation >= 20
                              ? "#fef3c7"
                              : "#fef2f2",
                        color:
                          c.industrialisation >= 35
                            ? "#006233"
                            : c.industrialisation >= 20
                              ? "#d97706"
                              : "#b42318",
                      }}
                    >
                      {c.industrialisation}%
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontSize: 13 }}>{c.doing_business}</td>
                  <td style={{ textAlign: "center" }}>
                    {c.ati_system ? (
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "#dcfce7",
                          color: "#006233",
                        }}
                      >
                        PNPI {"\u2713"}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-soft)" }}>{"\u2014"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gabon advantages */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#006233" }}>
          Avantages competitifs du Gabon
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {[
            {
              title: "PIB/habitant le plus eleve",
              detail: "8 042 $ \u2014 le plus eleve de la CEMAC",
              icon: "\u{1F4B0}",
            },
            {
              title: "Plateforme numerique unique",
              detail: "Seul pays CEMAC avec une plateforme ATI digitale",
              icon: "\u{1F5A5}\uFE0F",
            },
            {
              title: "Stabilite politique",
              detail: "Environnement institutionnel stable pour les investisseurs",
              icon: "\u{1F3DB}\uFE0F",
            },
            {
              title: "Ressources naturelles",
              detail: "Forets, manganese, petrole, hydroelectricite",
              icon: "\u{1F30D}",
            },
            {
              title: "Zone franche ZERP",
              detail: "Regime fiscal avantageux a Nkok et Port-Gentil",
              icon: "\u{1F3D7}\uFE0F",
            },
            {
              title: "Position geographique",
              detail: "Acces maritime, pont entre Afrique centrale et occidentale",
              icon: "\u{1F30A}",
            },
          ].map((a) => (
            <div
              key={a.title}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(0,98,51,0.04)",
                borderLeft: "3px solid #006233",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{a.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
