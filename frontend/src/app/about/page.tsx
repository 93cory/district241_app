export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", fontFamily: "Manrope, system-ui" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #051B36, #006233)",
          color: "#fff",
          padding: "60px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "4px 16px",
            borderRadius: 16,
            background: "linear-gradient(90deg, #009E60, #FCD116, #003DA5)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 12,
          }}
        >
          REPUBLIQUE GABONAISE
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>A propos de la PNPI</h1>
        <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 600, margin: "0 auto" }}>
          Plateforme Nationale de Pilotage Industriel
        </p>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "#006233" }}>
            Notre mission
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>
            La PNPI est la plateforme numerique de reference pour le suivi et la tracabilite de
            l&apos;activite industrielle au Gabon. Developpee par le Ministere de l&apos;Industrie
            et de la Transformation Locale, elle accompagne l&apos;ensemble des acteurs de
            l&apos;ecosysteme industriel gabonais : operateurs, instructeurs, inspecteurs, et
            decideurs.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: "#006233" }}>
            En chiffres
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { value: "200+", label: "Fonctionnalites" },
              { value: "140+", label: "Pages" },
              { value: "9", label: "Provinces couvertes" },
              { value: "7", label: "Secteurs industriels" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  textAlign: "center",
                  padding: "16px 12px",
                  borderRadius: 14,
                  background: "#f4f8fb",
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 800, color: "#006233" }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#526175" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: "#006233" }}>
            Fonctionnalites cles
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "📋", text: "Gestion complete du cycle ATI (soumission → decision)" },
              { icon: "🤖", text: "Intelligence artificielle (recommandation, scoring, alertes)" },
              { icon: "📊", text: "Analytics avancees (predictions, benchmark, pivot table)" },
              { icon: "🗺️", text: "Cartographie interactive et heatmap des provinces" },
              { icon: "📱", text: "Application mobile Flutter + PWA offline" },
              { icon: "🔒", text: "Securite renforcee (2FA, biometrie, signature electronique)" },
              { icon: "🌍", text: "Transparence (open data, ODD, impact social/environnemental)" },
              { icon: "📤", text: "Exports multiples (PDF, Excel, PowerPoint, GeoJSON, ZIP)" },
              { icon: "💬", text: "Collaboration (messagerie, commentaires, sondages, annuaire)" },
              { icon: "🎓", text: "Formation integree avec modules interactifs et quiz" },
            ].map((f) => (
              <div key={f.text} style={{ display: "flex", gap: 8, padding: "8px 0", fontSize: 13 }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: "#006233" }}>
            Technologies
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              "Next.js 15",
              "React 19",
              "FastAPI",
              "PostgreSQL",
              "PostGIS",
              "Flutter",
              "Docker",
              "Nginx",
              "Prometheus",
              "Grafana",
              "MinIO",
              "Leaflet",
              "Recharts",
              "ReportLab",
              "GitHub Actions",
            ].map((t) => (
              <span
                key={t}
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#f4f8fb",
                  border: "1px solid #dce4ef",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "#006233" }}>
            Contact
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>
            Ministere de l&apos;Industrie et de la Transformation Locale
            <br />
            BP 3903, Libreville, Gabon
            <br />
            Email :{" "}
            <a href="mailto:contact@pnpi-gabon.ga" style={{ color: "#006233" }}>
              contact@pnpi-gabon.ga
            </a>
            <br />
            Site :{" "}
            <a href="https://pnpi-gabon.ga" style={{ color: "#006233" }}>
              pnpi-gabon.ga
            </a>
          </p>
        </section>
      </div>

      <div
        style={{
          background: "#051B36",
          color: "rgba(255,255,255,0.6)",
          padding: "16px",
          textAlign: "center",
          fontSize: 10,
        }}
      >
        © {new Date().getFullYear()} Ministere de l&apos;Industrie et de la Transformation Locale ·
        Republique Gabonaise
      </div>
    </div>
  );
}
