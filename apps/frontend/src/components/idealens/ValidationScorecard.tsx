import type { CSSProperties } from "react";
import type { ValidationScorecard as ScorecardType } from "@/lib/idealens/types";
import { ModuleCard } from "./ModuleCard";
import { Badge } from "./badge-utils";

const DIMENSION_LABELS: Record<keyof ScorecardType["dimensions"], string> = {
  problemClarity: "Problem clarity",
  customerSpecificity: "Customer specificity",
  urgency: "Urgency",
  differentiation: "Differentiation",
  monetizationClarity: "Monetization clarity",
  mvpFeasibility: "MVP feasibility",
  distributionFeasibility: "Distribution feasibility",
  evidenceStrength: "Evidence strength",
};

function barClass(score10: number): string {
  if (score10 >= 7) return "il-bar";
  if (score10 >= 4) return "il-bar is-warning";
  return "il-bar is-danger";
}

export function ValidationScorecard({
  scorecard,
}: {
  scorecard: ScorecardType;
}) {
  const ringStyle = {
    "--score": `${Math.max(0, Math.min(100, scorecard.overallScore))}%`,
  } as CSSProperties;

  return (
    <ModuleCard step={5} title="Validation Scorecard" icon="il-score">
      <div className="il-score-grid">
        <div className="il-score-ring" style={ringStyle}>
          <div className="il-score-value">
            {scorecard.overallScore}
            <span>/100</span>
          </div>
        </div>
        <div className="il-signal">
          <strong>Decision:</strong>{" "}
          <Badge value={scorecard.decision}>{scorecard.decision}</Badge>
          <p className="il-signal-label">Biggest risk</p>
          <p>{scorecard.biggestRisk}</p>
          <p className="il-signal-label">Recommended next step</p>
          <p>{scorecard.recommendedNextStep}</p>
        </div>
        <div className="il-metric-list">
          {(Object.keys(DIMENSION_LABELS) as (keyof ScorecardType["dimensions"])[]).map(
            (key) => {
              const score10 = scorecard.dimensions[key];
              const pct = Math.max(0, Math.min(100, score10 * 10));
              return (
                <div key={key} className="il-metric">
                  <span>{DIMENSION_LABELS[key]}</span>
                  <div className={barClass(score10)}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {score10}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    </ModuleCard>
  );
}
