/**
 * User-turn prompts sent via injectPrompt (mirrors docs/IDEALENS_MVP_SPEC.md §10).
 * Server-side system prompt lives in apps/agent/src/idealens/prompts.py.
 *
 * Tool payloads may be `{ workspace: {...} }`, flat workspace fields, or `workspaceJson` (string).
 */

export function buildGenerateWorkspaceUserMessage(
  idea: string,
  region: string,
  businessModel: string,
  goal: string,
): string {
  return `Generate a complete IdeaLens validation workspace for this startup idea.

Idea: ${idea}
Region: ${region}
Business model: ${businessModel}
Validation goal: ${goal}

Build:
- snapshot: { problem, customer, solution, category, wedge, monetization, mainAssumption, validationPriority }
- personas: array of 3 objects with { id, name, description, painIntensity, budgetLevel, urgency, acquisitionChannel, objections[] }
- assumptions: array of 5 objects with { id, text, category, importance, status:"Unknown", testMethod }
- experiments: array of 4 objects with { id, title, hypothesis, method, successMetric, effort, cost, duration, status }
- scorecard: { decision, biggestRisk, recommendedNextStep, dimensions: { problemClarity, customerSpecificity, urgency, differentiation, monetizationClarity, mvpFeasibility, distributionFeasibility, evidenceStrength } } — all dimensions are numbers 0-10, do NOT include overallScore
- agentState: { status:"WaitingForUser", currentObjective, confidence:50, suggestions:[], activityLog:[] }

When ready, call updateWorkspace. Pass either { workspace: <full workspace object> } OR put the workspace fields at the top level of the tool arguments object.`;
}

export function buildPersonaUpdateUserMessage(
  workspaceJson: string,
  personaId: string,
): string {
  return `The founder selected persona "${personaId}" as their ICP.

Current workspace:
${workspaceJson}

Update ONLY these fields:
- snapshot.customer, snapshot.mainAssumption, snapshot.validationPriority
- assumptions (re-rank by relevance to this ICP)
- experiments (reprioritize for this ICP)
- scorecard.dimensions.customerSpecificity and scorecard.dimensions.urgency
- agentState.currentObjective, agentState.suggestions, agentState.activityLog (prepend one entry)

Keep all other fields unchanged. Return the full updated workspace.

Call updatePersonaSelection with the same argument shapes as updateWorkspace (nested workspace or flat fields).`;
}

export function buildRiskyAssumptionUserMessage(
  workspaceJson: string,
  assumptionId: string,
): string {
  return `The founder marked assumption "${assumptionId}" as Risky.

Current workspace:
${workspaceJson}

Update ONLY:
- assumptions: set the assumption with id "${assumptionId}" to status "Risky"
- experiments: add ONE new experiment targeting assumption "${assumptionId}" (set relatedAssumptionId, status "This Week", effort Low or Medium)
- agentState.currentObjective, agentState.suggestions, agentState.activityLog (prepend one entry)

Return the full updated workspace including the new experiment.

Call addExperiment with the same argument shapes as updateWorkspace (nested workspace or flat fields).`;
}

export function buildInterviewScriptUserMessage(workspaceJson: string): string {
  return `Generate a customer interview script for the selected persona and riskiest assumption.

Current workspace:
${workspaceJson}

Create an interviewScript with:
- title: string
- targetPersona: string (name of the selected persona)
- goal: string (what this interview aims to discover)
- questions: array of 6-8 objects, each with { id, question, purpose, goodSignal, redFlag }

Questions must be open-ended and focus on the highest-importance Risky assumption (or any assumption if none are Risky yet).

Call setInterviewScript with { workspace: { interviewScript: <script>, ...optional agentState } } OR put interviewScript (and optional agentState) at the top level of the tool arguments.`;
}
