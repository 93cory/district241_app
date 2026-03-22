export const dynamic = "force-dynamic";

interface Props { params: Promise<{ nif: string }>; }

export default async function VerifyOperateurPage({ params }: Props) {
  const { nif } = await params;
  let data: any = null;
  let error = "";

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/integration/verify-operateur/${encodeURIComponent(nif)}`, {
      headers: { "X-Api-Key": process.env.PNPI_INTERNAL_KEY || "internal", "X-System-Id": "dgdi" },
      cache: "no-store",
    });
    if (res.ok) data = await res.json();
    else error = "Operateur introuvable.";
  } catch { error = "Service indisponible."; }

  if (!data?.found) error = error || "Aucun operateur trouve avec ce NIF.";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #051B36, #006233)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "32px 28px", maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 16, background: "linear-gradient(90deg, #009E60, #FCD116, #003DA5)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>REPUBLIQUE GABONAISE</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: "10px 0 2px", color: "#051B36" }}>Carte d'identite industrielle</h1>
          <p style={{ fontSize: 12, color: "#526175", margin: 0 }}>Verification d'operateur — PNPI</p>
        </div>

        {error ? (
          <div style={{ padding: 16, borderRadius: 14, background: "#fef2f2", color: "#b42318", textAlign: "center", fontSize: 13 }}>{error}</div>
        ) : data?.found && (
          <>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 8px", background: data.is_active ? "#dcfce7" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${data.is_active ? "#006233" : "#b42318"}` }}>
                <span style={{ fontSize: 32 }}>{data.is_active ? "\u2705" : "\u274C"}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#051B36" }}>{data.raison_sociale}</div>
              <div style={{ fontSize: 13, color: "#526175" }}>{data.is_active ? "Operateur actif et verifie" : "Operateur inactif"}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {[
                ["NIF Gabon", data.nif],
                ["Province", (data.province || "").replace(/_/g, " ")],
                ["ATIs actifs", data.active_atis_count],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                  <span style={{ color: "#526175", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{value || "\u2014"}</span>
                </div>
              ))}
            </div>

            {data.active_atis && data.active_atis.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#006233" }}>Agrements actifs :</div>
                {data.active_atis.map((ati: any) => (
                  <div key={ati.numero_ati} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: "1px solid #f8f8f8" }}>
                    <span style={{ fontWeight: 600 }}>{ati.numero_ati}</span>
                    <span style={{ color: "#526175", textTransform: "capitalize" }}>{ati.secteur}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#9ca3af" }}>
          Ministere de l'Industrie — PNPI — Verifie le {new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
    </div>
  );
}
