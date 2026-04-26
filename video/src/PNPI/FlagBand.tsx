import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  green: string;
  yellow: string;
  blue: string;
}

export const FlagBand: React.FC<Props> = ({ green, yellow, blue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wipe = spring({ frame, fps, config: { damping: 20, mass: 0.5 } });
  const width = interpolate(wipe, [0, 1], [0, 1920], { extrapolateRight: "clamp" });

  // Visible pendant l'intro (logo), efface avant la tagline pour ne pas barrer le texte
  const opacity = interpolate(frame, [0, 60, 150, 175], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          width: "100%",
          height: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            width,
            height: "100%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ flex: 1, background: green }} />
          <div style={{ flex: 1, background: yellow }} />
          <div style={{ flex: 1, background: blue }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
