"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Kpis = {
  atis_total?: number;
  atis_en_cours?: number;
  atis_en_retard?: number;
  operateurs_actifs?: number;
};

type Slide = {
  section: string;
  title: string;
  statement: string;
  points?: readonly string[];
  href?: string;
  action?: string;
  tone?: "opening" | "decision";
  roles?: readonly {
    name: string;
    responsibility: string;
  }[];
};

const SLIDES: readonly Slide[] = [
  {
    section: "Plateforme nationale de pilotage industriel · PNPI",
    title: "Voir l’industrie. Décider avec méthode. Rendre compte.",
    statement: "Une plateforme nationale pour relier la décision publique, les procédures industrielles et la réalité du terrain.",
    tone: "opening",
  },
  {
    section: "L’enjeu politique",
    title: "Piloter sans vision consolidée, c’est décider trop tard.",
    statement: "Lorsque dossiers, données opérateurs et constats terrain restent dispersés, les priorités nationales sont plus difficiles à lire, à arbitrer et à suivre.",
    points: ["Une information fragmentée", "Des alertes tardives", "Une responsabilité difficile à retracer"],
  },
  {
    section: "La vision",
    title: "La PNPI transforme des données dispersées en capacité d’action.",
    statement: "Un même socle relie le Cabinet, les directions, les contrôleurs et les opérateurs, tout en préservant les responsabilités de chacun.",
    points: ["Voir : une lecture consolidée", "Agir : des procédures maîtrisées", "Rendre compte : des décisions traçables"],
    href: "/pnpi",
    action: "Voir la vision nationale",
  },
  {
    section: "Gouvernance des usages",
    title: "Une plateforme, six responsabilités, une même chaîne de confiance.",
    statement: "Chacun voit et agit selon sa responsabilité. Ensemble, ces actions alimentent une chaîne nationale traçable, du dépôt jusqu’à la décision publique.",
    roles: [
      { name: "Opérateur", responsibility: "Dépose, complète et suit ses dossiers" },
      { name: "Instructeur", responsibility: "Vérifie, instruit et demande les compléments" },
      { name: "Inspecteur", responsibility: "Contrôle sur le terrain et documente les constats" },
      { name: "Directeur", responsibility: "Répartit, supervise et arbitre" },
      { name: "Ministre", responsibility: "Voit, priorise et décide" },
      { name: "Administrateur", responsibility: "Gère comptes, rôles, workflows, sécurité et audit" },
    ],
    href: "/pnpi/portail",
    action: "Voir les parcours utilisateurs",
  },
  {
    section: "Démontrable aujourd’hui · Cockpit ministériel",
    title: "Le Ministre voit l’essentiel et remonte jusqu’à la preuve.",
    statement: "Le cockpit rassemble les indicateurs disponibles, fait apparaître les alertes et permet de revenir au dossier qui exige une action.",
    href: "/pnpi",
    action: "Voir le cockpit",
  },
  {
    section: "À consolider pendant le pilote · Registre industriel national",
    title: "Une seule référence pour connaître chaque opérateur industriel.",
    statement: "Identité, sites, activités, produits, documents et historique sont réunis autour d’une fiche de référence appelée à être fiabilisée avec les métiers.",
    points: ["Unicité de l’opérateur", "Lecture par site et activité", "Historique partagé et maîtrisé"],
    href: "/pnpi/operateurs",
    action: "Voir le registre industriel",
  },
  {
    section: "Démontrable aujourd’hui · Agrément technique industriel",
    title: "Chaque ATI devient lisible, suivi et reconstituable.",
    statement: "Dépôt, recevabilité, instruction, compléments, validation et décision : le dossier progresse sans rupture de chaîne ni étape invisible.",
    points: ["Un statut compréhensible", "Des responsabilités explicites", "Un historique reconstituable"],
    href: "/pnpi/ati/processing-center",
    action: "Voir le parcours ATI",
  },
  {
    section: "À consolider pendant le pilote · Contrôle terrain",
    title: "La décision administrative reste reliée à la réalité du terrain.",
    statement: "Missions, constats, non-conformités et actions correctives s’inscrivent dans une même continuité de contrôle. L’usage mobile et hors connexion sera éprouvé pendant le pilote.",
    points: ["Planifier la mission", "Structurer le constat", "Suivre la mise en conformité"],
    href: "/pnpi/inspections/control-center",
    action: "Voir le contrôle terrain",
  },
  {
    section: "À consolider pendant le pilote · Observatoire national de l’industrie",
    title: "Les dossiers deviennent une lecture de la politique industrielle.",
    statement: "L’ONI transforme les données officiellement validées en lectures territoriales et sectorielles utiles au pilotage.",
    points: ["Comparer les territoires", "Lire les dynamiques par filière", "Identifier les concentrations et alertes"],
    href: "/pnpi/oni",
    action: "Voir l’Observatoire",
  },
  {
    section: "À consolider pendant le pilote · Coordination institutionnelle",
    title: "Mieux coopérer, sans confondre les mandats.",
    statement: "La PNPI prépare des échanges structurés et traçables. Chaque institution conserve ses compétences, ses validations et la responsabilité de ses décisions.",
    points: ["Des rôles clairement séparés", "Des API partenaires à cadrer", "Aucun raccordement réel présumé"],
    href: "/pnpi/institutions",
    action: "Voir la coordination",
  },
  {
    section: "Bénéfice ministériel",
    title: "Voir plus tôt. Arbitrer plus vite. Exiger des résultats.",
    statement: "La PNPI donne au Ministre une chaîne de confiance entre l’indicateur national, l’action des services et la preuve opérationnelle.",
    points: ["Prioriser sur des faits", "Suivre l’exécution", "Rendre compte avec des preuves"],
  },
  {
    section: "Trajectoire maîtrisée",
    title: "Le futur se construit sur un socle fiable, pas sur une promesse.",
    statement: "La généralisation n’intervient qu’après validation des usages, de la qualité des données, de la sécurité et de la gouvernance.",
    points: ["Aujourd’hui : un socle démontrable", "Pilote : mobile hors connexion et API partenaires à consolider", "Perspective : automatisation et analyses avancées"],
  },
  {
    section: "Perspective stratégique · Intelligence artificielle",
    title: "L’IA assistera l’administration ; elle ne décidera jamais à sa place.",
    statement: "À terme, des fonctions d’IA et d’OCR pourront détecter des incohérences, résumer un dossier et signaler un risque. Elles ne signeront, ne sanctionneront et ne prendront aucune décision administrative.",
    points: ["Détecter et vérifier", "Résumer et alerter", "Décision humaine, habilitée et tracée"],
    href: "/pnpi/predictions",
    action: "Voir les analyses exploratoires",
  },
  {
    section: "Souveraineté et sécurité",
    title: "La confiance se décide avant la mise en production.",
    statement: "Habilitations, journalisation et protection des données forment le socle actuel. Hébergement, continuité, homologation et gouvernance de l’IA devront être formellement arrêtés.",
    points: ["Accès selon la responsabilité", "Actions sensibles traçables", "Déploiement soumis à validation de sécurité"],
    href: "/pnpi/securite",
    action: "Voir les garanties",
  },
  {
    section: "Décision sollicitée",
    title: "Autoriser un pilote pour transformer la preuve en capacité nationale.",
    statement: "Valider le principe du pilote, désigner un sponsor et les référents métier, puis mandater l’atelier qui arrêtera le périmètre, les critères de succès et le calendrier.",
    points: ["Valider le principe", "Désigner la gouvernance", "Engager l’atelier de cadrage"],
    tone: "decision",
  },
];

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("fr-FR") : "—";
}

