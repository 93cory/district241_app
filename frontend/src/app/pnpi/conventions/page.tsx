import { backendRequest } from "@/lib/backend";
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  accord_cadre: "Accord-cadre", convention_specifique: "Convention specifique",
  protocole: "Protocole", mou: "Memorandum", partenariat: "Partenariat",
};

export default async function ConventionsPage() {
  let convs: any[] = [];
  try {
    const res = await backendRequest("/conventions/list");
    if (res.ok) { const d = await res.json(); convs = d.conventions || []; }
  } catch {}

  const fmt = (n: number) => n ? n.toLocaleString("fr-FR") : "·";
  const active = convs.filter(c => c.statut === "active");
  const totalMontant = active.reduce((s, c) => s + (c.montant_fcfa || 0), 0);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Conventions & Accords</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        {active.length} convention(s) active(s) · {fmt(totalMontant)} FCFA
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {convs.map(c => (
          <div key={c.id} className="chart-card" style={{ padding: "16px 20px", opacity: c.statut === "active" ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{c.titre}</div>
                <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                  {c.partenaire} · {c.numero}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#e0f2fe", color: "#0c7eb4" }}>
                  {TYPE_LABELS[c.type_convention] || c.type_convention}
                </span>
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: c.statut === "active" ? "#dcfce7" : "#f3f4f6",
                  color: c.statut === "active" ? "#006233" : "#526175",
                }}>{c.statut}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-soft)" }}>
              <span>Signe le {new Date(c.date_signature).toLocaleDateString("fr-FR")}</span>
              {c.date_expiration && <span>Expire le {new Date(c.date_expiration).toLocaleDateString("fr-FR")}</span>}
              {c.montant_fcfa && <span style={{ fontWeight: 700, color: "var(--text-main)" }}>{fmt(c.montant_fcfa)} FCFA</span>}
            </div>
          </div>
        ))}
        {convs.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-soft)" }}>Aucune convention enregistree.</div>
        )}
      </div>
    </div>
  );
}
