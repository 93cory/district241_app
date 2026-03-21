import { backendRequest } from "../../../lib/backend";
import { fetchBackendProfile } from "../../../lib/backend";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "directeur", "instructeur"]);

export default async function MesDossiersPage() {
  let username = "";
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
    username = profile.username;
  } catch {
    redirect("/connexion");
  }

  let atis: any[] = [];
  let error = "";

  try {
    const res = await backendRequest("/pnpi/ati?assigned_to_me=true", { cache: "no-store" });
    if (res.ok) atis = await res.json();
    else error = "Impossible de charger vos dossiers.";
  } catch {
    error = "Erreur de connexion.";
  }

  const urgent = atis.filter((a: any) => a.is_overdue);
  const enCours = atis.filter((a: any) => !a.is_overdue && a.statut !== "approuve" && a.statut !== "rejete" && a.statut !== "expire");
  const decides = atis.filter((a: any) => a.statut === "approuve" || a.statut === "rejete");

  const statusColors: Record<string, string> = {
    soumis: "#f2b800",
    en_instruction: "#0d3f78",
    en_validation: "#0c7eb4",
    approuve: "#006233",
    rejete: "#b42318",
    expire: "#526175",
  };

  const renderATI = (ati: any) => (
    <Link
      key={ati.id}
      href={`/pnpi/ati/${ati.id}`}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px", borderRadius: 14,
        background: "var(--bg-layer, #fff)",
        border: `1.5px solid ${ati.is_overdue ? "#fecaca" : "var(--line, #dce4ef)"}`,
        textDecoration: "none", color: "inherit",
        transition: "all 180ms ease",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{ati.numero_ati}</div>
        <div style={{ fontSize: 12, color: "var(--text-soft, #526175)", marginTop: 2 }}>
          {ati.type_activite?.slice(0, 60)} — {ati.secteur}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>
          J+{ati.age_jours}
        </span>
        <span style={{
          padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
          color: "#fff", background: statusColors[ati.statut] || "#526175",
        }}>
          {ati.statut}
        </span>
        {ati.is_overdue && (
          <span style={{ padding: "4px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#b42318", border: "1px solid #fecaca" }}>
            SLA
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>
          &larr; Dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Mes Dossiers</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 24px" }}>
        Dossiers ATI qui vous sont assignes ({username})
      </p>

      {error && <div style={{ padding: 14, borderRadius: 12, background: "#fff5f5", color: "#b42318", marginBottom: 16 }}>{error}</div>}

      {urgent.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#b42318", margin: "0 0 10px" }}>
            Urgent — SLA depasse ({urgent.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgent.map(renderATI)}
          </div>
        </section>
      )}

      {enCours.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>
            En cours ({enCours.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {enCours.map(renderATI)}
          </div>
        </section>
      )}

      {decides.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-soft, #526175)", margin: "0 0 10px" }}>
            Decides ({decides.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decides.map(renderATI)}
          </div>
        </section>
      )}

      {atis.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-soft, #526175)" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Aucun dossier assigne pour le moment.</p>
        </div>
      )}
    </div>
  );
}
