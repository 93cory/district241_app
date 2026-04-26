import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  value: string;
  unit: string;
  label: string;
  sublabel: string;
  accent: string;
  index: number;
}

export const StatCard: React.FC<Props> = ({ value, unit, label, sublabel, accent, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big number counts up
  const targetNum = parseInt(value, 10);
  const numProgress = spring({ frame, fps, config: { damping: 30, mass: 1.2 } });
  const currentNum = Math.round(numProgress * targetNum);
  const displayValue = isNaN(targetNum) ? value : currentNum.toString();

  // Slide in from right, fade out at end
  const slideIn = spring({ frame, fps, config: { damping: 18 } });
  const slideX = interpolate(slideIn, [0, 1], [120, 0]);

  const fadeOut = interpolate(frame, [80, 110], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sublabelSpring = spring({ frame: frame - 22, fps, config: { damping: 18 } });

  // Rotating side panel
  const sidePanelHeight = interpolate(slideIn, [0, 1], [0, 540]);

  return (
    <AbsoluteFill
      style={{
        opacity: fadeOut,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 180,
        gap: 60,
      }}
    >
      {/* Vertical accent bar */}
      <div
        style={{
          width: 6,
          height: sidePanelHeight,
          background: accent,
          borderRadius: 3,
          boxShadow: `0 0 40px ${accent}80`,
        }}
      />

      <div
        style={{
          transform: `translateX(${slideX}px)`,
          opacity: slideIn,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Index dot row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === index ? 28 : 10,
                height: 4,
                borderRadius: 2,
                background: i === index ? accent : "#ffffff30",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        <div
          style={{
            fontSize: 18,
            color: accent,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: -8 }}>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 900,
              fontSize: 280,
              lineHeight: 0.95,
              color: "#fff",
              letterSpacing: "-0.04em",
            }}
          >
            {displayValue}
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: accent,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {unit}
          </div>
        </div>

        <div
          style={{
            fontSize: 26,
            color: "#cbd5e1",
            maxWidth: 900,
            fontWeight: 400,
            opacity: sublabelSpring,
            transform: `translateY(${interpolate(sublabelSpring, [0, 1], [20, 0])}px)`,
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </div>
      </div>
    </AbsoluteFill>
  );
};
