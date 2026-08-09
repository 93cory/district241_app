import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { fetchPNPIOperateur, fetchPNPIOperateurATIs, fetchRINProfile, fetchRINProfile360 } from "../../../../lib/api";
import { fetchBackendProfile, backendRequest } from "../../../../lib/backend";
import { ToggleActiveButton } from "./components/ToggleActiveButton";
import { RINDetailsPanel } from "./components/RINDetailsPanel";
import { ScoreCard } from "./ScoreCard";
import { ComplianceTimeline } from "./ComplianceTimeline";

const PNPI_ROLES = new Set([
  "admin",
  "ministre",
  "directeur",
  "instructeur",
  "inspecteur",
  "operateur",
]);
const CAN_TOGGLE = new Set(["admin", "directeur"]);
const CAN_EDIT_RIN = new Set(["admin", "directeur", "instructeur", "operateur"]);
const CAN_VALIDATE_RIN = new Set(["admin", "directeur", "instructeur"]);
const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};
const STATUT_COLORS: Record<string, string> = {
  soumis: "#f59e0b",
  en_instruction: "#3b82f6",
  en_validation: "#8b5cf6",
  approuve: "#10b981",
  rejete: "#ef4444",
  expire: "#9ca3af",
};
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois & Foret",
  mines: "Mines",
  agroalimentaire: "Agro-alimentaire",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};
const SECTEUR_COLORS: Record<string, string> = {
  bois: "#16a34a",
  mines: "#d97706",
  agroalimentaire: "#059669",
  btp: "#2563eb",
  petrole: "#7c3aed",
  services: "#0284c7",
};

const RIN_MODULES = [
  {
    title: "Identité",
    status: "couvert",
    detail: "Raison sociale, NIF, statut, localisation et contacts.",
  },
  {
    title: "Représentants",
    status: "a_enrichir",
    detail: "Dirigeants et responsables HSE/production/RH à modéliser.",
  },
  {
    title: "Sites industriels",
    status: "partiel",
    detail: "Géolocalisation opérateur disponible ; multi-sites à créer.",
  },
  {
    title: "Activités",
    status: "partiel",
    detail: "Secteur et activités ATI disponibles ; nomenclature nationale à formaliser.",
  },
  {
    title: "Produits",
    status: "a_enrichir",
    detail: "Produits fabriqués, normes et marchés d’export à ajouter.",
  },
  {
    title: "Capacités",
    status: "a_enrichir",
    detail: "Capacité théorique/réelle et taux d’utilisation à ajouter.",
  },
  {
    title: "Équipements",
    status: "a_enrichir",
    detail: "Inventaire des équipements et maintenance à ajouter.",
  },
  {
    title: "Effectifs",
    status: "partiel",
    detail: "Effectif déclaré disponible ; ventilation RH à enrichir.",
  },
  {
    title: "Matières premières",
    status: "a_enrichir",
    detail: "Origine, fournisseurs, volumes et dépendance importée à créer.",
  },
  {
    title: "Énergie",
    status: "a_enrichir",
    detail: "Consommation et coût énergétique à collecter.",
  },
  {
    title: "Certifications",
    status: "partiel",
    detail: "Certifications via documents ATI ; registre dédié à créer.",
  },
  {
    title: "Investissements",
    status: "a_enrichir",
    detail: "Historique des investissements et avancement projet à créer.",
  },
  {
    title: "Documents",
    status: "couvert",
    detail: "Coffre documentaire ATI, types requis et versions.",
  },
  {
    title: "Historique",
    status: "couvert",
    detail: "Transitions ATI, inspections et timeline de conformité.",
  },
  {
    title: "Indicateurs",
    status: "partiel",
    detail: "KPI ATI/conformité disponibles ; production/export à connecter.",
  },
] as const;

const RIN_STATUS: Record<
  (typeof RIN_MODULES)[number]["status"],
  { label: string; color: string; bg: string }
