import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", textAlign: "center", padding: 32,
    }}>
      <div style={{ fontSize: 80, fontWeight: 800, color: "#dce4ef", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0c2a4a", margin: "16px 0 8px" }}>
        Page introuvable
      </h1>
      <p style={{ color: "#526175", fontSize: 15, maxWidth: 400, marginBottom: 24 }}>
        La page que vous recherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block", padding: "12px 24px", borderRadius: 12,
          background: "#006233", color: "#fff", fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
