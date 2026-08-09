import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchBackendProfile } from "../lib/backend";
import { getDefaultRouteForRoles } from "../lib/role-routing";
import { PNPILogo } from "./components/PNPILogo";

export const metadata = {
  title: "PNPI · Plateforme Nationale de Pilotage Industriel · République Gabonaise",
  description:
    "L'outil souverain du Ministère de l'Industrie et de la Transformation Locale du Gabon : agréments techniques, inspections, pilotage stratégique.",
};

const STATS = [
  { value: "50%", label: "Délai de traitement réduit" },
  { value: "9", label: "Provinces couvertes" },
  { value: "6", label: "Profils utilisateurs" },
  { value: "100%", label: "Décisions tracées" },
];

const VITRINE_CSS = `
  .vitrine { font-family: "Inter", system-ui, sans-serif; color: #051B36; background: #FAF8F4; min-height: 100vh; }
  .vitrine-hero { background: linear-gradient(160deg, #051B36 0%, #003DA5 50%, #009E60 100%); color: #fff; padding: 90px 32px 100px; position: relative; overflow: hidden; }
  .vitrine-hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 20% 30%, rgba(252,209,22,0.18) 0%, transparent 50%), radial-gradient(circle at 85% 70%, rgba(0,158,96,0.2) 0%, transparent 55%); pointer-events: none; }
  .vitrine-flag { display: flex; height: 4px; max-width: 1100px; margin: 0 auto 36px; }
  .vitrine-flag span { flex: 1; }
  .vitrine-flag span:nth-child(1) { background: #009E60; }
  .vitrine-flag span:nth-child(2) { background: #FCD116; }
  .vitrine-flag span:nth-child(3) { background: #003DA5; }
  .vitrine-hero-inner { max-width: 1100px; margin: 0 auto; position: relative; }
  .vitrine-eyebrow { font-family: "Cormorant Garamond", Georgia, serif; font-style: italic; font-size: 22px; color: #FCD116; margin-bottom: 18px; }
  .vitrine-h1 { font-family: "Playfair Display", Georgia, serif; font-weight: 900; font-size: clamp(42px, 6vw, 72px); line-height: 1.05; letter-spacing: -0.02em; margin-bottom: 24px; max-width: 880px; }
  .vitrine-h1 em { font-style: italic; font-family: "Cormorant Garamond", serif; color: #FCD116; }
  .vitrine-lede { font-size: 19px; line-height: 1.65; max-width: 720px; opacity: 0.92; margin-bottom: 40px; font-weight: 300; }
  .vitrine-cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 56px; }
  .vitrine-btn { padding: 14px 26px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s; }
  .vitrine-btn-primary { background: #FCD116; color: #051B36; }
  .vitrine-btn-secondary { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px); }
  .vitrine-btn:hover { transform: translateY(-2px); }
  .vitrine-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 32px; padding-top: 36px; border-top: 1px solid rgba(255,255,255,0.18); }
  .vitrine-stat .num { font-family: "Playfair Display", serif; font-size: 48px; font-weight: 900; color: #FCD116; line-height: 1; }
  .vitrine-stat .lab { font-size: 13px; opacity: 0.85; margin-top: 8px; }
  .vitrine-section { max-width: 1100px; margin: 0 auto; padding: 80px 32px; }
  .vitrine-section h2 { font-family: "Playfair Display", serif; font-weight: 800; font-size: clamp(32px, 4vw, 44px); letter-spacing: -0.015em; margin-bottom: 14px; }
  .vitrine-section h2 em { font-style: italic; font-family: "Cormorant Garamond", serif; color: #009E60; }
  .vitrine-section .sub { font-size: 17px; color: #526175; max-width: 640px; margin-bottom: 40px; line-height: 1.6; }
  .vitrine-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
  .vitrine-card { padding: 28px 26px; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; border-top: 4px solid var(--accent); transition: transform 0.3s, box-shadow 0.3s; }
  .vitrine-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px -16px rgba(0,0,0,0.18); }
  .vitrine-card h3 { font-family: "Playfair Display", serif; font-size: 21px; font-weight: 700; margin-bottom: 12px; }
  .vitrine-card p { font-size: 14px; color: #526175; line-height: 1.65; }
  .vitrine-module-card { display: flex; flex-direction: column; min-height: 190px; }
  .vitrine-module-icon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: rgba(0,158,96,0.1); font-size: 24px; margin-bottom: 16px; }
  .vitrine-module-link { margin-top: auto; color: #003DA5; font-size: 13px; font-weight: 800; text-decoration: none; }
  .vitrine-cta-bottom { background: linear-gradient(135deg, #009E60 0%, #006d3e 100%); color: #fff; padding: 80px 32px; text-align: center; position: relative; overflow: hidden; }
  .vitrine-cta-bottom::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(252,209,22,0.18) 0%, transparent 60%); }
  .vitrine-cta-bottom-inner { max-width: 720px; margin: 0 auto; position: relative; }
  .vitrine-cta-bottom h2 { font-family: "Playfair Display", serif; font-size: clamp(30px, 4vw, 40px); font-weight: 800; margin-bottom: 18px; line-height: 1.15; }
  .vitrine-cta-bottom p { font-size: 17px; opacity: 0.95; margin-bottom: 32px; line-height: 1.6; }
  .vitrine-footer { background: #051B36; color: rgba(255,255,255,0.7); padding: 50px 32px 30px; }
  .vitrine-footer-inner { max-width: 1100px; margin: 0 auto; }
  .vitrine-footer-flag { display: flex; height: 3px; margin-bottom: 28px; }
  .vitrine-footer-flag span { flex: 1; }
  .vitrine-footer-flag span:nth-child(1) { background: #009E60; }
  .vitrine-footer-flag span:nth-child(2) { background: #FCD116; }
  .vitrine-footer-flag span:nth-child(3) { background: #003DA5; }
  .vitrine-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 30px; }
  @media (max-width: 720px) { .vitrine-footer-grid { grid-template-columns: 1fr; } }
  .vitrine-footer h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px; opacity: 0.7; font-weight: 600; }
  .vitrine-footer p, .vitrine-footer ul { font-size: 13px; line-height: 1.7; }
  .vitrine-footer ul { list-style: none; padding: 0; }
  .vitrine-footer a { color: inherit; text-decoration: none; opacity: 0.85; }
  .vitrine-footer a:hover { opacity: 1; color: #FCD116; }
  .vitrine-baseline { font-size: 11px; opacity: 0.6; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 22px; font-style: italic; letter-spacing: 0.04em; }
`;