export default function PresentationPage() {
  const [active, setActive] = useState(0);
  const [kpis, setKpis] = useState<Kpis>({});
  const [kpiStatus, setKpiStatus] = useState<"loading" | "ready" | "partial" | "unavailable">("loading");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  const goTo = useCallback((index: number) => {
    setActive(Math.max(0, Math.min(SLIDES.length - 1, index)));
  }, []);

  useEffect(() => {
    fetch("/api/pnpi/dashboard/kpis")
      .then((response) => {
        if (!response.ok) throw new Error("Indicateurs indisponibles");
        return response.json();
      })
      .then((data: unknown) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Format invalide");
        const received = data as Kpis;
        const values = [received.atis_total, received.atis_en_cours, received.atis_en_retard, received.operateurs_actifs];
        const available = values.filter((value) => typeof value === "number" && Number.isFinite(value)).length;
        setKpis(received);
        setKpiStatus(available === values.length ? "ready" : available > 0 ? "partial" : "unavailable");
      })
      .catch(() => setKpiStatus("unavailable"));
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches("a, button, input, textarea, select")) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goTo(active + 1);
      }
      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(active - 1);
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(SLIDES.length - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, goTo]);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [active]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    }
  };

  const slide = SLIDES[active];
  const isCockpit = slide.section.includes("Cockpit ministériel");
  const kpiCards = [
    ["ATI suivies", kpis.atis_total],
    ["Dossiers en cours", kpis.atis_en_cours],
    ["Alertes de délai", kpis.atis_en_retard],
    ["Opérateurs actifs", kpis.operateurs_actifs],
  ] as const;

  return (
    <main ref={stageRef} className={`demo-ministerielle demo-ministerielle--${slide.tone ?? "default"}`}>
      <div className="demo-ministerielle-tricolore" aria-hidden="true" />
      <header className="demo-ministerielle-topbar">
        <Link href="/pnpi" className="demo-ministerielle-brand" aria-label="Retour à la PNPI">
          <span>République Gabonaise</span>
          <strong>PNPI</strong>
        </Link>
        <div className="demo-ministerielle-tools">
          <span aria-live="polite">{String(active + 1).padStart(2, "0")} / {SLIDES.length}</span>
          <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Quitter le plein écran" : "Entrer en plein écran"}>
            {isFullscreen ? "Quitter le plein écran" : "Entrer en plein écran"}
          </button>
        </div>
      </header>

      <section className="demo-ministerielle-slide" aria-labelledby="demo-slide-title">
        <div className="demo-ministerielle-copy">
          <p className="demo-ministerielle-section">{slide.section}</p>
          <h1 id="demo-slide-title" ref={titleRef} tabIndex={-1}>{slide.title}</h1>
          <p className="demo-ministerielle-statement">{slide.statement}</p>

          {isCockpit && (
            <div className="demo-ministerielle-kpis" aria-label="Indicateurs du cockpit national">
              {kpiCards.map(([label, value]) => (
                <article key={label}>
                  <strong>{kpiStatus === "loading" ? "…" : safeNumber(value)}</strong>
                  <span>{label}</span>
                </article>
              ))}
              <p className="demo-ministerielle-data-note">
                {kpiStatus === "ready"
                  ? "Données disponibles dans l’environnement de démonstration."
                  : kpiStatus === "partial"
                    ? "Données partielles dans l’environnement de démonstration — les valeurs absentes ne sont pas extrapolées."
                    : kpiStatus === "loading"
                      ? "Chargement des données de démonstration…"
                      : "Données de démonstration indisponibles — aucune valeur n’est extrapolée."}
              </p>
            </div>
          )}

          {slide.points && (
            <ul className="demo-ministerielle-points">
              {slide.points.map((point, index) => <li key={point}><span>{String(index + 1).padStart(2, "0")}</span>{point}</li>)}
            </ul>
          )}

          {slide.roles && (
            <ol className="demo-ministerielle-role-chain" aria-label="Chaîne des responsabilités de la PNPI">
              {slide.roles.map((role, index) => (
                <li key={role.name}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{role.name}</strong>
                    <p>{role.responsibility}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {slide.href && slide.action && (
            <Link className="demo-ministerielle-demo-link" href={slide.href} target="_blank" rel="noreferrer">
              {slide.action}<span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
        <div className="demo-ministerielle-mark" aria-hidden="true">
          <span>{String(active + 1).padStart(2, "0")}</span>
          <i />
        </div>
      </section>

      <footer className="demo-ministerielle-footer">
        <nav className="demo-ministerielle-dots" aria-label="Sommaire de la présentation">
          {SLIDES.map((item, index) => (
            <button key={item.title} type="button" onClick={() => goTo(index)} className={index === active ? "is-active" : ""} aria-current={index === active ? "step" : undefined} aria-label={`${index + 1}. ${item.section}`} />
          ))}
        </nav>
        <div className="demo-ministerielle-nav">
          <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0}>Précédent</button>
          <button type="button" className="is-primary" onClick={() => goTo(active + 1)} disabled={active === SLIDES.length - 1}>Suivant</button>
        </div>
      </footer>
      <div className="demo-ministerielle-progress" aria-hidden="true"><span style={{ width: `${((active + 1) / SLIDES.length) * 100}%` }} /></div>
    </main>
  );
}
