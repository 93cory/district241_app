import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  green: string;
  yellow: string;
  blue: string;
}

export const Closing: React.FC<Props> = ({ green, yellow, blue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 20, mass: 1 } });
  const sealSpring = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const titleSpring = spring({ frame: frame - 20, fps, config: { damping: 18 } });
  const ministSpring = spring({ frame: frame - 32, fps, config: { damping: 18 } });
  const motoSpring = spring({ frame: frame - 50, fps, config: { damping: 22 } });
  const flagSpring = spring({ frame: frame - 70, fps, config: { damping: 18 } });

  // Subtle glow pulse
  const glow = 1 + Math.sin(frame * 0.06) * 0.1;

  return (
    <AbsoluteFill
      style={{
        opacity: enter,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 28,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Seal */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${yellow}, #d9a91a)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900,
          fontSize: 52,
          color: "#051B36",
          boxShadow: `0 0 ${60 * glow}px ${yellow}80`,
          transform: `scale(${sealSpring})`,
          marginBottom: 16,
        }}
      >
        PNPI
      </div>

      {/* Hero title */}
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 800,
          fontSize: 64,
          color: "#fff",
          letterSpacing: "-0.02em",
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
          maxWidth: 1400,
          lineHeight: 1.1,
        }}
      >
        Une plateforme. <span style={{ color: yellow, fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif" }}>Six rôles.</span>{" "}
        <span style={{ color: green, fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif" }}>Un Gabon</span> souverain.
      </div>

      {/* Ministry */}
      <div
        style={{
          fontSize: 26,
          color: "#cbd5e1",
          fontWeight: 500,
          opacity: ministSpring,
          transform: `translateY(${interpolate(ministSpring, [0, 1], [20, 0])}px)`,
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Ministère de l&apos;Industrie et de la Transformation Locale
      </div>

      {/* République Gabonaise band */}
      <div
        style={{
          opacity: motoSpring,
          transform: `translateY(${interpolate(motoSpring, [0, 1], [20, 0])}px)`,
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 14,
            letterSpacing: "0.32em",
            color: "#94a3b8",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          République Gabonaise
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: "0.18em",
            color: "#94a3b8",
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
          }}
        >
          Union · Travail · Justice
        </div>
      </div>

      {/* Flag */}
      <div
        style={{
          marginTop: 24,
          width: interpolate(flagSpring, [0, 1], [0, 360]),
          height: 6,
          display: "flex",
          borderRadius: 3,
          overflow: "hidden",
          opacity: flagSpring,
        }}
      >
        <div style={{ flex: 1, background: green }} />
        <div style={{ flex: 1, background: yellow }} />
        <div style={{ flex: 1, background: blue }} />
      </div>
    </AbsoluteFill>
  );
};
