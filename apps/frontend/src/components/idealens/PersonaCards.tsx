import type { Persona } from "@/lib/idealens/types";
import { ModuleCard } from "./ModuleCard";
import { IdeaLensIcon } from "./IdeaLensIcon";
import { traitPillClass } from "./badge-utils";

export function PersonaCards({
  personas,
  selectedPersonaId,
  onSelectICP,
  selectionDisabled = false,
}: {
  personas: Persona[];
  selectedPersonaId: string | null;
  onSelectICP: (id: string) => void;
  selectionDisabled?: boolean;
}) {
  return (
    <ModuleCard step={2} title="Personas" icon="il-personas">
      {selectionDisabled ? (
        <p className="mb-3 text-[12px] font-medium text-[color:var(--il-color-warning)]">
          Genera primero el workspace con tu idea; después podrás elegir ICP.
        </p>
      ) : null}
      <div className="il-personas">
        {personas.map((p) => {
          const selected = selectedPersonaId === p.id;
          return (
            <article
              key={p.id}
              className={`il-persona-grid-card ${selected ? "is-active" : ""}`}
            >
              {selected ? (
                <span className="il-check-dot" aria-label="Selected as ICP">
                  <IdeaLensIcon name="il-check" size={11} />
                </span>
              ) : null}
              <div className="il-avatar-circle" aria-hidden>
                <IdeaLensIcon name="il-personas" size={26} />
              </div>
              <h3 className="il-persona-name">{p.name}</h3>
              <p className="il-persona-desc">{p.description}</p>
              <div className="il-traits">
                <div className="il-trait">
                  <span>Pain</span>
                  <span className={`il-pill ${traitPillClass(p.painIntensity)}`}>
                    {p.painIntensity}
                  </span>
                </div>
                <div className="il-trait">
                  <span>Budget</span>
                  <span className={`il-pill ${traitPillClass(p.budgetLevel)}`}>
                    {p.budgetLevel}
                  </span>
                </div>
                <div className="il-trait">
                  <span>Urgency</span>
                  <span className={`il-pill ${traitPillClass(p.urgency)}`}>
                    {p.urgency}
                  </span>
                </div>
              </div>
              {(p.acquisitionChannel || p.objections.length > 0) && (
                <div className="grid gap-1 text-[11px] leading-snug text-[color:var(--il-color-text)]">
                  {p.acquisitionChannel ? (
                    <p>
                      <span className="font-bold uppercase tracking-wide text-[color:var(--il-color-muted)]">
                        Channel:&nbsp;
                      </span>
                      {p.acquisitionChannel}
                    </p>
                  ) : null}
                  {p.objections.length > 0 ? (
                    <p>
                      <span className="font-bold uppercase tracking-wide text-[color:var(--il-color-muted)]">
                        Top objection:&nbsp;
                      </span>
                      {p.objections[0]}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="il-persona-actions">
                <button
                  type="button"
                  className={`il-button ${selected ? "il-button-primary" : ""}`}
                  disabled={selectionDisabled}
                  onClick={() => onSelectICP(p.id)}
                >
                  <IdeaLensIcon name={selected ? "il-check" : "il-spark"} size={14} />
                  {selected ? "ICP selected" : "Select ICP"}
                </button>
                <button type="button" className="il-button" disabled>
                  <IdeaLensIcon name="il-close" size={14} />
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </ModuleCard>
  );
}
