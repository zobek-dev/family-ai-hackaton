import type { StartupSnapshot } from "@/lib/idealens/types";
import { ModuleCard } from "./ModuleCard";

export function StartupSnapshotCard({
  snapshot,
}: {
  snapshot: StartupSnapshot;
}) {
  const fields: [string, string][] = [
    ["Problem", snapshot.problem],
    ["Customer", snapshot.customer],
    ["Solution", snapshot.solution],
    ["Category", snapshot.category],
    ["Wedge", snapshot.wedge],
    ["Monetization", snapshot.monetization],
    ["Main assumption", snapshot.mainAssumption],
    ["Validation priority", snapshot.validationPriority],
  ];

  return (
    <ModuleCard step={1} title="Startup Snapshot" icon="il-target">
      <div className="il-snapshot-grid">
        {fields.map(([label, value]) => (
          <div key={label} className="il-snapshot-cell">
            <div className="il-cell-kicker">{label}</div>
            <div className="il-cell-copy">{value}</div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}
