import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  yellow: string;
}

export const LogoIntro: React.FC<Props> = ({ yellow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Disc scales in
  const discScale = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  // Letters fade in one by one
  const letters = "PNPI".split("");
  const letterSpring = (i: number) =>
    spring({ frame: frame - 10 - i * 4, fps, config: { damping: 14, mass: 0.4 } });
  // Subtitle slides up
  const subtitleSpring = spring({ frame: frame - 35, fps, config: { damping: 18 } });
  const subtitleY = interpolate(subtitleSpring, [0, 1], [40, 0]);
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);

  // Hold then fade
  const fadeOut = interpolate(frame, [110, 140], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle pulse on the disc
  const pulse = 1 + Math.sin(frame * 0.08) * 0.02;

  return (
    <AbsoluteFill
      style={{
        opacity: fadeOut,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 36,
      }}
    >
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${yellow}, #d9a91a)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 900,
          fontSize: 78,
          color: "#051B36",
          boxShadow: `0 24px 80px ${yellow}40, 0 0 120px ${yellow}30`,
          transform: `scale(${discScale * pulse})`,
        }}
      >
        <div style={{ display: "flex", letterSpacing: "-0.04em" }}>
          {letters.map((l, i) => {
            const sp = letterSpring(i);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: sp,
                  transform: `translateY(${interpolate(sp, [0, 1], [20, 0])}px)`,
                }}
              >
                {l}
              </span>
            );
          })}
        </div>
      </div>

      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          textAlign: "center",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.01em",
            marginBottom: 6,
          }}
        >
          Plateforme Nationale
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}
        >
          de Pilotage Industriel
        </div>
      </div>
    </AbsoluteFill>
  );
};
