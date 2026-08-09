import { ActivityList, InstitutionalView, Panel, styles } from "../_components/InstitutionalView";
import { requireInstitutionAccess } from "../_components/access";

export default async function CockpitPage() {
  const profile = await requireInstitutionAccess(true);
  return (
    <InstitutionalView
      prototype
      canViewMinister
      eyebrow={`Vue exécutive · ${profile.full_name || profile.username}`}
      title="Cockpit du Ministre"
      description="Synthèse décisionnelle de la performance industrielle, des alertes et des priorités nationales."
      metrics={[
        { label: "ATI actives démo", value: "284", detail: "Périmètre fictif PNPI" },
        { label: "Emplois démo", value: "12 460", detail: "Portefeuille simulé" },
        { label: "Risques démo", value: "7", detail: "Arbitrages fictifs" },
        {
          label: "Indice démo",
          value: "81 / 100",
          detail: "Tendance simulée",
          tone: "gold",
        },
      ]}
    >
      <div className={styles.twoColumns}>
        <Panel title="Priorités exécutives">
          <ActivityList
            items={[
              {
                title: "7 dossiers hors délai",
                meta: "Instruction ATI · scénario de démonstration",
                status: "Démo",
              },
              {
                title: "Inspection filière bois",
                meta: "Ogooué-Maritime · planning fictif",
                status: "Démo",
              },
              {
                title: "Convention de partage de données",
                meta: "AGANOR / OGAPI · intégration future",
                status: "À arbitrer",
              },
            ]}
          />
        </Panel>
        <Panel title="Objectifs simulés 2026">
          <div className={styles.progressList}>
            {[
              ["Réduire le délai ATI", "76 %"],
              ["Numériser les contrôles", "64 %"],
              ["Étendre la couverture provinciale", "82 %"],
            ].map(([label, value]) => (
              <div key={label}>
                <span>
                  <b>{label}</b>
                  <em>{value}</em>
                </span>
                <i>
                  <b style={{ width: value }} />
                </i>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className={styles.notice}>
        <strong>Lecture institutionnelle</strong>
        <p>
          Les indicateurs PNPI relèvent du Ministère. Toute donnée attribuée à l’AGANOR ou à l’OGAPI
          demeure une projection jusqu’à interconnexion officielle.
        </p>
      </div>
    </InstitutionalView>
  );
}
