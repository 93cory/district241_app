import { ActivityList, InstitutionalView, Panel, styles } from "../_components/InstitutionalView";
import { canViewMinisterCockpit, requireInstitutionAccess } from "../_components/access";

export default async function AganorPage() {
  const profile = await requireInstitutionAccess();
  const exchangeFlow = [
    ["1", "Détection PNPI", "Un dossier ATI ou une inspection nécessite une vérification normative."],
    ["2", "Demande d'avis", "La PNPI prépare une demande structurée avec pièces, contexte et traçabilité."],
    ["3", "Traitement AGANOR", "AGANOR reste responsable de l'analyse, du certificat ou de l'avis technique."],
    ["4", "Retour contrôlé", "La PNPI reçoit le statut, la référence, la date et les observations autorisées."],
  ];
  const competenceRules = [
    "La PNPI ne délivre pas de certificat de normalisation à la place d'AGANOR.",
    "Les statuts affichés sont des informations de coordination, à valider par convention d'échange.",
    "Toute donnée sensible transmise doit être minimisée, journalisée et limitée au dossier concerné.",
    "Le certificat ou avis AGANOR reste rattaché à sa référence officielle.",
  ];
  return (
    <InstitutionalView
      prototype
      canViewMinister={canViewMinisterCockpit(profile.roles ?? [])}
      eyebrow="Agence Gabonaise de Normalisation"
      title="Tableau de bord AGANOR"
      description="Vision de démonstration du suivi des normes, certifications et contrôles de conformité."
      metrics={[
        { label: "Dossiers démo", value: "148", detail: "Volume fictif" },
        { label: "Certificats démo", value: "326", detail: "Données fictives" },
        { label: "Délai démo", value: "18 j", detail: "Objectif simulé" },
        { label: "Conformité démo", value: "87 %", detail: "Contrôles fictifs", tone: "gold" },
      ]}
    >
      <div className={styles.twoColumns}>
        <Panel title="Répartition des dossiers">
          <div className={styles.bars}>
            {[
              ["Agroalimentaire", 72],
              ["Bois", 58],
              ["BTP", 44],
              ["Chimie", 31],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <i>
                  <b style={{ width: `${value}%` }} />
                </i>
                <em>{value}%</em>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Contrôles récents">
          <ActivityList
            items={[
              {
                title: "GA-NOR-DEMO-118",
                meta: "Farines et produits céréaliers",
                status: "Démo",
              },
              {
                title: "GA-NOR-DEMO-114",
                meta: "Matériaux de construction",
                status: "Démo",
              },
              { title: "GA-NOR-DEMO-109", meta: "Produits forestiers", status: "Démo" },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Canal d'échange PNPI ↔ AGANOR">
        <div className={styles.cards}>
          {exchangeFlow.map(([step, title, desc]) => (
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
        <Panel title="Règles de compétence à conserver">
          <ul className={styles.timeline}>
            {competenceRules.map((rule) => (
              <li key={rule} className={styles.done}>
                <strong>{rule}</strong>
                <span>Principe institutionnel · AGANOR autorité de référence</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Demandes simulées prêtes pour la démo">
          <ActivityList
            items={[
              {
                title: "Avis norme emballage agroalimentaire",
                meta: "ATI agroalimentaire · pièces jointes prêtes",
                status: "À envoyer",
              },
              {
                title: "Vérification certificat bois",
                meta: "Dossier RIN · référence certificat à confirmer",
                status: "En attente",
              },
              {
                title: "Contrôle conformité matériaux",
                meta: "Inspection BTP · non-conformité potentielle",
                status: "Prioritaire",
              },
            ]}
          />
        </Panel>
      </div>
      <div className={styles.notice}>
        <strong>Prototype proposé</strong>
        <p>
          Tous les chiffres affichés dans cet espace sont des données de démonstration. Aucune
          connexion au système AGANOR n’est active. Le principe cible est un échange sécurisé
          d'informations, sans transfert de compétence juridique vers la PNPI.
        </p>
      </div>
    </InstitutionalView>
  );
}
