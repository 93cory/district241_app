export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ ati?: string; product?: string; batch?: string }>;
}

export default async function VerifyProductPage({ searchParams }: Props) {
  const params = await searchParams;
  const { ati, product, batch } = params;

  let data: any = null;
  let error = "";

  if (ati) {
    try {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/pnpi/ati/verify/${encodeURIComponent(ati)}`, {
        cache: "no-store",
      });
      if (res.ok) data = await res.json();
      else error = "ATI introuvable.";
    } catch {
      error = "Service indisponible.";
    }
  }

  const valid = data?.valid === true;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #051B36 0%, #006233 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "32px 28px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: 16,
              background: "linear-gradient(90deg, #009E60, #FCD116, #003DA5)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            REPUBLIQUE GABONAISE
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: "10px 0 2px", color: "#051B36" }}>
            Verification produit
          </h1>
          <p style={{ fontSize: 12, color: "#526175", margin: 0 }}>
            PNPI · Tracabilite industrielle
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              color: "#b42318",
              textAlign: "center",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {data && (
          <>
            <div
              style={{
                textAlign: "center",
                padding: "14px 16px",
                borderRadius: 14,
                marginBottom: 16,
                background: valid ? "#dcfce7" : "#fef2f2",
                border: `2px solid ${valid ? "#006233" : "#b42318"}`,
              }}
            >
              <div style={{ fontSize: 28 }}>{valid ? "\u2705" : "\u274C"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: valid ? "#006233" : "#b42318" }}>
                {valid ? "PRODUIT AUTHENTIQUE" : "NON VERIFIE"}
              </div>
              {valid && (
                <div style={{ fontSize: 11, color: "#006233", marginTop: 2 }}>
                  Ce produit est fabrique par un operateur agree.
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Produit", product || "\u2014"],
                ["N\u00b0 lot", batch || "\u2014"],
                ["N\u00b0 ATI", data.numero_ati],
                ["Fabricant", data.operateur],
                ["Secteur", data.secteur],
                ["Statut ATI", data.statut],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#526175", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!ati && (
          <div style={{ textAlign: "center", padding: 20, color: "#526175", fontSize: 13 }}>
            Scannez un QR code produit pour verifier son authenticite.
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#6b7280" }}>
          Ministere de l&apos;Industrie et de la Transformation Locale · PNPI
        </div>
      </div>
    </div>
  );
}
