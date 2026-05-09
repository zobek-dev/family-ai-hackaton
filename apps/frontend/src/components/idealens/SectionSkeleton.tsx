export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="il-skeleton">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--il-color-brand)",
          fontSize: "var(--il-font-size-11)",
          fontWeight: 850,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--il-color-brand-soft)",
          }}
        />
        {label}
      </div>
      <div className="il-skeleton-bar" style={{ width: "70%" }} />
      <div className="il-skeleton-bar" style={{ width: "92%" }} />
      <div className="il-skeleton-bar" style={{ width: "55%" }} />
    </div>
  );
}
