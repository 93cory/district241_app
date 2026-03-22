import { backendRequest } from "@/lib/backend";
export const dynamic = "force-dynamic";

const CERTIFICATIONS = [
  { code: "ISO 9001", name: "Management de la qualite", color: "#0c7eb4", icon: "\u{1F3C6}" },
  { code: "ISO 14001", name: "Management environnemental", color: "#006233", icon: "\u{1F33F}" },
  { code: "ISO 22000", name: "Securite alimentaire", color: "#d97706", icon: "\u{1F37D}\uFE0F" },
  { code: "HACCP", name: "Analyse des dangers", color: "#b42318", icon: "\u26A0\uFE0F" },
  { code: "FSC", name: "Gestion forestiere responsable", color: "#059669", icon: "\u{1F332}" },
  { code: "PEFC", name: "Forets gerees durablement", color: "#065f46", icon: "\u{1F333}" },
  { code: "RSPO", name: "Huile de palme durable", color: "#d97706", icon: "\u{1F334}" },
  { code: "CEMAC NF", name: "Norme CEMAC", color: "#7c3aed", icon: "\u{1F4CB}" },
  { code: "CE", name: "Conformite europeenne", color: "#0c7eb4", icon: "\u{1F1EA}\u{1F1FA}" },
];

export default async function CertificationsPage() {
  let operators: any[] = [];
  try {
    const res = await backendRequest("/pnpi/operateurs?limit=200");
    if (res.ok) { const d = await res.json(); operators = d.operateurs || d || []; }
  } catch {}

  // Simulate certification data based on sectors
  const SECTOR_CERTS: Record<string, string[]> = {
    bois: ["FSC", "PEFC", "ISO 14001"],
    agroalimentaire: ["ISO 22000", "HACCP", "RSPO"],
    mines: ["ISO 14001", "ISO 9001"],
    peche: ["HACCP", "ISO 22000"],
    chimie: ["ISO 9001", "CE"],
    btp: ["ISO 9001", "CEMAC NF"],
    energie: ["ISO 14001", "ISO 9001"],
  };

  const certCounts: Record<string, number> = {};
  for (const op of operators) {
    const certs = SECTOR_CERTS[op.secteur] || [];
    for (const cert of certs) {
      certCounts[cert] = (certCounts[cert] || 0) + 1;
    }
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Certifications qualite</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Suivi des normes et certifications qualite des operateurs industriels gabonais.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {CERTIFICATIONS.map(cert => {
          const count = certCounts[cert.code] || 0;
          const pct = operators.length ? Math.round(count / operators.length * 100) : 0;
          return (
            <div key={cert.code} className="chart-card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{cert.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cert.color }}>{cert.code}</div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{cert.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--line)" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: cert.color, width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: cert.color }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{count} operateur(s) certifie(s)</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "var(--bg-base)", fontSize: 12, color: "var(--text-soft)" }}>
        Les certifications sont estimees par secteur d&apos;activite. Pour une donnee precise,
        contactez chaque operateur ou consultez les documents joints a leur dossier ATI.
      </div>
    </div>
  );
}
