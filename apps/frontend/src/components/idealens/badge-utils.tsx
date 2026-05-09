/*
  IdeaLens badge / pill helpers — small utilities mapping domain values onto the
  styleguide tokens (.il-pill-high / -medium / -low and .il-status / -success /
  -warning / -danger). Components stay JSX-friendly without copying classnames.
*/

const HIGH_VALUES = new Set([
  "High",
  "Risky",
  "Pivot",
  "Invalidated",
]);

const MEDIUM_VALUES = new Set([
  "Medium",
  "Unknown",
  "Validate First",
  "WaitingForUser",
  "Backlog",
  "This Week",
]);

const LOW_VALUES = new Set([
  "Low",
  "Validated",
  "Proceed",
  "Done",
  "Free",
  "Running",
]);

const NEUTRAL_VALUES = new Set([
  "Idle",
  "Customer",
  "Problem",
  "Solution",
  "Market",
  "Distribution",
  "Monetization",
]);

export function traitPillClass(value: string): string {
  if (HIGH_VALUES.has(value)) return "il-pill-high";
  if (MEDIUM_VALUES.has(value)) return "il-pill-medium";
  if (LOW_VALUES.has(value)) return "il-pill-low";
  return "il-pill-low";
}

export function statusToneClass(value: string): string {
  if (value === "Validated" || value === "Done" || value === "Proceed") {
    return "il-status il-status-success";
  }
  if (value === "Risky" || value === "Invalidated" || value === "Pivot") {
    return "il-status il-status-danger";
  }
  return "il-status il-status-warning";
}

const NEUTRAL_STYLE: Record<string, string> = {
  background: "var(--il-color-brand-soft)",
  color: "var(--il-color-brand-strong)",
};

export function Badge({
  children,
  value,
}: {
  children?: React.ReactNode;
  value?: string;
}) {
  const key = value ?? (typeof children === "string" ? children : "");
  if (HIGH_VALUES.has(key)) {
    return <span className="il-pill il-pill-high">{children}</span>;
  }
  if (MEDIUM_VALUES.has(key)) {
    return <span className="il-pill il-pill-medium">{children}</span>;
  }
  if (LOW_VALUES.has(key)) {
    return <span className="il-pill il-pill-low">{children}</span>;
  }
  if (NEUTRAL_VALUES.has(key)) {
    return (
      <span className="il-pill" style={NEUTRAL_STYLE}>
        {children}
      </span>
    );
  }
  return (
    <span className="il-pill" style={{ background: "#eef0f7", color: "#3b3f52" }}>
      {children}
    </span>
  );
}
