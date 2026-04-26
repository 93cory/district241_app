import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  yellow: string;
}

export const Tagline: React.FC<Props> = ({ yellow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = ["La", "souveraineté", "industrielle", "au service", "du Gabon."];
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const wordSpring = (i: number) =>
    spring({ frame: frame - 8 - i * 6, fps, config: { damping: 20 } });

  const fade = interpolate(frame, [80, 100], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontSize: 28,
          color: yellow,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: enter,
        }}
      >
        Souveraineté numérique
      </div>
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 800,
          fontSize: 96,
          color: "#fff",
          letterSpacing: "-0.02em",
          textAlign: "center",
          lineHeight: 1.05,
          maxWidth: 1500,
        }}
      >
        {words.map((w, i) => {
          const sp = wordSpring(i);
          const isAccent = w === "souveraineté";
          return (
            <span key={i} style={{ display: "inline-block" }}>
              <span
                style={{
                  display: "inline-block",
                  opacity: sp,
                  transform: `translateY(${interpolate(sp, [0, 1], [40, 0])}px)`,
                  color: isAccent ? yellow : "#fff",
                  fontStyle: isAccent ? "italic" : "normal",
                  fontFamily: isAccent
                    ? "'Cormorant Garamond', serif"
                    : "'Playfair Display', serif",
                  marginRight: 24,
                }}
              >
                {w}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
