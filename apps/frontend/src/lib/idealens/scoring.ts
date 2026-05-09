import type { IdeaLensWorkspace, ValidationScorecard } from "./types";

export function computeOverallScore(
  dimensions: ValidationScorecard["dimensions"],
): number {
  const weights = {
    problemClarity: 1.5,
    customerSpecificity: 1.5,
    urgency: 1.0,
    differentiation: 1.0,
    monetizationClarity: 1.5,
    mvpFeasibility: 0.8,
    distributionFeasibility: 0.8,
    evidenceStrength: 1.9,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const weighted = Object.entries(dimensions).reduce(
    (sum, [k, v]) => sum + v * (weights[k as keyof typeof weights] ?? 1),
    0,
  );
  return Math.round((weighted / (total * 10)) * 100);
}

export function getDecision(
  score: number,
): "Proceed" | "Validate First" | "Pivot" {
  if (score >= 70) return "Proceed";
  if (score >= 45) return "Validate First";
  return "Pivot";
}

export function applyClientScores(ws: IdeaLensWorkspace): IdeaLensWorkspace {
  const score = computeOverallScore(ws.scorecard.dimensions);
  const decision = getDecision(score);
  return {
    ...ws,
    scorecard: {
      ...ws.scorecard,
      overallScore: score,
      decision,
    },
    agentState: {
      ...ws.agentState,
      confidence: score,
    },
  };
}
