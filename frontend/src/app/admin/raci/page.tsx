export default function RACIPage() {
  const roles = ["Operateur", "Instructeur", "Directeur", "Ministre", "Inspecteur", "Admin"];

  const stages = [
    {
      stage: "Soumission ATI",
      raci: { Operateur: "R", Instructeur: "I", Directeur: "I", Ministre: "", Inspecteur: "", Admin: "I" },
    },
    {
      stage: "Instruction dossier",
      raci: { Operateur: "I", Instructeur: "R", Directeur: "C", Ministre: "", Inspecteur: "", Admin: "" },
    },
    {
      stage: "Validation technique",
      raci: { Operateur: "I", Instructeur: "A", Directeur: "R", Ministre: "I", Inspecteur: "C", Admin: "" },
    },
    {
      stage: "Decision finale",
      raci: { Operateur: "I", Instructeur: "I", Directeur: "A", Ministre: "R", Inspecteur: "", Admin: "I" },
    },
    {
      stage: "Emission certificat",
      raci: { Operateur: "I", Instructeur: "R", Directeur: "A", Ministre: "", Inspecteur: "", Admin: "" },
    },
    {
      stage: "Inspection conformite",
      raci: { Operateur: "I", Instructeur: "C", Directeur: "A", Ministre: "I", Inspecteur: "R", Admin: "" },
    },
    {
      stage: "Rapport inspection",
      raci: { Operateur: "I", Instructeur: "I", Directeur: "C", Ministre: "I", Inspecteur: "R", Admin: "" },
    },
    {
      stage: "Renouvellement ATI",
      raci: { Operateur: "R", Instructeur: "A", Directeur: "C", Ministre: "I", Inspecteur: "", Admin: "" },
    },
    {
      stage: "Escalade SLA",
      raci: { Operateur: "", Instructeur: "I", Directeur: "R", Ministre: "A", Inspecteur: "", Admin: "I" },
    },
    {
      stage: "Gestion utilisateurs",
      raci: { Operateur: "", Instructeur: "", Directeur: "C", Ministre: "", Inspecteur: "", Admin: "R" },
    },
  ];

  const RACI_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    R: { bg: "#006233", color: "#fff", label: "Responsible" },
    A: { bg: "#0c7eb4", color: "#fff", label: "Accountable" },
    C: { bg: "#d97706", color: "#fff", label: "Consulted" },
    I: { bg: "#e5e7eb", color: "#526175", label: "Informed" },
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Matrice RACI</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        Responsabilites par role a chaque etape du workflow ATI.
      </p>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12 }}>
        {Object.entries(RACI_COLORS).map(([key, style]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: style.bg, color: style.color, fontSize: 12, fontWeight: 800,
            }}>{key}</span>
            <span style={{ fontWeight: 600 }}>{style.label}</span>
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-base, #f4f8fb)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, fontWeight: 700, borderBottom: "2px solid var(--line, #dce4ef)" }}>
                  Etape
                </th>
                {roles.map(role => (
                  <th key={role} style={{
                    padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 700,
                    borderBottom: "2px solid var(--line, #dce4ef)",
                    whiteSpace: "nowrap",
                  }}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map((row, idx) => (
                <tr key={row.stage} style={{ background: idx % 2 ? "var(--bg-base, #fafbfc)" : "transparent" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid var(--line, #eee)" }}>
                    {row.stage}
                  </td>
                  {roles.map(role => {
                    const val = row.raci[role as keyof typeof row.raci] || "";
                    const style = val ? RACI_COLORS[val] : null;
                    return (
                      <td key={role} style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid var(--line, #eee)" }}>
                        {style && (
                          <span style={{
                            display: "inline-flex", width: 28, height: 28, borderRadius: 6,
                            alignItems: "center", justifyContent: "center",
                            background: style.bg, color: style.color,
                            fontSize: 13, fontWeight: 800,
                          }}>
                            {val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
