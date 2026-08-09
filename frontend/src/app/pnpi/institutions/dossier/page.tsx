import Link from "next/link";

import { ActivityList, InstitutionalView, Panel, styles } from "../_components/InstitutionalView";
import { canViewMinisterCockpit, requireInstitutionAccess } from "../_components/access";

export default async function DossierPage() {
  const profile = await requireInstitutionAccess();
  return (
    <InstitutionalView
      prototype
      canViewMinister={canViewMinisterCockpit(profile.roles ?? [])}
      eyebrow="Référence fictive DUI-2026-00482"
      title="Dossier industriel unifié"
      description="Société de démonstration · Estuaire"
      metrics={[
        { label: "Avancement démo", value: "72 %", detail: "9 étapes fictives sur 12" },
        { label: "ATI démo", value: "En instruction", detail: "Échéance fictive : 8 jours" },
        { label: "Conformité démo", value: "2 / 3", detail: "Référentiels simulés" },
        {
          label: "Propriété indus. démo",
          value: "1 titre",
          detail: "Marque fictive",
          tone: "gold",
        },
      ]}
    >
      <div className={styles.twoColumns}>
        <Panel title="Parcours interinstitutionnel">
          <ol className={styles.timeline}>
            <li className={styles.done}>
              <b>Identification de l’opérateur</b>
              <span>Ministère · validation fictive du 12 juin 2026</span>
            </li>
            <li className={styles.current}>
              <b>Agrément technique industriel</b>
              <span>Ministère · instruction en cours</span>
            </li>
            <li>
              <b>Certification de conformité</b>
              <span>AGANOR · intégration future</span>
            </li>
            <li>
              <b>Protection des actifs immatériels</b>
              <span>OGAPI · intégration future</span>
            </li>
          </ol>
        </Panel>
        <Panel title="Dernières activités" action={<Link href="/pnpi/ati">Voir les ATI</Link>}>
          <ActivityList
            items={[
              {
                title: "Rapport d’inspection ajouté",
                meta: "Direction de l’Industrie · date fictive",
                status: "Démo",
              },
              {
                title: "Pièce justificative contrôlée",
                meta: "Instruction ATI · donnée simulée",
                status: "Démo",
              },
              {
                title: "Demande de marque rapprochée",
                meta: "OGAPI · donnée de démonstration",
                status: "Prototype",
              },
            ]}
          />
        </Panel>
      </div>
      <div className={styles.notice}>
        <strong>Périmètre des données</strong>
        <p>
          Les informations Ministère/PNPI sont distinctes. Les rapprochements AGANOR et OGAPI
          illustrent une intégration future et ne constituent pas des données officielles.
        </p>
      </div>
    </InstitutionalView>
  );
}
