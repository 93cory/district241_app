import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { fetchPNPIATI, fetchPNPIATIHistorique, fetchPNPIATIDocuments, fetchPNPIOperateur } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";
import { WorkflowButtons } from "../components/WorkflowButton";
import { DocumentUpload } from "../components/DocumentUpload";
import { AssignInstructeur } from "../components/AssignInstructeur";
import { ResubmitForm } from "./ResubmitForm";
import { ATITimeline } from "./ATITimeline";
import { ATIComments } from "./Comments";

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);
const STATUT_LABELS: Record<string, string> = { soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const ETAPES = ["reception", "instruction", "validation", "decision"];

export default async function ATIDetailPage({ params }: { params: { id: string } }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
  } catch { redirect("/connexion"); }

  let ati: Awaited<ReturnType<typeof fetchPNPIATI>>;
  let historique: Awaited<ReturnType<typeof fetchPNPIATIHistorique>>;
  let documents: Awaited<ReturnType<typeof fetchPNPIATIDocuments>>;
  let operateurNom = "";
  try {
    [ati, historique, documents] = await Promise.all([fetchPNPIATI(params.id), fetchPNPIATIHistorique(params.id), fetchPNPIATIDocuments(params.id)]);
    try { operateurNom = (await fetchPNPIOperateur(ati.operateur_id)).raison_sociale; } catch { /* fallback to ID */ }
  } catch { notFound(); }

  const etapeIdx = ETAPES.indexOf(ati.etape);
  const color = STATUT_COLORS[ati.statut] ?? "#6b7280";

  return (
    <section className="section">
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#9ca3af", margin: "0 0.5rem" }}>/</span>
        <Link href="/pnpi/ati" style={{ color: "#6b7280", textDecoration: "none" }}>ATI</Link>
        <span style={{ color: "#9ca3af", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 600 }}>{ati.numero_ati}</span>
      </div>

      {/* Header card */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h2 style={{ margin: 0, color: "#003F8F", fontFamily: "monospace" }}>{ati.numero_ati}</h2>
              <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", background: `${color}18`, color, fontWeight: 700, fontSize: "0.8rem" }}>{STATUT_LABELS[ati.statut] ?? ati.statut}</span>
              {ati.is_overdue && <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#fef3c7", color: "#d97706", fontWeight: 700, fontSize: "0.72rem" }}>EN RETARD</span>}
            </div>
            <p style={{ margin: 0, color: "#374151", fontWeight: 500 }}>{ati.type_activite}</p>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
              Operateur: <Link href={`/pnpi/operateurs/${ati.operateur_id}`} style={{ color: "#003F8F", fontWeight: 600, textDecoration: "none" }}>{operateurNom || ati.operateur_id}</Link>
              {" "}&middot; Secteur: {ati.secteur} &middot; Priorite: <strong style={{ textTransform: "capitalize" }}>{ati.priorite}</strong>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <WorkflowButtons atiId={ati.id} currentStatut={ati.statut} />
            <a
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/ati/${ati.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "0.45rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", color: "#374151", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
            >
              &#x2193; PDF
            </a>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {ETAPES.map((e, i) => (
              <div key={e} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: "4px", background: i <= etapeIdx ? "#003F8F" : "#e5e7eb", marginBottom: "0.5rem", borderRadius: i === 0 ? "999px 0 0 999px" : i === ETAPES.length - 1 ? "0 999px 999px 0" : "0" }} />
                <span style={{ fontSize: "0.7rem", color: i <= etapeIdx ? "#003F8F" : "#9ca3af", fontWeight: i === etapeIdx ? 700 : 400, textTransform: "capitalize" }}>{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Details */}
        <div style={{ flex: "2 1 300px" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Informations du dossier</h3>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem 1.5rem", margin: 0 }}>
              {[
                ["Date soumission", new Date(ati.date_soumission).toLocaleDateString("fr-FR")],
                ["Age du dossier", `${ati.age_jours} jours`],
                ["SLA contractuel", `${ati.sla_jours} jours`],
                ["Instructeur", ati.instructeur_username ?? "Non assigne"],
                ["Date decision", ati.date_decision ? new Date(ati.date_decision).toLocaleDateString("fr-FR") : "En attente"],
                ["Date expiration", ati.date_expiration ? new Date(ati.date_expiration).toLocaleDateString("fr-FR") : "—"],
                ["Cree par", ati.created_by ?? "—"],
                ["Reference decision", ati.numero_reference_decision ?? "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.1rem" }}>{label}</dt>
                  <dd style={{ margin: 0, fontWeight: 500, color: "#1f2937", fontSize: "0.875rem" }}>{value}</dd>
                </div>
              ))}
            </dl>
            {/* Assignation instructeur */}
            <div style={{ marginTop: "1rem" }}>
              <AssignInstructeur atiId={ati.id} currentInstructeur={ati.instructeur_username} />
            </div>

            {ati.observations && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "6px", borderLeft: "3px solid #003F8F" }}>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Observations</div>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>{ati.observations}</p>
              </div>
            )}
            {ati.motif_rejet && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "6px", borderLeft: "3px solid #ef4444" }}>
                <div style={{ fontSize: "0.72rem", color: "#ef4444", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Motif de rejet</div>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>{ati.motif_rejet}</p>
              </div>
            )}
            {ati.statut === "rejete" && <ResubmitForm atiId={ati.id} motifRejet={ati.motif_rejet} />}
          </div>

          {/* QR code if approved */}
          {ati.qr_code_data && (
            <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <h3 style={{ margin: "0 0 0.75rem", color: "#10b981", fontSize: "0.95rem" }}>✓ Agrement approuve — QR Code officiel</h3>
              <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <img
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/ati/${ati.id}/qrcode`}
                  alt={`QR Code ${ati.numero_ati}`}
                  width={140}
                  height={140}
                  style={{ borderRadius: "8px", border: "2px solid #bbf7d0", background: "white", padding: "6px", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "#15803d", fontWeight: 600 }}>Numero : {ati.numero_ati}</p>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "#374151" }}>
                    Valide jusqu&apos;au <strong>{ati.date_expiration ? new Date(ati.date_expiration).toLocaleDateString("fr-FR") : "—"}</strong>
                  </p>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    Ce QR code certifie l&apos;authenticite de l&apos;agrement. Il peut etre scanne pour verification par les autorites competentes.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <a
                      href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/ati/${ati.id}/qrcode`}
                      download={`QR_${ati.numero_ati}.png`}
                      style={{ padding: "0.35rem 0.75rem", background: "#10b981", color: "white", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}
                    >
                      ↓ Telecharger QR
                    </a>
                    <a
                      href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/ati/${ati.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: "0.35rem 0.75rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}
                    >
                      ↓ PDF officiel
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <div style={{ flex: "1 1 240px" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Historique ({historique.length})</h3>
            {historique.length === 0 ? (
              <p style={{ color: "#9ca3af", margin: 0 }}>Aucune transition enregistree.</p>
            ) : (
              <div style={{ position: "relative" }}>
                {historique.map((t, i) => (
                  <div key={t.id} style={{ display: "flex", gap: "0.75rem", marginBottom: i < historique.length - 1 ? "1rem" : 0, position: "relative" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: STATUT_COLORS[t.new_statut ?? ""] ?? "#9ca3af", border: "2px solid #fff", boxShadow: "0 0 0 1px #e5e7eb", zIndex: 1 }} />
                      {i < historique.length - 1 && <div style={{ width: "1px", flex: 1, background: "#e5e7eb", marginTop: "2px" }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1f2937" }}>
                        {t.previous_statut ? `${STATUT_LABELS[t.previous_statut] ?? t.previous_statut} → ` : ""}{STATUT_LABELS[t.new_statut ?? ""] ?? t.new_statut}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.1rem" }}>Par {t.changed_by} &middot; {new Date(t.changed_at).toLocaleDateString("fr-FR")}</div>
                      {t.note && <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem", fontStyle: "italic" }}>{t.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
        <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Chronologie des transitions</h3>
        <ATITimeline transitions={historique} />
      </div>

      {/* Documents section */}
      <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
        <DocumentUpload atiId={ati.id} initialDocs={documents} />
      </div>

      {/* Comments / Annotations */}
      <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
        <ATIComments atiId={ati.id} />
      </div>
    </section>
  );
}
