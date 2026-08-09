"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentSessionUser, userScopedStorageKey } from "../../../lib/user-scoped-storage";

interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "debutant" | "intermediaire" | "avance";
  roles?: string[];
  steps: {
    title: string;
    content: string;
    quiz?: { question: string; options: string[]; correct: number };
  }[];
}

const MODULES: Module[] = [
  {
    id: "m1",
    title: "Prise en main PNPI",
    description: "Decouverte de la plateforme et navigation de base.",
    duration: "10 min",
    difficulty: "debutant",
    steps: [
      {
        title: "Connexion",
        content:
          "Rendez-vous sur pnpi-gabon.ga et connectez-vous avec vos identifiants. Si c'est votre premiere connexion, activez la 2FA dans votre profil pour securiser votre compte.",
      },
      {
        title: "Navigation",
        content:
          "La barre de navigation en haut affiche les sections accessibles selon votre role. Utilisez les raccourcis clavier (appuyez sur '?') pour naviguer plus rapidement.",
      },
      {
        title: "Dashboard",
        content:
          "Votre tableau de bord affiche les KPIs cles : ATIs en cours, taux d'approbation, alertes SLA. Personnalisez-le via 'Config Dashboard' ou creez un dashboard custom via 'Mon dashboard'.",
      },
      {
        title: "Quiz",
        content: "Testez vos connaissances !",
        quiz: {
          question: "Quel raccourci affiche l'aide clavier ?",
          options: ["Ctrl+H", "?", "F1", "Ctrl+K"],
          correct: 1,
        },
      },
    ],
  },
  {
    id: "m2",
    title: "Soumettre un ATI",
    description: "Guide complet pour deposer une demande d'agrement.",
    duration: "15 min",
    difficulty: "debutant",
    roles: ["operateur", "instructeur", "admin"],
    steps: [
      {
        title: "Acces au guichet",
        content:
          "Allez dans 'Mon espace' (operateurs) ou 'File ATI' (instructeurs). Cliquez 'Soumettre un ATI' ou utilisez un modele pre-rempli pour gagner du temps.",
      },
      {
        title: "Remplir le formulaire",
        content:
          "Selectionnez le secteur, decrivez l'activite industrielle en detail. Les champs obligatoires sont marques d'un asterisque (*). La validation en temps reel vous guide.",
      },
      {
        title: "Documents",
        content:
          "Joignez tous les documents requis. La checklist de conformite (generee automatiquement) vous indique les pieces manquantes. Chaque document peut avoir plusieurs versions.",
      },
      {
        title: "Suivi",
        content:
          "Apres soumission, suivez votre dossier via la timeline. Le compteur SLA indique le temps restant. Vous recevrez des notifications a chaque changement de statut.",
      },
      {
        title: "Quiz",
        content: "Verifiez vos acquis.",
        quiz: {
          question: "Ou trouver la checklist des documents requis ?",
          options: [
            "Dans l'email",
            "Sur la page detail ATI",
            "Dans le profil",
            "Dans les parametres",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    id: "m3",
    title: "Instruire un dossier",
    description: "Processus d'instruction pour les instructeurs PNPI.",
    duration: "20 min",
    difficulty: "intermediaire",
    roles: ["instructeur", "directeur", "admin"],
    steps: [
      {
        title: "File d'attente",
        content:
          "Consultez 'Mes Dossiers' pour voir les ATI qui vous sont assignes. Le Kanban offre une vue pipeline avec glisser-deposer. Triez par urgence SLA.",
      },
      {
        title: "Analyse",
        content:
          "Ouvrez le dossier. Verifiez la checklist, consultez le scoring de risque et la recommandation IA. Ajoutez des commentaires internes (invisibles pour l'operateur).",
      },
      {
        title: "Decision",
        content:
          "Utilisez le bouton de transition pour approuver, rejeter ou demander des complements. Les lettres officielles sont generees automatiquement.",
      },
      {
        title: "Quiz",
        content: "",
        quiz: {
          question: "Que signifie un score de risque 'eleve' ?",
          options: [
            "Dossier prioritaire",
            "Vigilance accrue recommandee",
            "Rejet automatique",
            "Erreur systeme",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    id: "m4",
    title: "Realiser une inspection",
    description: "Guide terrain pour les inspecteurs de conformite.",
    duration: "15 min",
    difficulty: "intermediaire",
    roles: ["inspecteur", "directeur", "admin"],
    steps: [
      {
        title: "Preparation",
        content:
          "Consultez le calendrier des inspections et le dossier de l'operateur. Verifiez votre localisation GPS (geofencing) avant de commencer.",
      },
      {
        title: "Sur le terrain",
        content:
          "Utilisez l'app mobile Flutter pour scanner les QR codes, prendre des photos d'evidence et remplir le formulaire d'inspection.",
      },
      {
        title: "Rapport",
        content:
          "Le rapport PDF est genere automatiquement. Il peut etre telecharge et signe electroniquement par le directeur.",
      },
    ],
  },
  {
    id: "m5",
    title: "Administration avancee",
    description: "Gestion des utilisateurs, workflows et monitoring.",
    duration: "25 min",
    difficulty: "avance",
    roles: ["admin", "directeur"],
    steps: [
      {
        title: "Utilisateurs",
        content:
          "Creez des comptes individuellement ou par import CSV. Assignez les roles et provinces. Gerez les delegations et les 2FA.",
      },
      {
        title: "Workflows",
        content:
          "Consultez les regles automatiques dans 'Workflows'. Le moteur execute les actions (notifications, tags, assignation) lors des transitions ATI.",
      },
      {
        title: "Monitoring",
        content:
          "Surveillez les performances via 'API Usage', 'Integrations' et Grafana. Les alertes intelligentes detectent les anomalies automatiquement.",
      },
      {
        title: "Quiz",
        content: "",
        quiz: {
          question: "Quel outil surveille la sante des integrations ?",
          options: ["Grafana", "Page Integrations", "Prometheus", "Les trois"],
          correct: 3,
        },
      },
    ],
  },
  {
    id: "rin-operateur",
    title: "Gerer ma fiche RIN 360°",
    description: "Comprendre les donnees industrielles a renseigner et leur validation.",
    duration: "18 min",
    difficulty: "debutant",
    roles: ["operateur"],
    steps: [
      {
        title: "Ou trouver ma fiche RIN ?",
        content:
          "Depuis Mon guichet, utilisez le bloc 'Ma fiche RIN 360°'. La fiche regroupe votre identite industrielle, vos sites, produits, ressources, investissements et donnees de validation.",
      },
      {
        title: "Quelles donnees completer ?",
        content:
          "Priorisez les representants, le site principal, les produits fabriques, les capacites annuelles, les matieres premieres, l'energie et les investissements. Ces informations alimentent les statistiques du Ministere.",
      },
      {
        title: "Bonnes pratiques",
        content:
          "Renseignez uniquement des informations exactes et actualisees. Si une donnee change, modifiez-la puis laissez l'administration verifier et valider la nouvelle version.",
      },
      {
        title: "Quiz",
        content: "Validez votre comprehension du RIN.",
        quiz: {
          question: "A quoi sert principalement la fiche RIN 360° ?",
          options: [
            "A decorer la page",
            "A centraliser les donnees industrielles officielles de l'entreprise",
            "A remplacer tous les documents juridiques",
            "A supprimer le controle administratif",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    id: "operateur-suivi-ati",
    title: "Suivre correctement mes ATI",
    description: "Relire un dossier, comprendre les statuts et repondre aux demandes.",
    duration: "14 min",
    difficulty: "debutant",
    roles: ["operateur"],
    steps: [
      {
        title: "Mes demandes",
        content:
          "Dans Mon guichet, la colonne 'Mes demandes recentes' affiche les dossiers que vous avez soumis. Cliquez sur un dossier pour voir sa timeline, ses documents et ses commentaires.",
      },
      {
        title: "Comprendre les statuts",
        content:
          "Soumis signifie que le dossier est depose. En instruction signifie qu'il est analyse. En validation signifie qu'il attend une decision. Approuve ou rejete cloturent la decision administrative.",
      },
      {
        title: "Reagir aux demandes",
        content:
          "Si l'administration demande un complement, ajoutez le document ou corrigez l'information depuis le dossier concerne. Evitez les doublons et nommez clairement vos fichiers.",
      },
    ],
  },
  {
    id: "instructeur-rin-validation",
    title: "Verifier et valider les donnees RIN",
    description: "Controle qualite des sous-fiches industrielles avant decision.",
    duration: "20 min",
    difficulty: "intermediaire",
    roles: ["instructeur", "directeur", "admin"],
    steps: [
      {
        title: "Lire la fiche 360°",
        content:
          "Depuis Operateurs > Fiche RIN 360°, verifiez la coherence entre identite, activites ATI, sites, produits, capacites, ressources et investissements.",
      },
      {
        title: "Statuts de validation",
        content:
          "Brouillon indique une donnee interne ou non finalisee. Soumis vient generalement de l'operateur. Verifie signale une correction controlee. Valide signifie que la donnee est exploitable pour pilotage.",
      },
      {
        title: "Traçabilite",
        content:
          "Chaque validation doit pouvoir etre expliquee. Ajoutez une note si necessaire et archivez les informations obsoletees au lieu de les supprimer brutalement.",
      },
      {
        title: "Quiz",
        content: "",
        quiz: {
          question: "Que faire si une donnee validee est modifiee ?",
          options: [
            "La laisser validee sans controle",
            "La reverifier avant de la revalider",
            "Supprimer toute la fiche",
            "Ignorer le changement",
          ],
          correct: 1,
        },
      },
    ],
  },
  {
    id: "ministre-pilotage",
    title: "Lire les tableaux de bord ministeriels",
    description: "Utiliser les indicateurs pour arbitrer et piloter la politique industrielle.",
    duration: "16 min",
    difficulty: "intermediaire",
    roles: ["ministre", "directeur", "admin"],
    steps: [
      {
        title: "Vision d'ensemble",
        content:
          "Le Dashboard PNPI donne la situation nationale : ATIs, operateurs actifs, inspections, secteurs dynamiques et alertes prioritaires.",
      },
      {
        title: "RIN national",
        content:
          "Le Cockpit RIN permet d'identifier les fiches completes, les fiches prioritaires et les manques structurants pour ameliorer la statistique industrielle.",
      },
      {
        title: "Questions utiles en reunion",
        content:
          "Demandez : quels secteurs progressent ? quelles provinces sont sous-documentees ? quels dossiers bloquent ? quelles donnees manquent pour prendre une decision fiable ?",
      },
    ],
  },
  {
    id: "admin-securite-isolation",
    title: "Securite, roles et isolation des donnees",
    description: "Comprendre les responsabilites admin sur les comptes et les donnees.",
    duration: "22 min",
    difficulty: "avance",
    roles: ["admin"],
    steps: [
      {
        title: "Principe de moindre privilege",
        content:
          "Chaque utilisateur doit disposer uniquement des droits necessaires : operateur pour ses dossiers, instructeur pour l'instruction, inspecteur pour le terrain, directeur/ministre pour le pilotage.",
      },
      {
        title: "Postes partages",
        content:
          "Sur un poste partage, chaque agent doit se deconnecter apres usage. Les preferences personnelles de PNPI sont isolees par utilisateur, mais une session ouverte reste une session active.",
      },
      {
        title: "Audit",
        content:
          "Les actions sensibles doivent rester tracables : creation, modification, validation, archivage et changement de statut. Le journal d'audit sert de piece de controle.",
      },
      {
        title: "Quiz",
        content: "",
        quiz: {
          question: "Quelle est la bonne pratique sur un poste partage ?",
          options: [
            "Partager le meme compte",
            "Se deconnecter et utiliser son propre compte nominatif",
            "Desactiver les mots de passe",
            "Utiliser toujours le compte admin",
          ],
          correct: 1,
        },
      },
    ],
  },
];

const DIFF_COLORS = { debutant: "#006233", intermediaire: "#0c7eb4", avance: "#7c3aed" };

export default function FormationPage() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const storageKey = useMemo(
    () => (username ? userScopedStorageKey("pnpi_training", username) : null),
    [username],
  );
  const visibleModules = useMemo(
    () =>
      MODULES.filter((module) => {
        if (!module.roles || module.roles.length === 0) return true;
        return module.roles.some((role) => roles.includes(role));
      }),
    [roles],
  );
  const visibleCompletedCount = visibleModules.filter((module) => completed.has(module.id)).length;
  const roleLabel = roles.length ? roles.join(" · ") : "profil connecte";

  useEffect(() => {
    let mounted = true;
    getCurrentSessionUser()
      .then((user) => {
        if (!mounted) return;
        setUsername(user.username);
        setRoles(user.roles);
      })
      .catch(() => {
        if (mounted) {
          setUsername("utilisateur");
          setRoles([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      setCompleted(new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")));
    } catch {
      setCompleted(new Set());
    }
  }, [storageKey]);

  const mod = visibleModules.find((m) => m.id === activeModule);
  const step = mod?.steps[stepIdx];

  const complete = (id: string) => {
    const next = new Set([...completed, id]);
    setCompleted(next);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    }
  };

  if (!mod) {
    return (
      <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Formation PNPI</h1>
        <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 4px" }}>
          Parcours {roleLabel} · {visibleCompletedCount}/{visibleModules.length} modules completes
        </p>
        <div style={{ height: 6, borderRadius: 3, background: "var(--line)", marginBottom: 20 }}>
          <div
            style={{
              height: "100%",
              borderRadius: 3,
              background: "#006233",
              width: `${(visibleCompletedCount / Math.max(visibleModules.length, 1)) * 100}%`,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleModules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveModule(m.id);
                setStepIdx(0);
                setQuizAnswer(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 20px",
                borderRadius: 14,
                background: "var(--bg-layer, #fff)",
                border: `1.5px solid ${completed.has(m.id) ? "#006233" : "var(--line, #dce4ef)"}`,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: completed.has(m.id) ? "#dcfce7" : "var(--bg-base)",
                  fontSize: 18,
                }}
              >
                {completed.has(m.id) ? "\u2705" : "\ud83d\udcda"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-soft)" }}>{m.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    background: `${DIFF_COLORS[m.difficulty]}12`,
                    color: DIFF_COLORS[m.difficulty],
                    textTransform: "capitalize",
                  }}
                >
                  {m.difficulty}
                </span>
                <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>
                  {m.duration}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 700, margin: "0 auto" }}>
      <button
        onClick={() => setActiveModule(null)}
        style={{
          background: "none",
          border: "none",
          fontSize: 13,
          color: "var(--text-soft)",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        &larr; Retour aux modules
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>{mod.title}</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {mod.steps.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= stepIdx ? "#006233" : "var(--line)",
            }}
          />
        ))}
      </div>

      <div className="chart-card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-soft)", marginBottom: 4 }}>
          Etape {stepIdx + 1}/{mod.steps.length}
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px" }}>{step?.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-main)" }}>{step?.content}</p>

        {step?.quiz && (
          <div
            style={{
              marginTop: 16,
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--bg-base)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              {step.quiz.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {step.quiz.options.map((opt, i) => {
                const isCorrect = i === step.quiz!.correct;
                const selected = quizAnswer === i;
                const answered = quizAnswer !== null;
                return (
                  <button
                    key={i}
                    onClick={() => !answered && setQuizAnswer(i)}
                    disabled={answered}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      textAlign: "left",
                      fontSize: 13,
                      cursor: answered ? "default" : "pointer",
                      border: `1.5px solid ${answered ? (isCorrect ? "#006233" : selected ? "#b42318" : "var(--line)") : "var(--line)"}`,
                      background:
                        answered && isCorrect
                          ? "#dcfce7"
                          : answered && selected && !isCorrect
                            ? "#fef2f2"
                            : "transparent",
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {quizAnswer !== null && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: quizAnswer === step.quiz.correct ? "#006233" : "#b42318",
                }}
              >
                {quizAnswer === step.quiz.correct
                  ? "\u2705 Bonne reponse !"
                  : "\u274c Mauvaise reponse. La bonne reponse est : " +
                    step.quiz.options[step.quiz.correct]}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => {
            setStepIdx(Math.max(0, stepIdx - 1));
            setQuizAnswer(null);
          }}
          disabled={stepIdx === 0}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            border: "1.5px solid var(--line)",
            background: "transparent",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            opacity: stepIdx === 0 ? 0.3 : 1,
          }}
        >
          Precedent
        </button>
        {stepIdx < mod.steps.length - 1 ? (
          <button
            onClick={() => {
              setStepIdx(stepIdx + 1);
              setQuizAnswer(null);
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: "#006233",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Suivant
          </button>
        ) : (
          <button
            onClick={() => {
              complete(mod.id);
              setActiveModule(null);
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: "#006233",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Terminer le module
          </button>
        )}
      </div>
    </div>
  );
}
