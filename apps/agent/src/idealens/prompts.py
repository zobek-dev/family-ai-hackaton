"""IdeaLens prompts — keep IDEA_LENS_SYSTEM_PROMPT byte-identical across turns (KV cache)."""

from __future__ import annotations

# IMPORTANT: Do not edit IDEA_LENS_SYSTEM_PROMPT between requests — Gemini KV cache pins it.
IDEA_LENS_SYSTEM_PROMPT = """You are IdeaLens, an agent that generates startup validation workspaces.
Rules:
- Deliver results by calling the frontend tools (updateWorkspace, updatePersonaSelection, addExperiment, setInterviewScript). Do not end the turn with only assistant text when a tool applies.
- Tool arguments must be a single JSON object. Prefer { workspace: <full or partial workspace object> }. You may also put workspace fields at the top level of the tool argument object. Legacy string field workspaceJson is allowed only if it contains raw JSON text (no markdown fences).
- Be specific. Avoid generic startup advice.
- Identify the riskiest assumptions, not the most obvious ones.
- Recommend experiments completable in under one week.
- Do not fabricate evidence. Mark confidence Low when there is no data.
- Never include overallScore in the scorecard — it is computed by the client.
- Detect the language of the user's intake (idea, region labels if present, and the current workspace JSON strings when updating). Write every generated natural-language field in that same language (snapshot, personas, assumptions, experiments, scorecard text fields, agentState strings, interview questions).
"""


def GENERATE_WORKSPACE_PROMPT(idea: str, region: str, model: str, goal: str) -> str:
    return f"""
Generate a complete IdeaLens validation workspace for this startup idea.

Idea: {idea}
Region: {region}
Business model: {model}
Validation goal: {goal}

Build:
- snapshot: {{ problem, customer, solution, category, wedge, monetization, mainAssumption, validationPriority }}
- personas: array of 3 objects with {{ id, name, description, painIntensity, budgetLevel, urgency, acquisitionChannel, objections[] }}
- assumptions: array of 5 objects with {{ id, text, category, importance, status:"Unknown", testMethod }}
- experiments: array of 4 objects with {{ id, title, hypothesis, method, successMetric, effort, cost, duration, status }}
- scorecard: {{ decision, biggestRisk, recommendedNextStep, dimensions: {{ problemClarity, customerSpecificity, urgency, differentiation, monetizationClarity, mvpFeasibility, distributionFeasibility, evidenceStrength }} }} — all dimensions are numbers 0-10, do NOT include overallScore
- agentState: {{ status:"WaitingForUser", currentObjective, confidence:50, suggestions:[], activityLog:[] }}

When ready, call the updateWorkspace tool with argument: {{ workspace: <the full workspace object> }}
"""


def UPDATE_ON_PERSONA_PROMPT(workspace_json: str, persona_id: str) -> str:
    return f"""
The founder selected persona "{persona_id}" as their ICP.

Current workspace:
{workspace_json}

Update ONLY these fields:
- snapshot.customer, snapshot.mainAssumption, snapshot.validationPriority
- assumptions (re-rank by relevance to this ICP)
- experiments (reprioritize for this ICP)
- scorecard.dimensions.customerSpecificity and scorecard.dimensions.urgency
- agentState.currentObjective, agentState.suggestions, agentState.activityLog (prepend one entry)

Keep all other fields unchanged. Return the full updated workspace.

Call updatePersonaSelection tool with argument: {{ workspace: <the full updated workspace object> }}
"""


def UPDATE_ON_RISKY_ASSUMPTION_PROMPT(workspace_json: str, assumption_id: str) -> str:
    return f"""
The founder marked assumption "{assumption_id}" as Risky.

Current workspace:
{workspace_json}

Update ONLY:
- assumptions: set the assumption with id "{assumption_id}" to status "Risky"
- experiments: add ONE new experiment targeting assumption "{assumption_id}" (set relatedAssumptionId, status "This Week", effort Low or Medium)
- agentState.currentObjective, agentState.suggestions, agentState.activityLog (prepend one entry)

Return the full updated workspace including the new experiment.

Call addExperiment tool with argument: {{ workspace: <the full updated workspace object> }}
"""


def GENERATE_INTERVIEW_SCRIPT_PROMPT(workspace_json: str) -> str:
    return f"""
Generate a customer interview script for the selected persona and riskiest assumption.

Current workspace:
{workspace_json}

Create an interviewScript with:
- title: string
- targetPersona: string (name of the selected persona)
- goal: string (what this interview aims to discover)
- questions: array of 6-8 objects, each with {{ id, question, purpose, goodSignal, redFlag }}

Questions must be open-ended and focus on the highest-importance Risky assumption (or any assumption if none are Risky yet).

Call setInterviewScript tool with argument: {{ workspace: {{ interviewScript: <the script object>, agentState: {{ activityLog: ["Interview script generated."], status: "WaitingForUser", currentObjective: "Review the interview script", confidence: 50, suggestions: [], isMockActive: false }} }} }}
"""
