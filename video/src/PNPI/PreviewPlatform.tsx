import { AbsoluteFill, interpolate, Img, staticFile, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Screen {
  src: string;
  caption: string;
  sublabel: string;
  accent: string;
}

const SCREENS: Screen[] = [
  {
    src: "screen-dashboard.png",
    caption: "Tableau de bord ministériel",
    sublabel: "Briefing du jour, KPIs nationaux, carte temps réel",
    accent: "#003DA5",
  },
  {
    src: "screen-ati.png",
    caption: "Gestion des Agréments Techniques Industriels",
    sublabel: "78 dossiers · filtres par secteur, province, statut SLA",
    accent: "#009E60",
  },
  {
    src: "screen-map.png",
    caption: "Carte interactive nationale",
    sublabel: "35 opérateurs géolocalisés sur les 9 provinces",
    accent: "#FCD116",
  },
  {
    src: "screen-opendata.png",
    caption: "Open Data · transparence publique",
    sublabel: "Statistiques agrégées, anonymisées, ouvertes à tous",
    accent: "#009E60",
  },
];

const SCREEN_DURATION = 75; // frames per screen (2.5 s @ 30 fps)
const CROSSFADE = 18;

export const PreviewPlatform: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header label "L'application en production"
  const headerSpring = spring({ frame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        paddingTop: 60,
      }}
    >
      <div
        style={{
          opacity: headerSpring,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
          letterSpacing: "0.32em",
          color: "#FCD116",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        L&apos;application en production
      </div>

      <div
        style={{
          position: "relative",
          width: 1500,
          height: 800,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 32px 96px rgba(0,0,0,0.5), 0 0 0 1px rgba(252,209,22,0.18)",
          background: "#0a1628",
        }}
      >
        {SCREENS.map((s, i) => {
          const start = i * SCREEN_DURATION;
          const end = start + SCREEN_DURATION;
          // Opacity: fade in/out with overlap
          const opacity = interpolate(
            frame,
            [start - CROSSFADE, start, end - CROSSFADE, end],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          if (opacity <= 0.001) return null;
          // Ken Burns: slow zoom + slight pan
          const localT = (frame - start) / SCREEN_DURATION;
          const scale = 1 + localT * 0.05;
          const translateX = (i % 2 === 0 ? -1 : 1) * localT * 12;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                opacity,
                transform: `scale(${scale}) translateX(${translateX}px)`,
              }}
            >
              <Img
                src={staticFile(s.src)}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          );
        })}

        {/* Edge gradient overlay to fade content into the dark frame */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(5,27,54,0) 0%, rgba(5,27,54,0) 70%, rgba(5,27,54,0.88) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Captions cycling per screen */}
      <div style={{ height: 70, marginTop: 6, position: "relative", width: 1500 }}>
        {SCREENS.map((s, i) => {
          const start = i * SCREEN_DURATION;
          const end = start + SCREEN_DURATION;
          const opacity = interpolate(
            frame,
            [start - 8, start + 8, end - 16, end],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const slideY = interpolate(
            frame,
            [start - 8, start + 8],
            [12, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          if (opacity <= 0.001) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                opacity,
                transform: `translateY(${slideY}px)`,
                textAlign: "center",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.005em",
                  marginBottom: 4,
                }}
              >
                {s.caption}
              </div>
              <div style={{ fontSize: 16, color: "#94a3b8" }}>{s.sublabel}</div>
            </div>
          );
        })}
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {SCREENS.map((s, i) => {
          const start = i * SCREEN_DURATION;
          const end = start + SCREEN_DURATION;
          const isActive = frame >= start && frame < end;
          return (
            <div
              key={i}
              style={{
                width: isActive ? 28 : 10,
                height: 4,
                borderRadius: 2,
                background: isActive ? s.accent : "#ffffff30",
                transition: "all 0.3s",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const PREVIEW_DURATION = SCREENS.length * SCREEN_DURATION; // 4 × 75 = 300 frames = 10 s
