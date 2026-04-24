export default function SuccessStoriesPage() {
  const stories = [
    {
      operateur: "SNBG Transformation",
      secteur: "bois",
      province: "Estuaire",
      image: "\u{1FAB5}",
      titre: "De l'export brut a la transformation locale",
      resume:
        "Grace a l'ATI obtenu en 6 semaines via la PNPI, SNBG Transformation a pu demarrer une unite de deroulage a Owendo, creant 120 emplois directs et multipliant par 3 la valeur ajoutee du bois gabonais.",
      chiffres: [
        { label: "Emplois crees", value: "120" },
        { label: "Investissement", value: "2.8 Mds FCFA" },
        { label: "Delai ATI", value: "42 jours" },
      ],
    },
    {
      operateur: "Gabon Mining Services",
      secteur: "mines",
      province: "Haut-Ogooue",
      image: "\u26CF\uFE0F",
      titre: "Enrichissement local du manganese a Moanda",
      resume:
        "Premiere unite d'enrichissement de manganese 100% gabonaise, reduisant les couts de transport de 60%. L'agrement a ete obtenu avec l'accompagnement d'un mentor PNPI et une checklist de conformite complete.",
      chiffres: [
        { label: "Emplois crees", value: "85" },
        { label: "Reduction couts", value: "-60%" },
        { label: "Export", value: "50 000 t/an" },
      ],
    },
    {
      operateur: "Olam Palm Gabon",
      secteur: "agroalimentaire",
      province: "Moyen-Ogooue",
      image: "\u{1F334}",
      titre: "Huile de palme certifiee RSPO",
      resume:
        "Grace au suivi PNPI et aux inspections regulieres, Olam Palm a obtenu la certification RSPO, ouvrant l'acces aux marches europeens premium. Le scoring PNPI de l'operateur est passe de C a A.",
      chiffres: [
        { label: "Score PNPI", value: "A (92/100)" },
        { label: "Emplois", value: "340" },
        { label: "Certification", value: "RSPO" },
      ],
    },
    {
      operateur: "Gabon Energie Solaire",
      secteur: "energie",
      province: "Woleu-Ntem",
      image: "\u2600\uFE0F",
      titre: "Centrale solaire de 10MW a Bitam",
      resume:
        "Premier projet solaire industriel du nord du Gabon. L'ATI a ete obtenu en 35 jours grace aux templates PNPI et le certificat QR code permet une verification instantanee par les partenaires internationaux.",
      chiffres: [
        { label: "Puissance", value: "10 MW" },
        { label: "Foyers alimentes", value: "8 000" },
        { label: "CO2 evite", value: "4 500 t/an" },
      ],
    },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Reussites industrielles</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 24px" }}>
        Temoignages d'operateurs accompagnes par la plateforme PNPI.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {stories.map((s) => (
          <div key={s.operateur} className="chart-card" style={{ padding: 24, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "rgba(0,98,51,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  flexShrink: 0,
                }}
              >
                {s.image}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "#dcfce7",
                      color: "#006233",
                      textTransform: "capitalize",
                    }}
                  >
                    {s.secteur}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "#e0f2fe",
                      color: "#0c7eb4",
                    }}
                  >
                    {s.province}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{s.titre}</div>
                <div style={{ fontSize: 12, color: "#006233", fontWeight: 700, marginBottom: 6 }}>
                  {s.operateur}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-main)", margin: 0 }}>
                  {s.resume}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--line, #eee)",
              }}
            >
              {s.chiffres.map((c) => (
                <div key={c.label} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#006233" }}>{c.value}</div>
                  <div style={{ fontSize: 10, color: "var(--text-soft)" }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
