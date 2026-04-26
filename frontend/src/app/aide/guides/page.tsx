import Link from "next/link";

const ROLES: { slug: string; label: string; tagline: string; color: string }[] = [
  { slug: "admin", label: "Administrateur", tagline: "Supervision technique et organisationnelle", color: "#b42318" },
  { slug: "ministre", label: "Ministre", tagline: "Décision stratégique et pilotage politique", color: "#051B36" },
  { slug: "directeur", label: "Directeur", tagline: "Pilotage opérationnel et validation intermédiaire", color: "#009E60" },
  { slug: "instructeur", label: "Instructeur", tagline: "Instruction des dossiers ATI", color: "#003DA5" },
  { slug: "inspecteur", label: "Inspecteur", tagline: "Inspections de conformité terrain", color: "#7c3aed" },
  { slug: "operateur", label: "Opérateur", tagline: "Guichet entreprise · soumission et suivi", color: "#d97706" },
];

export default function GuidesIndexPage() {
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 24px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/aide" style={{ fontSize: 13, color: "#526175", textDecoration: "none" }}>
          ← Centre d'aide
        </Link>
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: "#051B36", letterSpacing: "-0.01em" }}>
        Guides utilisateur PDF
      </h1>
      <p style={{ fontSize: 15, color: "#526175", marginBottom: 32, maxWidth: 640, lineHeight: 1.6 }}>
        Un guide imprimable par profil utilisateur. Choisissez votre rôle, puis utilisez le bouton
        d'impression pour télécharger le guide en PDF (mise en page A4 optimisée).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {ROLES.map((r) => (
          <Link
            key={r.slug}
            href={`/aide/guides/${r.slug}`}
            style={{
              background: "#fff",
              padding: "22px 24px",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              borderLeft: `4px solid ${r.color}`,
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: r.color, fontWeight: 700, marginBottom: 6 }}>
              Rôle
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#051B36", marginBottom: 6 }}>
              {r.label}
            </div>
            <div style={{ fontSize: 13, color: "#526175", lineHeight: 1.5 }}>
              {r.tagline}
            </div>
            <div style={{ fontSize: 12, color: r.color, marginTop: 14, fontWeight: 600 }}>
              Ouvrir le guide →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
