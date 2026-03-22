export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{
      background: "var(--bg-base, #f4f8fb)",
      borderTop: "1px solid var(--line, #dce4ef)",
      padding: "20px 24px",
      marginTop: 40,
    }} className="no-print">
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-main, #0c2a4a)", marginBottom: 4 }}>PNPI</div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #526175)", lineHeight: 1.5 }}>
            Plateforme Nationale de la<br />Politique Industrielle<br />
            Republique Gabonaise
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--text-main)" }}>Plateforme</div>
            {[
              { href: "/about", label: "A propos" },
              { href: "/contact", label: "Contact" },
              { href: "/investors", label: "Investisseurs" },
              { href: "/open-data", label: "Open Data" },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ display: "block", fontSize: 11, color: "var(--text-soft, #526175)", textDecoration: "none", marginBottom: 3 }}>{l.label}</a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--text-main)" }}>Legal</div>
            {[
              { href: "/legal/cgu", label: "CGU" },
              { href: "/legal/confidentialite", label: "Confidentialite" },
              { href: "/legal/accessibilite", label: "Accessibilite" },
              { href: "/plan-du-site", label: "Plan du site" },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ display: "block", fontSize: 11, color: "var(--text-soft, #526175)", textDecoration: "none", marginBottom: 3 }}>{l.label}</a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--text-main)" }}>Technique</div>
            {[
              { href: "/api-docs", label: "API Docs" },
              { href: "/status", label: "Statut" },
              { href: "/changelog", label: "Changelog" },
              { href: "/embed", label: "Widgets" },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ display: "block", fontSize: 11, color: "var(--text-soft, #526175)", textDecoration: "none", marginBottom: 3 }}>{l.label}</a>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "12px auto 0", paddingTop: 12, borderTop: "1px solid var(--line, #dce4ef)", textAlign: "center", fontSize: 10, color: "var(--text-soft, #9ca3af)" }}>
        © {year} Ministere de l&apos;Industrie et de la Transformation Locale — Republique Gabonaise — PNPI v1.43
      </div>
    </footer>
  );
}
