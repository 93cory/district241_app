export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  let kpis: any = {};
  let impact: any = {};
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const [kR, iR] = await Promise.all([
      fetch(`${backendUrl}/pnpi/dashboard/kpis`, { cache: "no-store" }),
      fetch(`${backendUrl}/pnpi/dashboard/economic-impact`, { cache: "no-store" }),
    ]);
    if (kR.ok) kpis = await kR.json();
    if (iR.ok) impact = await iR.json();
  } catch {}

  const s = impact.summary || {};

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Manrope, system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #051B36 0%, #006233 100%)",
        color: "#fff", padding: "60px 32px 50px", textAlign: "center",
      }}>
        <div style={{
          display: "inline-block", padding: "4px 16px", borderRadius: 16,
          background: "linear-gradient(90deg, #009E60, #FCD116, #003DA5)",
          fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 16,
        }}>REPUBLIQUE GABONAISE</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>
          Investir dans l&apos;industrie gabonaise
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 600, margin: "0 auto" }}>
          La Plateforme Nationale de la Politique Industrielle (PNPI) accompagne
          les operateurs et investisseurs dans leurs projets industriels au Gabon.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ maxWidth: 900, margin: "-30px auto 40px", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {[
            { label: "Operateurs actifs", value: s.operateurs_actifs || kpis.operateurs_actifs || 0, icon: "\ud83c\udfed" },
            { label: "Agrements delivres", value: s.atis_approuves || kpis.atis_approuves || 0, icon: "\ud83d\udccb" },
            { label: "Emplois estimes", value: (s.emplois_estimes || 0).toLocaleString("fr-FR"), icon: "\ud83d\udc77" },
            { label: "Investissement", value: `${((s.investissement_mfcfa || 0) / 1000).toFixed(1)} Mds FCFA`, icon: "\ud83d\udcb0" },
          ].map(k => (
            <div key={k.label} style={{
              padding: "20px 18px", borderRadius: 16, background: "#fff",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)", textAlign: "center",
            }}>
              <div style={{ fontSize: 28 }}>{k.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#006233", marginTop: 4 }}>{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#526175" }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sectors */}
      <div style={{ maxWidth: 900, margin: "0 auto 40px", padding: "0 24px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, color: "#051B36" }}>
          Secteurs industriels
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[
            { name: "Bois & Forets", desc: "Scieries, contreplaque, transformation secondaire. Le Gabon possede 22 millions d'hectares de forets.", icon: "\ud83c\udf32" },
            { name: "Mines", desc: "Manganese (2e producteur mondial), or, fer. Potentiel d'enrichissement local considerable.", icon: "\u26cf\ufe0f" },
            { name: "Agroalimentaire", desc: "Huile de palme, cacao, cafe, hevea. Objectif de souverainete alimentaire.", icon: "\ud83c\udf3e" },
            { name: "Energie", desc: "Hydroelectricite, solaire, gaz naturel. Objectif 100% energies renouvelables.", icon: "\u26a1" },
            { name: "Peche", desc: "Zone maritime riche. Conserveries de thon, crevettes, transformation des produits halieutiques.", icon: "\ud83d\udc1f" },
            { name: "BTP & Construction", desc: "Ciment, granulats, prefabrication. Marche en forte croissance avec l'urbanisation.", icon: "\ud83c\udfd7\ufe0f" },
          ].map(s => (
            <div key={s.name} style={{
              padding: "18px 20px", borderRadius: 14, background: "#fff",
              border: "1.5px solid #dce4ef",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "#051B36" }}>{s.name}</div>
              <div style={{ fontSize: 13, color: "#526175", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Process */}
      <div style={{ background: "#f4f8fb", padding: "40px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: "#051B36", textAlign: "center" }}>
            Comment obtenir un agrement ?
          </h2>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { step: "1", title: "Inscription", desc: "Creez votre compte operateur sur la plateforme PNPI." },
              { step: "2", title: "Soumission", desc: "Deposez votre dossier ATI avec les documents requis." },
              { step: "3", title: "Instruction", desc: "Nos instructeurs analysent votre dossier sous 45 jours." },
              { step: "4", title: "Decision", desc: "Recevez votre agrement et votre certificat avec QR code." },
            ].map(s => (
              <div key={s.step} style={{
                width: 200, textAlign: "center", padding: "20px 16px", borderRadius: 14,
                background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", margin: "0 auto 8px",
                  background: "#006233", color: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800,
                }}>{s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#526175", lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "50px 24px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "#051B36" }}>
          Pret a investir au Gabon ?
        </h2>
        <p style={{ fontSize: 14, color: "#526175", marginBottom: 20 }}>
          Contactez le Ministere de l&apos;Industrie ou inscrivez-vous directement sur la plateforme.
        </p>
        <a href="/connexion" style={{
          display: "inline-block", padding: "12px 28px", borderRadius: 14,
          background: "#006233", color: "#fff", fontWeight: 700, fontSize: 15,
          textDecoration: "none",
        }}>
          Acceder a la plateforme &rarr;
        </a>
      </div>

      {/* Footer */}
      <div style={{
        background: "#051B36", color: "rgba(255,255,255,0.6)", padding: "20px 24px",
        textAlign: "center", fontSize: 11,
      }}>
        Ministere de l&apos;Industrie et de la Transformation Locale · Republique Gabonaise · PNPI {new Date().getFullYear()}
      </div>
    </div>
  );
}
