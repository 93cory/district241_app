import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

const TRIGGER_LABELS: Record<string, string> = {
  on_submit: "Soumission",
  on_transition: "Transition",
  on_approve: "Approbation",
  on_reject: "Rejet",
  on_sla_warning: "Alerte SLA",
  on_sla_breach: "Depassement SLA",
  on_inspection_complete: "Fin inspection",
};

const ACTION_LABELS: Record<string, string> = {
  notify_user: "Notifier utilisateur",
  notify_role: "Notifier role",
  send_email: "Envoyer email",
  auto_assign: "Auto-assigner",
  add_tag: "Ajouter tag",
  create_alert: "Creer alerte",
  log_audit: "Log audit",
};

const TRIGGER_COLORS: Record<string, string> = {
  on_submit: "#0c7eb4",
  on_approve: "#006233",
  on_reject: "#b42318",
  on_sla_warning: "#d97706",
  on_sla_breach: "#b42318",
  on_transition: "#7c3aed",
  on_inspection_complete: "#059669",
};

export default async function WorkflowsPage() {
  let rules: any[] = [];
  try {
    const res = await backendRequest("/workflows/rules");
    if (res.ok) {
      const data = await res.json();
      rules = data.rules || [];
    }
  } catch {}

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Regles de workflow</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        {rules.length} regle(s) configuree(s). Les regles s'executent automatiquement lors des
        evenements.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rules.map((rule: any) => {
          const trigColor = TRIGGER_COLORS[rule.trigger] || "#526175";
          return (
            <div key={rule.id} className="chart-card" style={{ padding: "16px 20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{rule.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
                    {rule.description}
                  </div>
                </div>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    background: rule.is_active ? "#dcfce7" : "#f3f4f6",
                    color: rule.is_active ? "#006233" : "#526175",
                  }}
                >
                  {rule.is_active ? "Actif" : "Inactif"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${trigColor}12`,
                    color: trigColor,
                  }}
                >
                  {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>{"\u2192"}</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#e0f2fe",
                    color: "#0c7eb4",
                  }}
                >
                  {ACTION_LABELS[rule.action] || rule.action}
                </span>
              </div>

              {rule.conditions.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>
                  Conditions :{" "}
                  {rule.conditions
                    .map((c: any) => `${c.field} ${c.operator} ${c.value}`)
                    .join(" ET ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
