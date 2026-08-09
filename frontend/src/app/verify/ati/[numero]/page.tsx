export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  approuve: { color: "#166534", bg: "#dcfce7", label: "VALIDE", icon: "\u2713" },
  expire: { color: "#92400e", bg: "#fef3c7", label: "EXPIRE", icon: "\u26a0" },
  rejete: { color: "#b42318", bg: "#fef2f2", label: "REJETE", icon: "\u2715" },
  en_cours: { color: "#0c7eb4", bg: "#e0f2fe", label: "EN COURS", icon: "\u23f3" },
  soumis: { color: "#526175", bg: "#f3f4f6", label: "EN ATTENTE", icon: "\u2026" },
};

interface Props {
  params: Promise<{ numero: string }>;
}

export default async function VerifyATIPage({ params }: Props) {
  const { numero } = await params;

  let data: any = null;
  let error = "";

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/pnpi/ati/verify/${encodeURIComponent(numero)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      data = await res.json();
    } else if (res.status === 404) {
      error = "Aucun agrement technique industriel trouve avec ce numero.";
    } else {
      error = "Erreur de verification. Veuillez reessayer.";
    }
  } catch {
    error = "Service de verification indisponible.";
  }

  const status = data ? STATUS_CONFIG[data.statut] || STATUS_CONFIG.soumis : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #051B36 0%, #0C7EB4 100%)",
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
          padding: "36px 32px",
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 20,
              background: "linear-gradient(135deg, #009E60, #FCD116, #003DA5)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            REPUBLIQUE GABONAISE
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 2px", color: "#051B36" }}>
            Verification ATI
          </h1>
          <p style={{ fontSize: 13, color: "#526175", margin: 0 }}>
            Plateforme Nationale de Pilotage Industriel
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              textAlign: "center",
              color: "#b42318",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {data && status && (
          <>
            {/* Status badge */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 20,
                padding: "16px 20px",
                borderRadius: 16,
                background: status.bg,
                border: `2px solid ${status.color}`,
              }}
            >
              <div style={{ fontSize: 36 }}>{status.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: status.color, marginTop: 4 }}>
                {status.label}
              </div>
              {data.valid && (
                <div style={{ fontSize: 12, color: status.color, marginTop: 2 }}>
                  Cet agrement est valide et en cours de validite.
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["N\u00b0 ATI", data.numero_ati],
                ["Operateur", data.operateur],
                ["NIF Gabon", data.nif],
                ["Secteur", data.secteur],
                ["Activite", data.type_activite],
                [
                  "Date d'approbation",
                  data.date_approbation
                    ? new Date(data.date_approbation).toLocaleDateString("fr-FR")
                    : "\u2014",
                ],
                [
                  "Date d'expiration",
                  data.date_expiration
                    ? new Date(data.date_expiration).toLocaleDateString("fr-FR")
                    : "Illimitee",
                ],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#526175", fontWeight: 600 }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#051B36",
                      fontWeight: 600,
                      textAlign: "right",
                      maxWidth: "60%",
                    }}
                  >
                    {value || "\u2014"}
                  </span>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <div
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              Verifie le {new Date(data.verified_at).toLocaleString("fr-FR")}
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid #f0f0f0",
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          Ministere de l&apos;Industrie et de la Transformation Locale &mdash; PNPI
        </div>
      </div>
    </div>
  );
}
