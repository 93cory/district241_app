import { backendRequest } from "@/lib/backend";
export const dynamic = "force-dynamic";

export default async function TriagePage() {
  let queue: any[] = [];
  try {
    const res = await backendRequest("/pnpi/ati/triage");
    if (res.ok) { const d = await res.json(); queue = d.queue || []; }
  } catch {}

  const critique = queue.filter(a => a.priority_level === "critique").length;
  const urgent = queue.filter(a => a.priority_level === "urgent").length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>File de triage ATI</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
            {queue.length} dossiers en attente — {critique} critiques, {urgent} urgents
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {queue.map((ati, i) => (
          <a key={ati.id} href={`/pnpi/ati/${ati.id}`} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 12,
            background: "var(--bg-layer, #fff)",
            borderLeft: `5px solid ${ati.color}`,
            textDecoration: "none", color: "inherit",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${ati.color}12`, color: ati.color, fontSize: 12, fontWeight: 800,
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{ati.numero_ati}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{ati.operateur} — {ati.secteur}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ padding: "2px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: `${ati.color}12`, color: ati.color, textTransform: "capitalize" }}>{ati.priority_level}</span>
              <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>{ati.age_jours}j / {ati.sla_jours}j SLA ({ati.sla_pct}%)</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: ati.color, minWidth: 36, textAlign: "right" }}>{ati.priority_score}</div>
          </a>
        ))}
        {queue.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--text-soft)" }}>Aucun dossier en attente.</div>}
      </div>
    </div>
  );
}
