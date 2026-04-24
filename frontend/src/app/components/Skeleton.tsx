export function SkeletonBox({
  width,
  height,
  radius = 8,
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: radius,
        background: "linear-gradient(90deg, #e8edf2 25%, #f4f7fa 50%, #e8edf2 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.2s infinite",
      }}
    />
  );
}

export function SkeletonKpiCard() {
  return (
    <div
      style={{
        padding: 20,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
      }}
    >
      <SkeletonBox width={40} height={40} radius={10} />
      <div style={{ height: 12 }} />
      <SkeletonBox width={100} height={12} />
      <div style={{ height: 8 }} />
      <SkeletonBox width={60} height={24} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <SkeletonBox height={100} radius={16} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <SkeletonKpiCard key={i} />
        ))}
      </div>
      <SkeletonBox height={200} radius={16} />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 14,
            background: "#fff",
            borderRadius: 12,
          }}
        >
          <SkeletonBox width={44} height={44} radius={10} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <SkeletonBox width="70%" height={14} />
            <SkeletonBox width="40%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
