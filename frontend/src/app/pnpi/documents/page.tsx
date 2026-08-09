import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchDocumentsCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur"]);

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  ok: { color: "#006233", bg: "#dcfce7", label: "Maîtrisé" },
  warning: { color: "#b45309", bg: "#fef3c7", label: "À surveiller" },
  critical: { color: "#b42318", bg: "#fef2f2", label: "Critique" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#b45309",
  D: "#b42318",
};

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const normalize = (value: string) => value.replaceAll("_", " ");

export default async function DocumentsPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchDocumentsCockpit();
  const gradeColor = GRADE_COLORS[cockpit.grade] || "#526175";

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>FAM-DOC-001 · COFFRE DOCUMENTAIRE</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Coffre documentaire, preuves et archivage ATI</h1>
      <p style={{ color: "#4b5563", maxWidth: 960 }}>{cockpit.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem" }}>
        <Panel title="Score coffre documentaire">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: `${gradeColor}14`,
                border: `5px solid ${gradeColor}`,
                color: gradeColor,
                fontSize: "2rem",
                fontWeight: 950,
              }}
            >
              {cockpit.grade}
            </div>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 950, color: gradeColor }}>
                {cockpit.score_coffre}/100
              </div>
              <p style={{ margin: 0, color: "#6b7280" }}>Complétude, intégrité, versioning et preuves conservées.</p>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Documents" value={formatNumber(cockpit.stats.documents)} color="#003F8F" />
          <Kpi label="ATI complets" value={formatNumber(cockpit.stats.atis_complets)} color="#009440" />
          <Kpi label="Volume" value={`${formatNumber(cockpit.stats.taille_totale_mo)} Mo`} color="#7c3aed" />
          <Kpi label="Versions" value={formatNumber(cockpit.stats.versions)} color="#b45309" />
          <Kpi label="Preuves verrouillées" value={formatNumber(cockpit.stats.preuves_verrouillees)} color="#0f766e" />
          <Kpi label="Orphelins" value={formatNumber(cockpit.stats.documents_orphelins)} color="#b42318" />
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <Panel title="Contrôles du coffre">
          {cockpit.scores.map((score) => (
            <ProgressLine
              key={score.label}
              label={score.label}
              score={score.score}
              hint={score.description}
              status={score.status}
            />
          ))}
        </Panel>

        <Panel title="Classification documentaire">
          {cockpit.par_classification.map((item) => (
            <Line key={item.classification} label={item.classification} value={formatNumber(item.count)} />
          ))}
        </Panel>

        <Panel title="Pièces les plus manquantes">
          {cockpit.pieces_manquantes.length === 0 ? (
            <p style={{ margin: 0, color: "#006233" }}>Aucune pièce requise manquante détectée.</p>
          ) : (
            cockpit.pieces_manquantes.map((item) => (
              <Line key={item.type_document} label={item.type_document} value={formatNumber(item.count)} />
            ))
          )}
        </Panel>
      </div>

      <Panel title="Dossiers prioritaires à régulariser" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {cockpit.dossiers_prioritaires.map((dossier) => (
            <div key={dossier.ati_id} style={boxStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#111827" }}>{dossier.numero_ati}</strong>
                  <p style={{ margin: "0.2rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
                    {dossier.operateur} · {dossier.type_demande} · {dossier.statut}
                  </p>
                </div>
                <Link href={`/pnpi/ati/${dossier.ati_id}`} className="btn-secondary">
                  Ouvrir ATI
                </Link>
              </div>
              <p style={{ margin: "0.45rem 0 0", color: dossier.missing.length ? "#b42318" : "#006233", fontSize: "0.84rem" }}>
                {dossier.missing.length
                  ? `Pièces manquantes : ${dossier.missing.map(normalize).join(", ")}`
                  : "Dossier documentaire complet."}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Anomalies documentaires">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.anomalies.map((item) => {
              const style = STATUS_STYLES[item.severity] || STATUS_STYLES.warning;
              return (
                <div key={item.title} style={{ ...boxStyle, borderColor: style.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <strong style={{ color: style.color }}>{item.title}</strong>
                    <span style={{ ...badgeStyle, background: style.bg, color: style.color }}>{formatNumber(item.count)}</span>
                  </div>
                  <p style={{ margin: "0.25rem 0", color: "#4b5563", fontSize: "0.83rem" }}>{item.detail}</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem" }}>Action : {item.action}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Documents par type">
          {cockpit.par_type.map((item) => (
            <Line key={item.type_document} label={item.type_document} value={formatNumber(item.count)} />
          ))}
        </Panel>

        <Panel title="Agents / opérateurs ayant déposé">
          {cockpit.top_uploadeurs.map((item) => (
            <Line key={item.username} label={item.username} value={formatNumber(item.count)} />
          ))}
        </Panel>
      </div>

      <Panel title="Principes de preuve administrative" style={{ marginTop: "1rem" }}>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
          {cockpit.principes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.35rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="chart-card" style={{ padding: "1rem", ...style }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>{title}</h2>
      {children}
    </div>
  );
}

function ProgressLine({ label, score, hint, status }: { label: string; score: number; hint: string; status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.warning;
  return (
    <div style={{ padding: "0.55rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <strong style={{ color: "#111827" }}>{label}</strong>
          <p style={{ margin: "0.18rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{hint}</p>
        </div>
        <span style={{ ...badgeStyle, color: style.color, background: style.bg }}>
          {style.label} · {score}%
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "#edf2f7", marginTop: "0.45rem", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: style.color }} />
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.62rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <strong style={{ color: "#111827", textTransform: "capitalize" }}>{normalize(label)}</strong>
      <span style={{ color: "#003F8F", fontWeight: 900 }}>{value}</span>
    </div>
  );
}

const badgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: "0.28rem 0.55rem",
  fontSize: "0.72rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const boxStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.75rem",
  background: "#f8fafc",
};
