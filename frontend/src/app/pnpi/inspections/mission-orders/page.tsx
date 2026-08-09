import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchInspectionMissionOrders } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "inspecteur"]);

export default async function MissionOrdersPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const orders = await fetchInspectionMissionOrders();

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#6b7280", fontWeight: 800 }}>ORDRES DE MISSION</p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Missions d'inspection</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563" }}>
            Missions planifiees, inspecteurs designes, objectifs et QR code de verification.
          </p>
        </div>
        <Link href="/pnpi/inspections/control-center" className="btn-secondary" style={{ alignSelf: "center" }}>
          Centre de controle
        </Link>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.85rem" }}>
        {orders.length === 0 ? (
          <div className="chart-card" style={{ padding: "1.25rem", color: "#6b7280" }}>
            Aucun ordre de mission enregistre pour le moment.
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="chart-card" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#003F8F", fontSize: "1rem", fontFamily: "monospace" }}>
                    {order.numero}
                  </h2>
                  <p style={{ margin: "0.35rem 0 0", color: "#374151", fontWeight: 700 }}>
                    {order.operateur_nom}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.84rem" }}>
                    {new Date(order.scheduled_at).toLocaleDateString("fr-FR")} · {order.lieu ?? "Lieu a confirmer"} ·{" "}
                    {order.duration_days} jour(s)
                  </p>
                </div>
                <span style={{ color: "#0c7eb4", fontWeight: 900 }}>{order.status}</span>
              </div>
              <p style={{ margin: "0.75rem 0 0", color: "#374151", fontSize: "0.9rem" }}>{order.objective}</p>
              <p style={{ margin: "0.5rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
                Inspecteurs : {order.inspecteurs.join(", ") || "Non affectes"} · QR : {order.qr_code_data ?? "—"}
              </p>
              {order.inspection_id && (
                <Link href={`/pnpi/inspections/${order.inspection_id}`} style={{ color: "#003F8F", fontWeight: 800 }}>
                  Voir le rapport lie →
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
