import type { StartupSnapshot } from "@/lib/idealens/types";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Startup snapshot
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            Edit
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            Regenerate
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="space-y-1">
            <div className="text-xs font-medium uppercase text-gray-400">
              {label}
            </div>
            <p className="text-sm text-gray-600">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
