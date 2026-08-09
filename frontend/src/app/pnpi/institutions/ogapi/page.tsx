import { ActivityList, InstitutionalView, Panel, styles } from "../_components/InstitutionalView";
import { canViewMinisterCockpit, requireInstitutionAccess } from "../_components/access";

export default async function OgapiPage() {
  const profile = await requireInstitutionAccess();
  const orientationFlow = [
    ["1", "Repérage PNPI", "Une entreprise, un produit ou une innovation indique un besoin de protection."],
    ["2", "Orientation", "La PNPI informe l'opérateur et prépare les métadonnées utiles au dossier."],
    ["3", "Instruction OGAPI", "OGAPI reste responsable des titres, dépôts, oppositions et décisions."],
    ["4", "Suivi consolidé", "La PNPI affiche uniquement le statut autorisé, la référence et l'étape."],
  ];
  const safeguards = [
    "La PNPI ne crée pas de marque, brevet ou dessin industriel à la place d'OGAPI.",
    "Les informations de propriété industrielle sont cloisonnées par rôle et par dossier.",
    "Les secrets industriels, procédés et documents confidentiels ne sont jamais publiés.",
    "Les recommandations PNPI restent de l'orientation, pas une décision juridique.",
  ];
  return (
    <InstitutionalView
      prototype
      canViewMinister={canViewMinisterCockpit(profile.roles ?? [])}
      eyebrow="Office Gabonais de la Propriété Industrielle"
      title="Tableau de bord OGAPI"
      description="Vue prospective des marques, brevets et dessins liés au tissu industriel gabonais."
      metrics={[
        { label: "Demandes démo", value: "93", detail: "Données fictives" },
        { label: "Marques démo", value: "61", detail: "66 % fictifs" },
        { label: "Brevets démo", value: "19", detail: "20 % fictifs" },
        { label: "Délai médian", value: "24 j", detail: "Démonstration", tone: "gold" },
      ]}
    >
      <div className={styles.twoColumns}>
        <Panel title="Portefeuille de titres">
          <div className={styles.donutWrap}>
            <div
              className={styles.donut}
              role="img"
              aria-label="66 % marques, 20 % brevets, 14 % dessins"
            >
              <span>
                93<small>titres fictifs</small>
              </span>
            </div>
            <ul className={styles.legend}>
              <li>
                <i />
                Marques · 66 %
              </li>
              <li>
                <i />
                Brevets · 20 %
              </li>
              <li>
                <i />
                Dessins · 14 %
              </li>
            </ul>
          </div>
        </Panel>
        <Panel title="Mouvements récents">
          <ActivityList
            items={[
              {
                title: "Marque « Okoumé Excellence »",
                meta: "Classe 19 · dépôt fictif",
                status: "Démo",
              },
              {
                title: "Brevet de séchage solaire",
                meta: "Technologie propre · dépôt fictif",
                status: "Démo",
              },
              {
                title: "Modèle d’emballage local",
                meta: "Dessin industriel · dépôt fictif",
                status: "Démo",
              },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Parcours d'orientation propriété industrielle">
        <div className={styles.cards}>
          {orientationFlow.map(([step, title, desc]) => (
            <div key={step} className={styles.institutionCard} style={{ gridTemplateColumns: "auto 1fr" }}>
              <div className={styles.cardIcon}>{step}</div>
              <div>
                <h2>{title}</h2>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className={styles.twoColumns}>
        <Panel title="Garde-fous juridiques">
          <ul className={styles.timeline}>
            {safeguards.map((rule) => (
              <li key={rule} className={styles.done}>
                <strong>{rule}</strong>
                <span>Principe institutionnel · OGAPI autorité de référence</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Cas d'usage démontrables">
          <ActivityList
            items={[
              {
                title: "Produit Made in Gabon à protéger",
                meta: "Orientation marque · opérateur agroalimentaire",
                status: "Conseillé",
              },
              {
                title: "Procédé de séchage innovant",
                meta: "Signal innovation 4.0 · brevet potentiel",
                status: "À qualifier",
              },
              {
                title: "Design d'emballage industriel",
                meta: "Dessin ou modèle · confidentialité requise",
                status: "Sensible",
              },
            ]}
          />
        </Panel>
      </div>
      <div className={styles.notice}>
        <strong>Prototype proposé</strong>
        <p>
          Ces indicateurs sont exclusivement démonstratifs. La validation juridique et
          l’interconnexion OGAPI restent à réaliser. La PNPI oriente, consolide et trace les
          échanges autorisés, sans attribuer elle-même des titres de propriété industrielle.
        </p>
      </div>
    </InstitutionalView>
  );
}
