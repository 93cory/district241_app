import { notFound } from "next/navigation";
import { GUIDES, type RoleSlug } from "./content";
import { PrintButton } from "./PrintButton";

export async function generateStaticParams() {
  return Object.keys(GUIDES).map((role) => ({ role }));
}

export const dynamic = "force-static";

const GUIDE_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  body { background: #f4f7fb; }
  .guide-page { max-width: 820px; margin: 0 auto; padding: 32px 28px; font-family: "Inter", system-ui, sans-serif; color: #051B36; line-height: 1.6; }
  .flag-bar { height: 6px; display: flex; border-radius: 3px; overflow: hidden; margin-bottom: 22px; }
  .flag-bar span { flex: 1; }
  .flag-green { background: #009E60; }
  .flag-yellow { background: #FCD116; }
  .flag-blue { background: #003DA5; }
  .header { background: linear-gradient(135deg, #051B36 0%, #003DA5 100%); color: #fff; padding: 36px 32px; border-radius: 16px; margin-bottom: 28px; position: relative; overflow: hidden; }
  .header h1 { font-size: 32px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.01em; }
  .header .eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.7; margin-bottom: 16px; }
  .header .role-badge { display: inline-block; padding: 6px 14px; background: rgba(252, 209, 22, 0.18); border: 1px solid rgba(252, 209, 22, 0.6); color: #fff; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .header p { font-size: 15px; opacity: 0.9; margin: 14px 0 0; max-width: 540px; }
  .toc { background: #fff; border-radius: 12px; padding: 22px 26px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
  .toc h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #526175; margin: 0 0 12px; font-weight: 700; }
  .toc ol { margin: 0; padding-left: 22px; font-size: 14px; }
  .toc li { margin: 5px 0; color: #051B36; }
  .toc a { color: inherit; text-decoration: none; }
  .toc a:hover { color: #009E60; }
  .section { background: #fff; border-radius: 12px; padding: 28px 32px; margin-bottom: 18px; border: 1px solid #e2e8f0; }
  .section h2 { font-size: 20px; font-weight: 800; color: #051B36; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 2px solid #009E60; }
  .section h3 { font-size: 15px; font-weight: 700; color: #051B36; margin: 18px 0 8px; }
  .section p { font-size: 14px; color: #374151; margin: 8px 0; }
  .section ul { font-size: 14px; color: #374151; padding-left: 22px; margin: 8px 0; }
  .section li { margin: 5px 0; }
  .section .note { background: #f0f9ff; border-left: 3px solid #0c7eb4; padding: 10px 14px; margin: 12px 0; font-size: 13px; border-radius: 6px; color: #0c4a6e; }
  .section .warn { background: #fef3c7; border-left: 3px solid #d97706; padding: 10px 14px; margin: 12px 0; font-size: 13px; border-radius: 6px; color: #78350f; }
  .actions { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
  .btn { padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; }
  .btn-primary { background: #009E60; color: #fff; }
  .btn-secondary { background: #fff; border: 1px solid #cbd5e1; color: #051B36; text-decoration: none; display: inline-block; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 24px 0 12px; letter-spacing: 0.04em; }
  .btn:focus-visible, .toc a:focus-visible { outline: 2px solid #FCD116; outline-offset: 2px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after { transition: none !important; animation: none !important; }
  }
  @media print {
    body { background: #fff !important; }
    .actions { display: none !important; }
    .header { background: #051B36 !important; color: #fff !important; }
    .header .role-badge { background: rgba(252, 209, 22, 0.25) !important; border-color: rgba(252, 209, 22, 0.6) !important; }
    .section, .toc { box-shadow: none !important; border: 1px solid #cbd5e1 !important; page-break-inside: avoid; }
    .section h2 { page-break-after: avoid; }
    a { color: inherit !important; text-decoration: none !important; }
    .footer { color: #475569 !important; }
  }
`;

export default function GuidePage({ params }: { params: { role: string } }) {
  const role = params.role as RoleSlug;
  const guide = GUIDES[role];
  if (!guide) notFound();

  return (
    <div className="guide-page">
      <style dangerouslySetInnerHTML={{ __html: GUIDE_CSS }} />

      <div className="flag-bar" aria-hidden="true" role="presentation">
        <span className="flag-green" />
        <span className="flag-yellow" />
        <span className="flag-blue" />
      </div>

      <div className="actions">
        <PrintButton />
        <a href="/aide" className="btn btn-secondary">
          Retour au centre d'aide
        </a>
      </div>

      <header className="header">
        <div className="eyebrow">Guide utilisateur PNPI</div>
        <h1>{guide.title}</h1>
        <span className="role-badge">{guide.roleLabel}</span>
        <p>{guide.intro}</p>
      </header>

      <nav className="toc" aria-label="Sommaire du guide">
        <h2>Sommaire</h2>
        <ol>
          {guide.sections.map((s, idx) => (
            <li key={idx}>
              <a href={`#sec-${idx}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      {guide.sections.map((sec, idx) => (
        <section key={idx} id={`sec-${idx}`} className="section">
          <h2>{sec.title}</h2>
          {sec.blocks.map((block, bIdx) => {
            switch (block.kind) {
              case "p":
                return <p key={bIdx}>{block.text}</p>;
              case "h3":
                return <h3 key={bIdx}>{block.text}</h3>;
              case "ul":
                return (
                  <ul key={bIdx}>
                    {block.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                );
              case "note":
                return (
                  <div key={bIdx} className="note">
                    {block.text}
                  </div>
                );
              case "warn":
                return (
                  <div key={bIdx} className="warn">
                    {block.text}
                  </div>
                );
            }
          })}
        </section>
      ))}

      <div className="footer">
        Plateforme Nationale de Pilotage Industriel · Ministère de l'Industrie et de la
        Transformation Locale · République Gabonaise · v1.43
      </div>
    </div>
  );
}