> = {
  couvert: { label: "Couvert", color: "#006233", bg: "#ecfdf3" },
  partiel: { label: "Partiel", color: "#d97706", bg: "#fff7ed" },
  a_enrichir: { label: "À enrichir", color: "#526175", bg: "#f8fafc" },
};

function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

export default async function OperateurDetailPage({ params }: { params: { id: string } }) {
  let canToggle = false;
  let canEditRin = false;
  let canValidateRin = false;
  try {
    const profile = await fetchBackendProfile();
    const roles = (profile.roles ?? []) as string[];
    if (!roles.some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
    canToggle = roles.some((r) => CAN_TOGGLE.has(r));
    canEditRin = roles.some((r) => CAN_EDIT_RIN.has(r));
    canValidateRin = roles.some((r) => CAN_VALIDATE_RIN.has(r));
  } catch {
    redirect("/connexion");
  }

  let op: Awaited<ReturnType<typeof fetchPNPIOperateur>>;
  let atis: Awaited<ReturnType<typeof fetchPNPIOperateurATIs>>;
  let rinProfile: Awaited<ReturnType<typeof fetchRINProfile>> | null = null;
  let rin360: Awaited<ReturnType<typeof fetchRINProfile360>> | null = null;
  let inspections: any[] = [];
  try {
    [op, atis] = await Promise.all([
      fetchPNPIOperateur(params.id),
      fetchPNPIOperateurATIs(params.id),
    ]);
  } catch {
    notFound();
  }

  try {
    const inspectionsRes = await backendRequest(
      `/pnpi/inspections?operateur_id=${encodeURIComponent(params.id)}`,
    );
    if (inspectionsRes.ok) inspections = await inspectionsRes.json();
  } catch {
    inspections = [];
  }

  try {
    rinProfile = await fetchRINProfile(params.id);
  } catch {
    rinProfile = null;
  }

  try {
    rin360 = await fetchRINProfile360(params.id);
  } catch {
    rin360 = null;
  }

  let scoreData: any = null;
  try {
    const scoreRes = await backendRequest(
      `/pnpi/operateurs/${encodeURIComponent(params.id)}/score`,
    );
    if (scoreRes.ok) scoreData = await scoreRes.json();
  } catch {
    /* score not available */
  }

  const nbApprouves = atis.filter((a) => a.statut === "approuve").length;
  const nbEnCours = atis.filter((a) =>
    ["soumis", "en_instruction", "en_validation"].includes(a.statut),
  ).length;
  const nbRetard = atis.filter((a) => a.is_overdue).length;
  const nbNonConformes = inspections.filter((i) => i.statut_conformite === "non_conforme").length;
  const nbPartiels = inspections.filter((i) => i.statut_conformite === "partiel").length;
  const tauxApprobation = pct(nbApprouves, atis.filter((a) => ["approuve", "rejete"].includes(a.statut)).length);
  const tauxConformite = pct(
    inspections.filter((i) => i.statut_conformite === "conforme").length,
    inspections.length,
  );
  const modulesCouverts = RIN_MODULES.filter((m) => m.status === "couvert").length;
  const modulesPartiels = RIN_MODULES.filter((m) => m.status === "partiel").length;
  const couvertureRin =
    rin360?.score_360 ?? rinProfile?.score_structuration ?? pct(modulesCouverts + modulesPartiels * 0.5, RIN_MODULES.length);
  const completionAlerts = [
    !op.contact_email && "Email officiel entreprise manquant",
    !op.contact_telephone && "Téléphone officiel manquant",
    op.latitude === null || op.longitude === null ? "Coordonnées GPS du site principal à compléter" : null,
    !op.effectif_declare && "Effectif déclaré non renseigné",
    "Dirigeants et responsables techniques à modéliser",
    "Produits, capacités, matières premières et énergie à collecter",
  ].filter(Boolean);
  const rinCounts = rinProfile
    ? [
        ["Représentants", rinProfile.representants.length],
        ["Sites", rinProfile.sites.length],
        ["Produits", rinProfile.produits.length],
        ["Ressources", rinProfile.ressources.length],
        ["Investissements", rinProfile.investissements.length],
      ]
    : [];
  const secteurColor = SECTEUR_COLORS[op.secteur] ?? "#6b7280";

  return (
    <section className="section">
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>
          Dashboard
        </Link>
        <span style={{ color: "#6b7280", margin: "0 0.5rem" }}>/</span>
        <Link href="/pnpi/operateurs" style={{ color: "#6b7280", textDecoration: "none" }}>
          Operateurs
        </Link>
        <span style={{ color: "#6b7280", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 600 }}>{op.raison_sociale}</span>
      </div>

      {/* Header */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ margin: 0, color: "#003F8F" }}>{op.raison_sociale}</h2>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  background: `${secteurColor}15`,
                  color: secteurColor,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                }}
              >
                {SECTEUR_LABELS[op.secteur] ?? op.secteur}
              </span>
              <span
                style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  background: op.is_active ? "#f0fdf4" : "#f9fafb",
                  color: op.is_active ? "#16a34a" : "#9ca3af",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                }}
              >
                {op.is_active ? "Actif" : "Inactif"}
              </span>
              {canToggle && <ToggleActiveButton operateurId={op.id} isActive={op.is_active} />}
            </div>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
              NIF: <strong style={{ fontFamily: "monospace" }}>{op.nif_gabon}</strong> &middot;{" "}
              {op.ville}, {op.province.replace(/_/g, " ")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#003F8F" }}>
                {atis.length}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase" }}>
                Total ATIs
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
                {nbEnCours}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase" }}>
                En cours
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
                {nbApprouves}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase" }}>
                Approuves
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIN 360 */}
      <div
        className="chart-card"
        style={{
          padding: "1.25rem",
          marginBottom: "1.25rem",
          background:
            "linear-gradient(135deg, rgba(0,98,51,0.08), rgba(12,126,180,0.08) 55%, rgba(242,184,0,0.10))",
          border: "1px solid rgba(0,98,51,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <div
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#006233",
                fontWeight: 800,
                fontSize: "0.72rem",
                marginBottom: "0.35rem",
              }}
            >
              Référentiel Industriel National · Fiche 360°
            </div>
            <h3 style={{ margin: 0, color: "#003F8F", fontSize: "1.15rem" }}>
              Vue unique de l’entreprise industrielle
            </h3>
            <p style={{ margin: "0.45rem 0 0", color: "#526175", fontSize: "0.88rem" }}>
              {rin360?.lecture_executive ??
                "Cette fiche consolide l’identité, les autorisations, les inspections, les documents, les indicateurs et les événements clés. Elle préfigure le RIN complet : une source officielle utilisée par les ATI, les contrôles, les statistiques et les décisions."}
            </p>
          </div>
          <div
            style={{
              minWidth: 180,
              padding: "0.85rem 1rem",
              borderRadius: 16,
              background: "#fff",
              border: "1px solid rgba(0,98,51,0.16)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#526175", fontWeight: 700 }}>
              Couverture RIN actuelle
            </div>
            <div style={{ fontSize: 34, color: "#006233", fontWeight: 900, lineHeight: 1 }}>
              {couvertureRin}%
            </div>
            <div style={{ fontSize: "0.74rem", color: "#526175", marginTop: "0.2rem" }}>
              {rin360 ? `Grade ${rin360.grade} · Risque ${rin360.niveau_risque}` : `${modulesCouverts} modules couverts · ${modulesPartiels} partiels`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.75rem",
            marginTop: "1rem",
          }}
        >
          {[
            ["ATIs", atis.length, "#003F8F", "Autorisations liées"],
            ["Approuvés", nbApprouves, "#006233", `${tauxApprobation}% décisions favorables`],
            ["En cours", nbEnCours, "#3b82f6", "Dossiers actifs"],
            ["Retards", nbRetard, "#d97706", "Alertes SLA"],
            ["Inspections", inspections.length, "#7c3aed", `${tauxConformite}% conformes`],
            ["Anomalies", nbNonConformes + nbPartiels, "#b42318", "Non conformes / partielles"],
            ["Documents", rin360?.stats.documents ?? 0, "#0f766e", "Preuves rattachées"],
            ["ONI", rin360?.stats.declarations_oni ?? 0, "#7c3aed", "Déclarations statistiques"],
          ].map(([label, value, color, hint]) => (
            <div
              key={label as string}
              style={{
                padding: "0.85rem",
                background: "#fff",
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div style={{ color: color as string, fontSize: 24, fontWeight: 900 }}>{value}</div>
              <div style={{ fontWeight: 800, color: "#1f2937", fontSize: "0.78rem" }}>{label}</div>
              <div style={{ color: "#6b7280", fontSize: "0.7rem", marginTop: 2 }}>{hint}</div>
            </div>
          ))}
        </div>

        {rin360 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "0.85rem",
              marginTop: "1rem",
            }}
          >
            {Object.entries(rin360.synthese).map(([key, value]) => (
              <div key={key} style={{ padding: "0.85rem", background: "#fff", borderRadius: 14, border: "1px solid rgba(15,23,42,0.08)" }}>
                <strong style={{ color: "#003F8F", textTransform: "capitalize", fontSize: "0.82rem" }}>
                  {key.replaceAll("_", " ")}
                </strong>
                <p style={{ margin: "0.35rem 0 0", color: "#526175", fontSize: "0.78rem", lineHeight: 1.5 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {rin360 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>Décisions possibles</h3>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {rin360.decisions_possibles.map((item) => (
                <div key={item.decision} style={{ padding: "0.75rem", borderRadius: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                  <strong style={{ color: "#111827" }}>{item.decision} · {item.lecture}</strong>
                  <p style={{ margin: "0.3rem 0 0", color: "#526175", fontSize: "0.78rem", lineHeight: 1.5 }}>{item.justification}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>Risques et vigilances</h3>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {rin360.risques.length ? (
                rin360.risques.map((risk) => (
                  <div key={risk.titre} style={{ padding: "0.75rem", borderRadius: 12, background: risk.niveau === "élevé" ? "#fff1f2" : "#fff7ed", border: "1px solid #fed7aa" }}>
                    <strong style={{ color: risk.niveau === "élevé" ? "#b42318" : "#92400e" }}>{risk.titre} · {risk.niveau}</strong>
                    <p style={{ margin: "0.3rem 0 0", color: "#526175", fontSize: "0.78rem", lineHeight: 1.5 }}>{risk.detail}</p>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem" }}>Aucune vigilance critique détectée.</p>
              )}
            </div>
          </div>

          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>Actions prioritaires</h3>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {rin360.actions_prioritaires.map((item) => (
                <div key={item.action} style={{ borderLeft: "4px solid #009440", paddingLeft: "0.75rem" }}>
                  <strong style={{ color: "#006233", fontSize: "0.8rem" }}>{item.priorite}</strong>
                  <p style={{ margin: "0.2rem 0 0", color: "#526175", fontSize: "0.78rem", lineHeight: 1.5 }}>{item.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {rin360 && (
        <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1rem" }}>
            Timeline 360° consolidée
          </h3>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {rin360.timeline.slice(0, 8).map((event) => {
              const color = event.niveau === "alerte" ? "#b42318" : event.niveau === "positif" ? "#006233" : "#0c7eb4";
              return (
                <div key={`${event.type}-${event.date}-${event.titre}`} style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: "0.75rem", alignItems: "start" }}>
                  <div style={{ color: "#6b7280", fontSize: "0.74rem", fontWeight: 800 }}>
                    {new Date(event.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: "0.75rem" }}>
                    <strong style={{ color }}>{event.type} · {event.titre}</strong>
                    <p style={{ margin: "0.2rem 0 0", color: "#526175", fontSize: "0.78rem", lineHeight: 1.5 }}>
                      {event.detail}
                    </p>
                  </div>
                </div>
              );
            })}
            {!rin360.timeline.length && (
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem" }}>Aucun événement consolidé pour le moment.</p>
            )}
          </div>
        </div>
      )}

      {/* RIN modules */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "0.9rem",
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>
              Les 15 sous-modules du RIN
            </h3>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
              Lecture rapide : ce que la plateforme couvre déjà et ce qui doit être enrichi pour
              atteindre la fiche industrielle nationale complète.
            </p>
          </div>
          <Link
            href="/pnpi/operateurs"
            style={{
              textDecoration: "none",
              color: "#006233",
              fontSize: "0.78rem",
              fontWeight: 800,
            }}
          >
            Registre national →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {RIN_MODULES.map((module) => {
            const meta = RIN_STATUS[module.status];
            return (
              <div
                key={module.title}
                style={{
                  padding: "0.85rem",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: meta.bg,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong style={{ color: "#1f2937", fontSize: "0.82rem" }}>{module.title}</strong>
                  <span
                    style={{
                      color: meta.color,
                      background: "#fff",
                      borderRadius: 999,
                      padding: "0.1rem 0.45rem",
                      fontSize: "0.66rem",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p style={{ margin: "0.45rem 0 0", color: "#526175", fontSize: "0.73rem" }}>
                  {module.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structured RIN data */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: "0.9rem",
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>
              Données structurées RIN
            </h3>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
              Sous-fiches désormais modélisées dans la base : représentants, sites, produits,
              ressources et investissements.
            </p>
          </div>
          <Link
            href="/pnpi/rin"
            style={{
              textDecoration: "none",
              color: "#006233",
              fontSize: "0.78rem",
              fontWeight: 800,
            }}
          >
            Cockpit RIN →
          </Link>
        </div>

        {rinProfile ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {rinCounts.map(([label, value]) => (
                <div
                  key={label as string}
                  style={{
                    padding: "0.8rem",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ color: "#003F8F", fontSize: 23, fontWeight: 900 }}>{value}</div>
                  <div style={{ color: "#526175", fontSize: "0.74rem", fontWeight: 800 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "0.85rem",
              }}
            >
              <div style={{ padding: "0.9rem", borderRadius: 14, background: "#ecfdf3" }}>
                <strong style={{ color: "#006233", fontSize: "0.82rem" }}>Site principal</strong>
                <p style={{ margin: "0.35rem 0 0", color: "#526175", fontSize: "0.76rem" }}>
                  {rinProfile.sites[0]
                    ? `${rinProfile.sites[0].nom_site} · ${rinProfile.sites[0].ville}`
                    : "Aucun site RIN saisi pour l’instant."}
                </p>
              </div>
              <div style={{ padding: "0.9rem", borderRadius: 14, background: "#eff6ff" }}>
                <strong style={{ color: "#0c7eb4", fontSize: "0.82rem" }}>Produit / capacité</strong>
                <p style={{ margin: "0.35rem 0 0", color: "#526175", fontSize: "0.76rem" }}>
                  {rinProfile.produits[0]
                    ? `${rinProfile.produits[0].nom_produit} · capacité ${
                        rinProfile.produits[0].capacite_annuelle?.toLocaleString("fr-FR") ?? "n/r"
                      } ${rinProfile.produits[0].unite}/an`
                    : "Aucun produit industriel saisi pour l’instant."}
                </p>
              </div>
              <div style={{ padding: "0.9rem", borderRadius: 14, background: "#fff7ed" }}>
                <strong style={{ color: "#d97706", fontSize: "0.82rem" }}>Prochaines données</strong>
                <p style={{ margin: "0.35rem 0 0", color: "#526175", fontSize: "0.76rem" }}>
                  {rinProfile.manques.slice(0, 2).join(" · ") || "Fiche RIN structurée et exploitable."}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem" }}>
            Le profil RIN structuré sera disponible après application de la migration backend.
          </p>
        )}
      </div>

      <RINDetailsPanel
        operateurId={params.id}
        profile={rinProfile}
        canEdit={canEditRin}
        canValidate={canValidateRin}
      />

      {/* Priority gaps */}
      <div
        className="chart-card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem",
          borderLeft: "4px solid #d97706",
        }}
      >
        <h3 style={{ margin: "0 0 0.65rem", color: "#92400e", fontSize: "0.95rem" }}>
          Données prioritaires à compléter pour un RIN supérieur
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {completionAlerts.map((alert) => (
            <span
              key={alert as string}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: 999,
                background: "#fff7ed",
                color: "#92400e",
                border: "1px solid #fed7aa",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {alert}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Info */}
        <div style={{ flex: "1 1 260px" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "0.95rem" }}>
              Fiche operateur
            </h3>
            <dl style={{ display: "flex", flexDirection: "column", gap: "0.625rem", margin: 0 }}>
              {[
                ["Raison sociale", op.raison_sociale],
                ["NIF Gabon", op.nif_gabon],
                ["Secteur", SECTEUR_LABELS[op.secteur] ?? op.secteur],
                ["Province", op.province.replace(/_/g, " ")],
                ["Ville", op.ville],
                [
                  "Effectif declare",
                  op.effectif_declare
                    ? `${op.effectif_declare.toLocaleString("fr-FR")} employes`
                    : "Non renseigne",
                ],
                ["Email", op.contact_email ?? "·"],
                ["Telephone", op.contact_telephone ?? "·"],
                ["Enregistre par", op.created_by ?? "·"],
                ["Date enregistrement", new Date(op.created_at).toLocaleDateString("fr-FR")],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <dt style={{ fontSize: "0.78rem", color: "#6b7280", flexShrink: 0 }}>{label}</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: "#1f2937",
                      textAlign: "right",
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {scoreData && !scoreData.error && (
            <div style={{ marginTop: "1.25rem" }}>
              <ScoreCard data={scoreData} />
            </div>
          )}
          <div style={{ marginTop: "1.25rem" }}>
            <ComplianceTimeline operateurId={params.id} />
          </div>
        </div>

        {/* ATIs */}
        <div style={{ flex: "2 1 380px" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "0.95rem" }}>
              Dossiers ATI ({atis.length})
            </h3>
            {atis.length === 0 ? (
              <p style={{ color: "#6b7280", margin: 0 }}>Aucun dossier ATI pour cet operateur.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {atis.map((ati) => (
                  <Link
                    key={ati.id}
                    href={`/pnpi/ati/${ati.id}`}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        background: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #f3f4f6",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#003F8F",
                            fontSize: "0.8rem",
                          }}
                        >
                          {ati.numero_ati}
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.5rem",
                              borderRadius: "999px",
                              background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`,
                              color: STATUT_COLORS[ati.statut] ?? "#6b7280",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          >
                            {STATUT_LABELS[ati.statut] ?? ati.statut}
                          </span>
                          {ati.is_overdue && (
                            <span
                              style={{
                                padding: "0.1rem 0.35rem",
                                borderRadius: "4px",
                                background: "#fef3c7",
                                color: "#d97706",
                                fontWeight: 700,
                                fontSize: "0.65rem",
                              }}
                            >
                              RETARD
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#374151" }}>
                        {ati.type_activite.slice(0, 80)}
                        {ati.type_activite.length > 80 ? "..." : ""}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.2rem" }}>
                        Soumis le {new Date(ati.date_soumission).toLocaleDateString("fr-FR")}{" "}
                        &middot; {ati.age_jours} j &middot; Priorite:{" "}
                        <strong style={{ textTransform: "capitalize" }}>{ati.priorite}</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
