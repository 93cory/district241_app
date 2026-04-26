import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { FlagBand } from "./FlagBand";
import { LogoIntro } from "./LogoIntro";
import { Tagline } from "./Tagline";
import { PreviewPlatform, PREVIEW_DURATION } from "./PreviewPlatform";
import { StatCard } from "./StatCard";
import { Closing } from "./Closing";

export const PNPI_FPS = 30;

// ---- Timeline (frames @ 30 fps) ----
const FLAG = { from: 0, len: 60 }; //   0–2 s
const LOGO = { from: 60, len: 120 }; // 2–6 s
const TAGLINE = { from: 180, len: 90 }; // 6–9 s
const PREVIEW = { from: 270, len: PREVIEW_DURATION }; // 9–19 s
const STAT_LEN = 90; // 3 s each
const STAT1 = { from: PREVIEW.from + PREVIEW.len, len: STAT_LEN }; // 19–22 s
const STAT2 = { from: STAT1.from + STAT_LEN, len: STAT_LEN }; //      22–25 s
const STAT3 = { from: STAT2.from + STAT_LEN, len: STAT_LEN }; //      25–28 s
const STAT4 = { from: STAT3.from + STAT_LEN, len: STAT_LEN }; //      28–31 s
const CLOSING = { from: STAT4.from + STAT_LEN, len: 270 }; //         31–40 s

export const PNPI_DURATION = CLOSING.from + CLOSING.len; // 1200 frames = 40 s

const GREEN = "#009E60";
const YELLOW = "#FCD116";
const BLUE = "#003DA5";

export const PNPI: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, PNPI_DURATION], [1, 1.04]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#051B36",
        backgroundImage:
          "radial-gradient(ellipse at top, #0a3060 0%, #051B36 60%, #03101f 100%)",
      }}
    >
      <AbsoluteFill style={{ opacity: 0.08 }}>
        <Particles />
      </AbsoluteFill>

      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Sequence from={FLAG.from} durationInFrames={LOGO.from + LOGO.len + 60}>
          <FlagBand green={GREEN} yellow={YELLOW} blue={BLUE} />
        </Sequence>

        <Sequence from={LOGO.from} durationInFrames={LOGO.len + TAGLINE.len}>
          <LogoIntro yellow={YELLOW} />
        </Sequence>

        <Sequence from={TAGLINE.from} durationInFrames={TAGLINE.len + 30}>
          <Tagline yellow={YELLOW} />
        </Sequence>

        <Sequence from={PREVIEW.from} durationInFrames={PREVIEW.len}>
          <PreviewPlatform />
        </Sequence>

        <Sequence from={STAT1.from} durationInFrames={STAT1.len}>
          <StatCard
            value="50"
            unit="%"
            label="de délai en moins"
            sublabel="Traitement des dossiers ATI"
            accent={GREEN}
            index={0}
          />
        </Sequence>

        <Sequence from={STAT2.from} durationInFrames={STAT2.len}>
          <StatCard
            value="6"
            unit="rôles"
            label="Profils utilisateurs"
            sublabel="Admin · Ministre · Directeur · Instructeur · Inspecteur · Opérateur"
            accent={YELLOW}
            index={1}
          />
        </Sequence>

        <Sequence from={STAT3.from} durationInFrames={STAT3.len}>
          <StatCard
            value="9"
            unit="provinces"
            label="Couverture nationale"
            sublabel="Une plateforme unique pour tout le Gabon"
            accent={BLUE}
            index={2}
          />
        </Sequence>

        <Sequence from={STAT4.from} durationInFrames={STAT4.len}>
          <StatCard
            value="100"
            unit="%"
            label="Décisions tracées"
            sublabel="Audit trail intégral · transparence ministérielle"
            accent={GREEN}
            index={3}
          />
        </Sequence>

        <Sequence from={CLOSING.from} durationInFrames={CLOSING.len}>
          <Closing green={GREEN} yellow={YELLOW} blue={BLUE} />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 60 }, (_, i) => i);
  return (
    <>
      {dots.map((i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const x = (seed / 233280) * 1920;
        const y = ((seed * 1.3) % 233280) / 233280 * 1080;
        const size = 1 + ((i * 7) % 4);
        const drift = Math.sin(frame * 0.02 + i) * 30;
        const opacity = 0.4 + Math.sin(frame * 0.04 + i) * 0.4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + drift,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#FCD116",
              opacity,
            }}
          />
        );
      })}
    </>
  );
};
