export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Open Data — PNPI · Plateforme Nationale de Pilotage Industriel",
  description:
    "Statistiques publiques agrégées et anonymisées de l'activité industrielle nationale du Gabon.",
};

interface PublicStats {
  generated_at: string;
  totaux: {
    operateurs_actifs: number;
    atis_total: number;
    atis_approuves: number;
    atis_en_cours: number;
    inspections_total: number;
    inspections_conformes: number;
  };
  indicateurs: {
    delai_moyen_jours: number | null;
    taux_approbation_pct: number | null;
    taux_conformite_inspections_pct: number | null;
  };
  repartitions: {
    par_secteur: { secteur: string; total: number }[];
    par_province: { province: string; total: number }[];
    par_annee: { annee: number; soumis: number; approuve: number; rejete: number }[];
  };
  licence: string;
  source: string;
}

async function fetchStats(): Promise<PublicStats | null> {
  try {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/open-data/stats`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicStats;
  } catch {
    return null;
  }
}

function fmtPct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)} %`;
}

function fmtDelai(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)} j`;
}

const CARD_BASE = {
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
} as const;

const AUTH_COLORS: Record<string, { bg: string; fg: string }> = {
  Public: { bg: "#dcfce7", fg: "#006233" },
  Admin: { bg: "#fef2f2", fg: "#b42318" },
  JWT: { bg: "#e0f2fe", fg: "#0c7eb4" },
};

export default async function OpenDataPage() {
  const stats = await fetchStats();
  const t = stats?.totaux;
  const i = stats?.indicateurs;
  const r = stats?.repartitions;

  const maxSecteur = Math.max(1, ...(r?.par_secteur ?? []).map((s) => s.total));
  const maxProvince = Math.max(1, ...(r?.par_province ?? []).map((p) => p.total));
  const maxAnnee = Math.max(1, ...(r?.par_annee ?? []).map((a) => a.soumis));

  const datasets = [
    {
      name: "Statistiques agrégées (cette page)",
      format: "JSON",
      endpoint: "/open-data/stats",
      desc: "Indicateurs publics anonymisés mis à jour en continu.",
      auth: "Public",
    },
    {
      name: "Vérification d'un agrément ATI",
      format: "JSON",
      endpoint: "/pnpi/ati/verify/{numero}",
      desc: "Vérification publique d'un agrément par son numéro.",
      auth: "Public",
    },
    {
      name: "Statut système",
      format: "JSON",
      endpoint: "/health/status",
      desc: "État opérationnel de la plateforme.",
      auth: "Public",
    },
    {
      name: "Liste des secteurs (volumes)",
      format: "JSON",
      endpoint: "/open-data/sectors",
      desc: "Répartition agrégée des ATI par secteur d'activité.",
      auth: "Public",
    },
    {
      name: "Liste des provinces (volumes)",
      format: "JSON",
      endpoint: "/open-data/provinces",
      desc: "Répartition agrégée des opérateurs par province.",
      auth: "Public",
    },
    {
      name: "Annuaire des opérateurs (Excel)",
      format: "XLSX",
      endpoint: "/exports/operateurs.xlsx",
      desc: "Annuaire complet des opérateurs industriels (réservé aux agents).",
      auth: "JWT",
    },
    {
      name: "Cartographie des opérateurs (GeoJSON)",
      format: "GeoJSON",
      endpoint: "/geo/export.geojson",
      desc: "Liste géoréférencée des opérateurs (réservée aux agents).",
      auth: "JWT",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "Manrope, system-ui, sans-serif",
        background: "#f7f9fc",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #051B36, #0C7EB4)",
          color: "#fff",
          padding: "48px 32px 64px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Plateforme Nationale de Pilotage Industriel
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
          Open Data
        </h1>
        <p
          style={{ fontSize: 16, opacity: 0.85, maxWidth: 640, margin: "0 auto", lineHeight: 1.55 }}
        >
          Transparence du service public industriel. Indicateurs anonymisés et agrégés issus de
          l'activité réelle de la plateforme PNPI.
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: "-40px auto 60px", padding: "0 24px" }}>
        {!stats && (
          <div
            style={{
              padding: "20px 24px",
              borderRadius: 14,
              background: "#fff",
              border: "1px solid #fde68a",
              borderLeft: "4px solid #d97706",
              marginBottom: 24,
              fontSize: 14,
              color: "#92400e",
            }}
          >
            Statistiques temporairement indisponibles. Les jeux de données restent accessibles via
            les endpoints listés ci-dessous.
          </div>
        )}

        {/* KPI cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Opérateurs actifs", value: t?.operateurs_actifs ?? 0, accent: "#003DA5" },
            { label: "Agréments ATI", value: t?.atis_total ?? 0, accent: "#009E60" },
            { label: "ATI approuvés", value: t?.atis_approuves ?? 0, accent: "#10b981" },
            { label: "ATI en cours", value: t?.atis_en_cours ?? 0, accent: "#0c7eb4" },
            { label: "Inspections", value: t?.inspections_total ?? 0, accent: "#7c3aed" },
            {
              label: "Délai moyen",
              value: fmtDelai(i?.delai_moyen_jours ?? null),
              accent: "#0891b2",
            },
            {
              label: "Taux d'approbation",
              value: fmtPct(i?.taux_approbation_pct ?? null),
              accent: "#16a34a",
            },
            {
              label: "Inspections conformes",
              value: fmtPct(i?.taux_conformite_inspections_pct ?? null),
              accent: "#0d9488",
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                ...CARD_BASE,
                padding: "20px 18px",
                borderTop: `3px solid ${k.accent}`,
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: k.accent, lineHeight: 1.1 }}>
                {k.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#526175",
                  marginTop: 6,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* Repartitions: secteur, province, annee */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <ChartCard
            title="Répartition par secteur"
            data={r?.par_secteur ?? []}
            max={maxSecteur}
            keyName="secteur"
            valueName="total"
            color="#009E60"
          />
          <ChartCard
            title="Répartition par province"
            data={r?.par_province ?? []}
            max={maxProvince}
            keyName="province"
            valueName="total"
            color="#003DA5"
          />
        </div>

        {/* Annee timeline */}
        {r?.par_annee && r.par_annee.length > 0 && (
          <div
            style={{
              ...CARD_BASE,
              padding: "24px 24px 12px",
              marginBottom: 28,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: "#051B36" }}>
              Activité ATI par année
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 14,
                height: 180,
                padding: "0 8px",
              }}
            >
              {r.par_annee.map((a) => (
                <div
                  key={a.annee}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#526175" }}>{a.soumis}</div>
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      height: 130,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${(a.soumis / maxAnnee) * 100}%`,
                        background: "linear-gradient(to top, #003DA5, #0c7eb4)",
                        borderRadius: "6px 6px 0 0",
                        position: "relative",
                      }}
                    >
                      {a.approuve > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: `${(a.approuve / Math.max(1, a.soumis)) * 100}%`,
                            background: "linear-gradient(to top, #009E60, #10b981)",
                            borderRadius: "0 0 0 0",
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#051B36" }}>{a.annee}</div>
                </div>
              ))}
            </div>
            <div
              style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11, color: "#526175" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, background: "#009E60", borderRadius: 3 }} />
                Approuvés
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, background: "#003DA5", borderRadius: 3 }} />
                Soumis (total)
              </span>
            </div>
          </div>
        )}

        {/* Datasets list */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: "#051B36" }}>
          Jeux de données disponibles
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {datasets.map((ds) => {
            const authStyle = AUTH_COLORS[ds.auth] ?? AUTH_COLORS.JWT;
            return (
              <div
                key={ds.endpoint}
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 280px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#051B36" }}>{ds.name}</div>
                  <div style={{ fontSize: 12, color: "#526175", marginTop: 3 }}>{ds.desc}</div>
                  <code
                    style={{
                      fontSize: 11,
                      color: "#0c7eb4",
                      marginTop: 6,
                      display: "inline-block",
                    }}
                  >
                    {ds.endpoint}
                  </code>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    background: authStyle.bg,
                    color: authStyle.fg,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {ds.auth}
                </span>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    background: "#f3f4f6",
                    fontFamily: "monospace",
                    color: "#374151",
                  }}
                >
                  {ds.format}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "20px 24px",
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#526175",
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: "#051B36" }}>Licence :</strong>{" "}
          {stats?.licence ?? "Open Data Gabon · données publiques agrégées"}. Les données
          personnelles et sensibles (NIF, raisons sociales nominatives, effectifs précis) ne sont
          jamais exposées sur cette page.
          <br />
          <strong style={{ color: "#051B36" }}>API :</strong> documentation technique disponible sur{" "}
          <a href="/api-docs" style={{ color: "#009E60", fontWeight: 600 }}>
            /api-docs
          </a>{" "}
          (Swagger / OpenAPI).
          <br />
          {stats?.generated_at && (
            <>
              <strong style={{ color: "#051B36" }}>Dernière mise à jour :</strong>{" "}
              {new Date(stats.generated_at).toLocaleString("fr-FR")}
            </>
          )}
        </div>
      </div>

      <div
        style={{
          background: "#051B36",
          color: "rgba(255,255,255,0.7)",
          padding: "20px 16px",
          textAlign: "center",
          fontSize: 11,
          letterSpacing: "0.04em",
        }}
      >
        Ministère de l&apos;Industrie et de la Transformation Locale · République Gabonaise · PNPI{" "}
        {new Date().getFullYear()}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  max,
  keyName,
  valueName,
  color,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  max: number;
  keyName: string;
  valueName: string;
  color: string;
}) {
  return (
    <div style={{ ...CARD_BASE, padding: "20px 22px" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#051B36" }}>{title}</h3>
      {data.length === 0 ? (
        <div style={{ fontSize: 12, color: "#94a3b8", padding: "12px 0" }}>
          Pas encore de donnée.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.slice(0, 8).map((d) => {
            const k = String(d[keyName]);
            const v = Number(d[valueName]);
            const pct = (v / max) * 100;
            return (
              <div
                key={k}
                role="img"
                aria-label={`${k} : ${v} sur un total maximum de ${max}`}
                style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}
              >
                <div
                  style={{
                    width: 100,
                    color: "#526175",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {k}
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    height: 18,
                    background: "#f1f5f9",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: color,
                      borderRadius: 6,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <div style={{ width: 36, textAlign: "right", fontWeight: 700, color: "#051B36" }}>
                  {v}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
