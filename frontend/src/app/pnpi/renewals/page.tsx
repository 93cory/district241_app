import { backendRequest } from "@/lib/backend";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  let expiring: any[] = [];
  try {
    const res = await backendRequest("/pnpi/ati/expiring-soon?days=90");
    if (res.ok) {
      const d = await res.json();
      expiring = d.atis || [];
    }
  } catch {}

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Renouvellements ATI</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        {expiring.length} ATI(s) expirant dans les 90 prochains jours.
      </p>

      {expiring.length === 0 ? (
        <div className="chart-card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 600 }}>Aucun renouvellement urgent</div>
          <div style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>
            Tous les ATI approuves sont loin de leur date d'expiration.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {expiring.map((ati: any) => {
            const urgent = ati.days_remaining <= 30;
            const warning = ati.days_remaining <= 60;
            const color = urgent ? "#b42318" : warning ? "#d97706" : "#0c7eb4";
            return (
              <div
                key={ati.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderRadius: 14,
                  background: "var(--bg-layer, #fff)",
                  border: `1.5px solid ${color}30`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${color}12`,
                    fontSize: 18,
                  }}
                >
                  {urgent ? "🚨" : warning ? "⚠️" : "📅"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ati.numero_ati}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
                    {ati.operateur} · {ati.secteur}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color }}>{ati.days_remaining}j</div>
                  <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)" }}>
                    Expire le {new Date(ati.date_expiration).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <Link
                  href={`/pnpi/ati/${ati.id}`}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: color,
                    color: "#fff",
                    textDecoration: "none",
                  }}
                >
                  Renouveler
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