const FEATURES = [
  {
    title: "Agréments Techniques Industriels",
    desc: "Soumission, instruction, validation et décision dématérialisées de bout en bout. SLA tracé, certificats PDF horodatés avec QR code de vérification.",
    accent: "#009E60",
  },
  {
    title: "Inspections de conformité",
    desc: "Inspections terrain géolocalisées, photos GPS, rapports automatisés. Mode hors-ligne pour les zones rurales.",
    accent: "#003DA5",
  },
  {
    title: "Pilotage ministériel",
    desc: "Tableaux de bord temps réel, briefing audio quotidien, comparatifs entre périodes, prédictions IA, exports PowerPoint.",
    accent: "#FCD116",
  },
  {
    title: "Open Data publique",
    desc: "Statistiques agrégées et anonymisées en accès libre, conformes aux principes de transparence des services publics.",
    accent: "#0c7eb4",
  },
  {
    title: "Souveraineté numérique",
    desc: "Hébergement souverain (ANINF), code source en séquestre, conformité loi N°026/2017 sur la protection des données.",
    accent: "#7c3aed",
  },
  {
    title: "Sécurité de niveau étatique",
    desc: "Authentification forte avec 2FA, audit trail intégral, RBAC sur 6 rôles, k-anonymity sur l'open data.",
    accent: "#b42318",
  },
];

const STRATEGIC_MODULES = [
  {
    title: "RIN national",
    desc: "Référentiel industriel, DIUN, sites, produits, ressources et fiche entreprise 360°.",
    icon: "🏭",
    href: "/pnpi/rin",
    accent: "#009E60",
  },
  {
    title: "Filières & chaînes de valeur",
    desc: "Lecture de souveraineté productive, maillons critiques, territoires et opportunités.",
    icon: "🔗",
    href: "/pnpi/filieres",
    accent: "#003DA5",
  },
  {
    title: "Innovation 4.0",
    desc: "Technologies, projets pilotes, acteurs de l'écosystème et maturité numérique.",
    icon: "⚙️",
    href: "/pnpi/innovation",
    accent: "#7c3aed",
  },
  {
    title: "Capital humain",
    desc: "Emplois, compétences, métiers en tension et formations adaptées aux rôles.",
    icon: "🎓",
    href: "/pnpi/capital-humain",
    accent: "#0c7eb4",
  },
  {
    title: "Industrie durable",
    desc: "Énergie, matières, circularité, carbone et risques climatiques territorialisés.",
    icon: "🌿",
    href: "/pnpi/durabilite",
    accent: "#006233",
  },
  {
    title: "Sécurité SOC",
    desc: "Supervision sécurité, MFA, audit, alertes et réponse aux incidents.",
    icon: "🛡️",
    href: "/pnpi/securite",
    accent: "#b42318",
  },
];

