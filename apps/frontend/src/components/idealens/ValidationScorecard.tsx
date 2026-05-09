import type { ValidationScorecard as ScorecardType } from "@/lib/idealens/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "./badge-utils";

const DIMENSION_LABELS: Record<
  keyof ScorecardType["dimensions"],
  string
> = {
  problemClarity: "Problem clarity",
  customerSpecificity: "Customer specificity",
  urgency: "Urgency",
  differentiation: "Differentiation",
  monetizationClarity: "Monetization clarity",
  mvpFeasibility: "MVP feasibility",
  distributionFeasibility: "Distribution feasibility",
  evidenceStrength: "Evidence strength",
};

export function ValidationScorecard({
  scorecard,
}: {
  scorecard: ScorecardType;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        Validation scorecard
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-5xl font-bold tabular-nums text-gray-900">
            {scorecard.overallScore}
          </div>
          <p className="text-xs text-gray-500">Provisional overall score</p>
        </div>
        <Badge value={scorecard.decision}>{scorecard.decision}</Badge>
      </div>
      <div className="mt-4 space-y-2">
        <div>
          <p className="text-xs font-medium uppercase text-gray-400">
            Biggest risk
          </p>
          <p className="text-sm text-gray-700">{scorecard.biggestRisk}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-400">
            Recommended next step
          </p>
          <p className="text-sm text-gray-700">{scorecard.recommendedNextStep}</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {(Object.keys(DIMENSION_LABELS) as (keyof ScorecardType["dimensions"])[]).map(
          (key) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-gray-600">
                  {DIMENSION_LABELS[key]}
                </span>
                <span className="tabular-nums text-gray-500">
                  {scorecard.dimensions[key]}/10
                </span>
              </div>
              <Progress value={scorecard.dimensions[key] * 10} className="h-2" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
