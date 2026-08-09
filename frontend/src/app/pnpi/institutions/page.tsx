import Link from "next/link";

import { InstitutionalView, Panel, styles } from "./_components/InstitutionalView";
import { canViewMinisterCockpit, requireInstitutionAccess } from "./_components/access";

const institutions = [
  {
    name: "Ministère de l’Industrie",
    note: "Pilotage, ATI et inspections",
    href: "/pnpi",
    state: "Opérationnel",
  },
  {
    name: "AGANOR",
    note: "Normes et conformité",
    href: "/pnpi/institutions/aganor",
    state: "Prototype proposé",
  },
  {
    name: "OGAPI",
    note: "Propriété industrielle",
    href: "/pnpi/institutions/ogapi",
    state: "Prototype proposé",
  },
];

export default async function InstitutionsPage() {
  const profile = await requireInstitutionAccess();
  return (
    <InstitutionalView
      canViewMinister={canViewMinisterCockpit(profile.roles ?? [])}
      eyebrow="Écosystème industriel national"
      title="Un même cap, trois institutions"
      description="Un accès coordonné aux services du Ministère, de l’AGANOR et de l’OGAPI, avec une lecture commune du parcours industriel."
    >
      <Panel title="Choisir un espace institutionnel">
        <div className={styles.cards}>
          {institutions.map((item) => (
            <Link className={styles.institutionCard} href={item.href} key={item.name}>
              <span className={styles.cardIcon} aria-hidden="true">
                {item.name.slice(0, 1)}
              </span>
              <div>
                <h2>{item.name}</h2>
                <p>{item.note}</p>
              </div>
              <small>{item.state}</small>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </Panel>
      <div className={styles.callout}>
        <div>
          <strong>Dossier industriel unifié</strong>
          <p>
            Une vue transversale des agréments, normes, inspections et titres de propriété
            industrielle.
          </p>
        </div>
        <Link className={styles.button} href="/pnpi/institutions/dossier">
          Consulter le dossier
        </Link>
      </div>
    </InstitutionalView>
  );
}
