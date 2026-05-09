import type { Assumption } from "@/lib/idealens/types";
import { ModuleCard } from "./ModuleCard";
import { IdeaLensIcon } from "./IdeaLensIcon";
import { Badge, statusToneClass } from "./badge-utils";

export function AssumptionMap({
  assumptions,
  onMarkRisky,
  onMarkValidated,
  onMarkInvalidated,
  riskyDisabled = false,
}: {
  assumptions: Assumption[];
  onMarkRisky: (id: string) => void;
  onMarkValidated: (id: string) => void;
  onMarkInvalidated: (id: string) => void;
  riskyDisabled?: boolean;
}) {
  return (
    <ModuleCard step={4} title="Assumption Map" icon="il-map">
      <div className="il-table-wrap">
        <table className="il-assumptions-table">
          <thead>
            <tr>
              <th>Assumption</th>
              <th>Category</th>
              <th>Importance</th>
              <th>Status</th>
              <th>Test method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assumptions.map((a) => (
              <tr key={a.id}>
                <td style={{ color: "var(--il-color-text)", maxWidth: 260 }}>
                  {a.text}
                </td>
                <td>
                  <Badge value={a.category}>{a.category}</Badge>
                </td>
                <td>
                  <Badge value={a.importance}>{a.importance}</Badge>
                </td>
                <td>
                  <span className={statusToneClass(a.status)}>{a.status}</span>
                </td>
                <td style={{ color: "var(--il-color-muted)" }}>{a.testMethod}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="il-button"
                      style={{ minHeight: 28, padding: "0 8px", fontSize: 11 }}
                      disabled={riskyDisabled}
                      onClick={() => onMarkRisky(a.id)}
                    >
                      <IdeaLensIcon name="il-warning" size={12} />
                      Risky
                    </button>
                    <button
                      type="button"
                      className="il-button"
                      style={{ minHeight: 28, padding: "0 8px", fontSize: 11 }}
                      onClick={() => onMarkValidated(a.id)}
                    >
                      <IdeaLensIcon name="il-check" size={12} />
                      Validated
                    </button>
                    <button
                      type="button"
                      className="il-button"
                      style={{ minHeight: 28, padding: "0 8px", fontSize: 11 }}
                      onClick={() => onMarkInvalidated(a.id)}
                    >
                      <IdeaLensIcon name="il-close" size={12} />
                      Invalidated
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleCard>
  );
}
