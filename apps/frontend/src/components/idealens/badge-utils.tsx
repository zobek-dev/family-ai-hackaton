const badgeColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Risky: "bg-red-100 text-red-700",
  Pivot: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Unknown: "bg-amber-100 text-amber-700",
  "Validate First": "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700",
  Validated: "bg-green-100 text-green-700",
  Proceed: "bg-green-100 text-green-700",
  Invalidated: "bg-gray-100 text-gray-500",
  Idle: "bg-gray-100 text-gray-600",
  Thinking: "bg-purple-100 text-purple-700",
  Updating: "bg-purple-100 text-purple-700",
  WaitingForUser: "bg-blue-100 text-blue-700",
  Customer: "bg-blue-100 text-blue-700",
  Problem: "bg-blue-100 text-blue-700",
  Solution: "bg-blue-100 text-blue-700",
  Market: "bg-blue-100 text-blue-700",
  Distribution: "bg-blue-100 text-blue-700",
  Monetization: "bg-blue-100 text-blue-700",
  Backlog: "bg-gray-100 text-gray-600",
  "This Week": "bg-amber-100 text-amber-700",
  Running: "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
  Free: "bg-green-100 text-green-700",
};

export function Badge({
  children,
  value,
}: {
  children?: React.ReactNode;
  value?: string;
}) {
  const key = value ?? (typeof children === "string" ? children : "");
  const cls = badgeColors[key] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}