export default async function HomePage() {
  try {
    const profile = await fetchBackendProfile();
    const defaultRoute = getDefaultRouteForRoles(profile.roles ?? []);
    if (defaultRoute !== "/") {
      redirect(defaultRoute);
    }
  } catch {
    /* visiteur non connecté · on affiche la vitrine publique */
  }

  return (
    <main className="vitrine">
      <style dangerouslySetInnerHTML={{ __html: VITRINE_CSS }} />

      {/* HERO */}
      <section className="vitrine-hero">
        <div className="vitrine-flag">
          <span />
          <span />
          <span />
        </div>
        <div className="vitrine-hero-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 36 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                background: "rgba(255,255,255,0.96)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
              }}
            >
              <PNPILogo size={68} priority />
            </div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85, letterSpacing: "0.06em" }}>
                République Gabonaise
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                Ministère de l'Industrie et de la Transformation Locale
              </div>
            </div>
          </div>
          <div className="vitrine-eyebrow">L'outil souverain de l'industrie gabonaise</div>
          <h1 className="vitrine-h1">
            La <em>souveraineté</em> industrielle au service du Gabon.
          </h1>
          <p className="vitrine-lede">
            La Plateforme Nationale de Pilotage Industriel digitalise la délivrance des Agréments
            Techniques Industriels, le suivi des inspections de conformité et le pilotage
            stratégique du tissu industriel national.
          </p>
          <div className="vitrine-cta-row">
            <Link href="/connexion" className="vitrine-btn vitrine-btn-primary">
              Se connecter à la plateforme →
            </Link>
            <Link href="/open-data" className="vitrine-btn vitrine-btn-secondary">
              Consulter les statistiques publiques
            </Link>
          </div>
          <div className="vitrine-stats">
            {STATS.map((s) => (
              <div key={s.label} className="vitrine-stat">
                <div className="num">{s.value}</div>
                <div className="lab">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="vitrine-section">
        <h2>
          Une plateforme <em>pour chaque acteur</em> du circuit industriel.
        </h2>
        <p className="sub">
          Six profils utilisateurs, un cycle complet de l'agrément technique, une transparence
          publique mesurable.
        </p>
        <div className="vitrine-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="vitrine-card" style={{ ["--accent" as never]: f.accent }}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vitrine-section" style={{ paddingTop: 0 }}>
        <h2>
          Des modules <em>stratégiques</em> déjà démontrables.
        </h2>
        <p className="sub">
          Au-delà du guichet administratif, la PNPI devient un système national de connaissance,
          de pilotage et d'aide à la décision pour l'industrie gabonaise.
        </p>
        <div className="vitrine-grid">
          {STRATEGIC_MODULES.map((module) => (
            <div
              key={module.title}
              className="vitrine-card vitrine-module-card"
              style={{ ["--accent" as never]: module.accent }}
            >
              <div className="vitrine-module-icon" aria-hidden="true">
                {module.icon}
              </div>
              <h3>{module.title}</h3>
              <p>{module.desc}</p>
              <Link href={module.href} className="vitrine-module-link">
                Voir le module après connexion →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="vitrine-cta-bottom">
        <div className="vitrine-cta-bottom-inner">
          <h2>Prêt à découvrir la plateforme ?</h2>
          <p>
            Connectez-vous avec votre compte de démonstration. Les six profils utilisateurs sont
            préconfigurés.
          </p>
          <Link href="/connexion" className="vitrine-btn vitrine-btn-primary">
            Accéder à la plateforme →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="vitrine-footer">
        <div className="vitrine-footer-inner">
          <div className="vitrine-footer-flag">
            <span />
            <span />
            <span />
          </div>
          <div className="vitrine-footer-grid">
            <div>
              <h4>PNPI</h4>
              <p>
                Plateforme Nationale de Pilotage Industriel · Ministère de l'Industrie et de la
                Transformation Locale · République Gabonaise.
              </p>
            </div>
            <div>
              <h4>Plateforme</h4>
              <ul>
                <li>
                  <Link href="/connexion">Se connecter</Link>
                </li>
                <li>
                  <Link href="/open-data">Open Data</Link>
                </li>
                <li>
                  <Link href="/aide/guides">Guides utilisateur</Link>
                </li>
                <li>
                  <Link href="/api-docs">Documentation API</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Légal</h4>
              <ul>
                <li>
                  <Link href="/about">À propos</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
                <li>
                  <a
                    href="https://github.com/93cory/pnpi-gabon"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Code source
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="vitrine-baseline">
            République Gabonaise · Union · Travail · Justice · PNPI v1.43 ©{" "}
            {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </main>
  );
}
