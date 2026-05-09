import type { Experiment } from "@/lib/idealens/types";
import { ModuleCard } from "./ModuleCard";
import { traitPillClass } from "./badge-utils";

const LANES: { id: Experiment["status"]; label: string; modifier: string }[] = [
  { id: "Backlog", label: "Backlog", modifier: "il-lane-backlog" },
  { id: "This Week", label: "This Week", modifier: "il-lane-thisweek" },
  { id: "Running", label: "Running", modifier: "il-lane-running" },
  { id: "Done", label: "Validated", modifier: "il-lane-validated" },
];

export function ExperimentList({ experiments }: { experiments: Experiment[] }) {
  const grouped = LANES.map((lane) => ({
    ...lane,
    items: experiments.filter((e) => e.status === lane.id),
  }));

  return (
    <ModuleCard
      step={3}
      title="Validation Experiment Board"
      icon="il-experiment"
    >
      <div className="il-board">
        {grouped.map((lane) => (
          <div key={lane.id} className={`il-lane ${lane.modifier}`}>
            <div className="il-lane-title">
              <span>{lane.label}</span>
              <span className="il-lane-count">{lane.items.length}</span>
            </div>
            <div>
              {lane.items.length === 0 ? (
                <p className="text-[11px] italic text-[color:var(--il-color-muted)]">
                  Sin experimentos.
                </p>
              ) : (
                lane.items.map((e) => (
                  <article key={e.id} className="il-experiment-card">
                    <h4>{e.title}</h4>
                    <p>{e.hypothesis}</p>
                    <div className="il-experiment-meta">
                      <span className={`il-pill ${traitPillClass(e.effort)}`}>
                        {e.effort} effort
                      </span>
                      <span className={`il-pill ${traitPillClass(e.cost)}`}>
                        {e.cost} cost
                      </span>
                      <span
                        className="il-pill"
                        style={{
                          background: "#eef0f7",
                          color: "var(--il-color-text)",
                        }}
                      >
                        {e.duration}
                      </span>
                    </div>
                    <p>
                      <span
                        style={{
                          fontWeight: 850,
                          fontSize: 10,
                          textTransform: "uppercase",
                          color: "var(--il-color-muted)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Success:{" "}
                      </span>
                      {e.successMetric}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}
