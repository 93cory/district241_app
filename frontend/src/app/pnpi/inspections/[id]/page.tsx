import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { fetchPNPIInspection } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";
import { PhotoGallery } from "./PhotoGallery";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);
const CONF_LABELS: Record<string, string> = { conforme: "Conforme", non_conforme: "Non conforme", partiel: "Partiel" };
const CONF_COLORS: Record<string, string> = { conforme: "#10b981", non_conforme: "#ef4444", partiel: "#f59e0b" };
const CONF_BG: Record<string, string> = { conforme: "#f0fdf4", non_conforme: "#fef2f2", partiel: "#fefce8" };
const CONF_BORDER: Record<string, string> = { conforme: "#bbf7d0", non_conforme: "#fecaca", partiel: "#fef08a" };

export default async function InspectionDetailPage({ params }: { params: { id: string } }) {
  let userRoles: string[] = [];
  let username = "";
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some(r => ALLOWED.has(r))) redirect("/connexion");
    userRoles = profile.roles ?? [];
    username = profile.username;
  } catch { redirect("/connexion"); }

  let insp: Awaited<ReturnType<typeof fetchPNPIInspection>>;
  try {
    insp = await fetchPNPIInspection(params.id);
  } catch { notFound(); }

  const opName = insp.operateur_nom || insp.operateur_id;
  const color = CONF_COLORS[insp.statut_conformite] ?? "#6b7280";
  const bg = CONF_BG[insp.statut_conformite] ?? "#f9fafb";
  const border = CONF_BORDER[insp.statut_conformite] ?? "#e5e7eb";
  const canEdit = userRoles.some(r => ["admin", "directeur"].includes(r)) || insp.inspecteur_username === username;

  return (
    <section className="section">
      {/* Breadcrumb */}
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#6b7280", margin: "0 0.5rem" }}>/</span>
        <Link href="/pnpi/inspections" style={{ color: "#6b7280", textDecoration: "none" }}>Inspections</Link>
        <span style={{ color: "#6b7280", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 600, fontFamily: "monospace" }}>{insp.id}</span>
      </div>

      {/* Header */}
      <div
        className="chart-card"
        style={{ padding: "1.25rem", marginBottom: "1.25rem", background: bg, border: `1px solid ${border}` }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#003F8F", fontSize: "1rem" }}>{insp.id}</span>
              <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", background: `${color}18`, color, fontWeight: 700, fontSize: "0.82rem", border: `1px solid ${color}30` }}>
                {CONF_LABELS[insp.statut_conformite] ?? insp.statut_conformite}
              </span>
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem", color: "#1f2937" }}>
              Inspection de conformite · {opName}
            </p>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
              Effectuee le {new Date(insp.date_inspection).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              {" "}&middot; par <strong>{insp.inspecteur_nom || insp.inspecteur_username}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {canEdit && (
              <Link
                href={`/pnpi/inspections/${insp.id}/modifier`}
                style={{ padding: "0.45rem 0.875rem", background: "#003F8F", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}
              >
                ✎ Modifier
              </Link>
            )}
            <a
              href={`/api/pnpi/inspections/${insp.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: "0.45rem 0.875rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}
            >
              ↓ PDF
            </a>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Left · Info */}
        <div style={{ flex: "1 1 260px" }}>
          <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "0.95rem" }}>Informations</h3>
            <dl style={{ display: "flex", flexDirection: "column", gap: "0.625rem", margin: 0 }}>
              {([
                ["Date d'inspection", new Date(insp.date_inspection).toLocaleDateString("fr-FR")],
                ["Inspecteur", insp.inspecteur_nom || insp.inspecteur_username],
                ["Operateur", opName],
                ["Dossier ATI", insp.ati_numero ?? insp.ati_id ?? "·"],
                ["Province", insp.province || "·"],
                ["Secteur", insp.secteur || "·"],
                ["Resultat", CONF_LABELS[insp.statut_conformite] ?? insp.statut_conformite],
                ["Enregistre le", new Date(insp.created_at).toLocaleDateString("fr-FR")],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderBottom: "1px solid #f3f4f6", paddingBottom: "0.5rem" }}>
                  <dt style={{ fontSize: "0.78rem", color: "#6b7280", flexShrink: 0 }}>{label}</dt>
                  <dd style={{ margin: 0, fontSize: "0.8rem", fontWeight: 500, color: "#1f2937", textAlign: "right" }}>
                    {label === "Dossier ATI" && insp.ati_id ? (
                      <Link href={`/pnpi/ati/${insp.ati_id}`} style={{ color: "#003F8F", fontWeight: 700, textDecoration: "none" }}>{value}</Link>
                    ) : label === "Operateur" ? (
                      <Link href={`/pnpi/operateurs/${insp.operateur_id}`} style={{ color: "#003F8F", fontWeight: 700, textDecoration: "none" }}>{value}</Link>
                    ) : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* GPS */}
          {(insp.latitude != null && insp.longitude != null) && (
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "0.95rem" }}>Localisation GPS</h3>
              <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "8px", fontSize: "0.8rem", color: "#374151", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div><span style={{ color: "#6b7280" }}>Latitude :</span> {insp.latitude.toFixed(6)}°</div>
                <div><span style={{ color: "#6b7280" }}>Longitude :</span> {insp.longitude.toFixed(6)}°</div>
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${insp.latitude}&mlon=${insp.longitude}&zoom=14`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: "0.625rem", padding: "0.35rem 0.75rem", background: "#e0f2fe", color: "#0284c7", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
              >
                Voir sur la carte →
              </a>
            </div>
          )}
        </div>

        {/* Right · Observations & Mesures */}
        <div style={{ flex: "2 1 360px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Observations */}
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "0.95rem" }}>Observations de l&apos;inspecteur</h3>
            <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", borderLeft: `4px solid ${color}`, lineHeight: "1.6", fontSize: "0.875rem", color: "#374151", whiteSpace: "pre-wrap" }}>
              {insp.observations || <span style={{ color: "#6b7280", fontStyle: "italic" }}>Aucune observation enregistree.</span>}
            </div>
          </div>

          {/* Mesures correctives */}
          {insp.mesures_correctives ? (
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", color: "#92400e", fontSize: "0.95rem" }}>Mesures correctives requises</h3>
              <div style={{ padding: "1rem", background: "#fefce8", borderRadius: "8px", borderLeft: "4px solid #f59e0b", lineHeight: "1.6", fontSize: "0.875rem", color: "#374151", whiteSpace: "pre-wrap" }}>
                {insp.mesures_correctives}
              </div>
            </div>
          ) : (
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", color: "#10b981", fontSize: "0.95rem" }}>Mesures correctives</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>
                {insp.statut_conformite === "conforme"
                  ? "Aucune mesure corrective requise · operateur conforme."
                  : "Aucune mesure corrective specifiee."}
              </p>
            </div>
          )}

          {/* Verdict banner */}
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
              {insp.statut_conformite === "conforme" ? "✓" : insp.statut_conformite === "non_conforme" ? "✗" : "⚠"}
            </div>
            <div>
              <div style={{ fontWeight: 700, color, fontSize: "0.95rem" }}>{CONF_LABELS[insp.statut_conformite] ?? insp.statut_conformite}</div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                {insp.statut_conformite === "conforme" && "L'operateur respecte toutes les normes applicables."}
                {insp.statut_conformite === "non_conforme" && "Des non-conformites ont ete constatees. Des mesures correctives sont requises."}
                {insp.statut_conformite === "partiel" && "Des conformites partielles ont ete constatees. Un suivi est recommande."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery inspectionId={insp.id} />
    </section>
  );
}
