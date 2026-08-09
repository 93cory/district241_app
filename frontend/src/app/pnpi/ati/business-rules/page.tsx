import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIATIBusinessRules } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ROLE_ALLOWED = new Set(["admin", "directeur", "instructeur"]);

export default async function ATIBusinessRulesPage() {
  try {
    const profile = await fetchBackendProfile();
    const roles = (profile.roles ?? []) as string[];
    if (!roles.some((role) => ROLE_ALLOWED.has(role))) redirect("/pnpi");
  } catch {
    redirect("/connexion");
  }

  const rules = await fetchPNPIATIBusinessRules();

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#6b7280", fontWeight: 700 }}>
            MOTEUR DE REGLES ATI
          </p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Regles metier configurables</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563" }}>
            Les pieces, SLA et conditions peuvent evoluer sans recoder tout le module.
          </p>
        </div>
        <Link href="/pnpi/ati/processing-center" className="btn-secondary" style={{ alignSelf: "center" }}>
          Centre de traitement
        </Link>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.85rem" }}>
        {rules.map((rule) => (
          <div key={rule.id} className="chart-card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>{rule.label}</h2>
                <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
                  Type : {rule.rule_type} · Demande : {rule.demande_type ?? "toutes"} · Secteur :{" "}
                  {rule.secteur ?? "tous"}
                </p>
              </div>
              <span style={{ color: rule.is_active ? "#10b981" : "#9ca3af", fontWeight: 800 }}>
                {rule.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <pre
              style={{
                margin: "0.85rem 0 0",
                padding: "0.8rem",
                borderRadius: "8px",
                background: "#f9fafb",
                color: "#374151",
                overflowX: "auto",
                fontSize: "0.78rem",
              }}
            >
              {JSON.stringify(rule.config, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
