import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIHistorique } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { HistoriqueFiltersClient } from "./components/HistoriqueFiltersClient";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const STATUT_COLORS: Record<string, string> = {
  soumis: "#f59e0b",
  en_instruction: "#3b82f6",
  en_validation: "#8b5cf6",
  approuve: "#10b981",
  rejete: "#ef4444",
  expire: "#9ca3af",
};

const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};

type SearchParams = {
  acteur?: string;
  date_from?: string;
  date_to?: string;
  ati_numero?: string;
  action_type?: string;
  page?: string;
};

function statutBadge(statut: string | null) {
  if (!statut) return <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>--</span>;
  const color = STATUT_COLORS[statut] ?? "#6b7280";
  return (
    <span
      style={{
        padding: "0.15rem 0.5rem",
        borderRadius: "999px",
        background: `${color}18`,
        color,
        fontWeight: 700,
        fontSize: "0.72rem",
        whiteSpace: "nowrap",
      }}
    >
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

const PAGE_SIZE = 50;

export default async function HistoriquePage({ searchParams }: { searchParams: SearchParams }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const acteur = searchParams.acteur ?? "";
  const dateFrom = searchParams.date_from ?? "";
  const dateTo = searchParams.date_to ?? "";
  const atiNumero = searchParams.ati_numero ?? "";
  const actionType = searchParams.action_type ?? "";
  const currentPage = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  try {
    const entries = await fetchPNPIHistorique({
      changed_by: acteur || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      ati_numero: atiNumero || undefined,
      limit: 500,
    });

    // Client-side filter by action_type (new_statut) if specified
    let filtered = entries;
    if (actionType) {
      filtered = entries.filter((e) => e.new_statut === actionType);
    }

    // Pagination
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedEntries = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // KPI computations
    const totalTransitions = filtered.length;
    const uniqueActors = new Set(filtered.map((e) => e.changed_by)).size;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const transitionsToday = filtered.filter((e) => e.changed_at.slice(0, 10) === todayStr).length;

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const transitionsWeek = filtered.filter((e) => new Date(e.changed_at) >= weekAgo).length;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

    // Build pagination links
    const buildPageUrl = (page: number) => {
      const params = new URLSearchParams();
      if (acteur) params.set("acteur", acteur);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (atiNumero) params.set("ati_numero", atiNumero);
      if (actionType) params.set("action_type", actionType);
      params.set("page", String(page));
      return `/pnpi/historique?${params.toString()}`;
    };

    return (
      <section className="section">
        {/* Breadcrumb + export */}
        <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>
            &larr; Dashboard
          </Link>
          <a
            href={`${backendUrl}/pnpi/exports/pilotage-transitions.csv`}
            style={{
              padding: "0.35rem 0.7rem",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              color: "#374151",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            &darr; CSV
          </a>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#003F8F" }}>{totalTransitions}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Total transitions</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#8b5cf6" }}>{uniqueActors}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Acteurs uniques</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981" }}>{transitionsToday}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Aujourd&apos;hui</div>
          </div>
          <div className="chart-card" style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#3b82f6" }}>{transitionsWeek}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Cette semaine</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ margin: "0 0 0.25rem", color: "#003F8F" }}>Historique des transitions ATI</h2>
            <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
              {totalTransitions} transition(s) &middot; {uniqueActors} acteur(s)
            </p>
            <HistoriqueFiltersClient
              acteur={acteur}
              dateFrom={dateFrom}
              dateTo={dateTo}
              atiNumero={atiNumero}
              actionType={actionType}
            />
          </div>

          {paginatedEntries.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem 0" }}>Aucune transition avec ces filtres.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {paginatedEntries.map((entry, idx) => {
                const dt = new Date(entry.changed_at);
                const dateStr = dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                const timeStr = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                const hasStageChange = entry.previous_etape || entry.new_etape;

                return (
                  <div key={entry.id} style={{ display: "flex", gap: "1rem", position: "relative" }}>
                    {/* Timeline bar */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "20px" }}>
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: STATUT_COLORS[entry.new_statut ?? ""] ?? "#6b7280",
                          border: "2px solid #fff",
                          boxShadow: "0 0 0 2px " + (STATUT_COLORS[entry.new_statut ?? ""] ?? "#6b7280"),
                          marginTop: "0.5rem",
                          flexShrink: 0,
                        }}
                      />
                      {idx < paginatedEntries.length - 1 && (
                        <div style={{ width: "2px", flex: 1, background: "#e5e7eb", minHeight: "2rem" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ paddingBottom: "1.25rem", flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {dateStr} {timeStr}
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginTop: "0.15rem" }}>
                            {entry.changed_by}
                          </div>
                        </div>
                        <Link
                          href="/pnpi/ati"
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#003F8F",
                            fontSize: "0.75rem",
                            textDecoration: "none",
                            background: "#eff6ff",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {entry.ati_id}
                        </Link>
                      </div>

                      {/* Status change */}
                      <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        {statutBadge(entry.previous_statut)}
                        <span style={{ color: "#9ca3af", fontSize: "0.8rem", fontWeight: 700 }}>&rarr;</span>
                        {statutBadge(entry.new_statut)}
                      </div>

                      {/* Stage change */}
                      {hasStageChange && (
                        <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "#6b7280" }}>
                          Etape : {entry.previous_etape ?? "--"} &rarr; {entry.new_etape ?? "--"}
                        </div>
                      )}

                      {/* Note */}
                      {entry.note && (
                        <div
                          style={{
                            marginTop: "0.4rem",
                            padding: "0.4rem 0.65rem",
                            background: "#f9fafb",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            color: "#374151",
                            borderLeft: "3px solid #e5e7eb",
                          }}
                        >
                          {entry.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
              {safePage > 1 && (
                <Link
                  href={buildPageUrl(safePage - 1)}
                  style={{ padding: "0.35rem 0.7rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151", textDecoration: "none", fontWeight: 600 }}
                >
                  &larr; Precedent
                </Link>
              )}
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                Page {safePage} / {totalPages} ({totalFiltered} resultats)
              </span>
              {safePage < totalPages && (
                <Link
                  href={buildPageUrl(safePage + 1)}
                  style={{ padding: "0.35rem 0.7rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151", textDecoration: "none", fontWeight: 600 }}
                >
                  Suivant &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2>
          <p style={{ color: "#b42318" }}>{msg}</p>
        </div>
      </section>
    );
  }
}
