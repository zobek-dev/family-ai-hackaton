"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import type {
  Assumption,
  Experiment,
  InterviewScript,
  IdeaLensWorkspace,
  Persona,
} from "./types";
import { mockWorkspace } from "./mock";

/** Matches CopilotKit BFF graph id + `CopilotChatConfigurationProvider.agentId`. */
export const IDEA_LENS_AGENT_ID = "idealens";

const personaTpl = mockWorkspace.personas[0];
const assumptionTpl = mockWorkspace.assumptions[0];
const experimentTpl = mockWorkspace.experiments[0];

function coerceBand(
  value: unknown,
  fallback: "Low" | "Medium" | "High",
): "Low" | "Medium" | "High" {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 3) return "Low";
    if (value <= 6) return "Medium";
    return "High";
  }
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s.includes("high")) return "High";
    if (s.includes("medium") || s.includes("mid")) return "Medium";
    if (s.includes("low")) return "Low";
    if (s.includes("-")) return "Medium";
  }
  return fallback;
}

const ASSUMPTION_CATEGORIES: readonly Assumption["category"][] = [
  "Customer",
  "Problem",
  "Solution",
  "Market",
  "Distribution",
  "Monetization",
];

function coerceAssumptionCategory(value: unknown): Assumption["category"] {
  if (
    typeof value === "string" &&
    ASSUMPTION_CATEGORIES.includes(value as Assumption["category"])
  ) {
    return value as Assumption["category"];
  }
  return "Market";
}

function coerceImportance(value: unknown): Assumption["importance"] {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 3) return "Low";
    if (value <= 7) return "Medium";
    return "High";
  }
  return "Medium";
}

function coerceAssumptionStatus(value: unknown): Assumption["status"] {
  if (
    value === "Unknown" ||
    value === "Risky" ||
    value === "Validated" ||
    value === "Invalidated"
  ) {
    return value;
  }
  return "Unknown";
}

function coerceExperimentStatus(value: unknown): Experiment["status"] {
  if (
    value === "Backlog" ||
    value === "This Week" ||
    value === "Running" ||
    value === "Done"
  ) {
    return value;
  }
  if (typeof value === "string") {
    const s = value.toLowerCase();
    if (s.includes("this week") || /\bweek\b/.test(s)) return "This Week";
    if (s.includes("running") || s.includes("progress")) return "Running";
    if (s.includes("done") || s.includes("complete")) return "Done";
    if (
      s.includes("planned") ||
      s.includes("backlog") ||
      s.includes("todo") ||
      s.includes("queued")
    ) {
      return "Backlog";
    }
  }
  return "Backlog";
}

function coerceEffort(value: unknown): Experiment["effort"] {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  return experimentTpl.effort;
}

function coerceCost(value: unknown): Experiment["cost"] {
  if (value === "Free" || value === "Low" || value === "Medium") return value;
  if (typeof value === "string" && /^zero$/i.test(value.trim())) return "Free";
  return experimentTpl.cost;
}

function sanitizePersonas(personas: unknown): Persona[] {
  if (!Array.isArray(personas)) return mockWorkspace.personas;
  const out: Persona[] = [];
  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    if (!p || typeof p !== "object") continue;
    const x = p as Partial<Persona>;
    const id =
      typeof x.id === "string" && x.id.trim().length > 0
        ? x.id.trim()
        : `p${i + 1}`;
    const name =
      typeof x.name === "string" && x.name.trim().length > 0
        ? x.name.trim()
        : typeof x.description === "string" && x.description.trim().length > 0
          ? x.description.trim().slice(0, 80)
          : "";
    if (!name) continue;
    const objections = Array.isArray(x.objections)
      ? x.objections.filter((o): o is string => typeof o === "string")
      : personaTpl.objections;
    out.push({
      ...personaTpl,
      ...x,
      id,
      name,
      painIntensity: coerceBand(x.painIntensity, personaTpl.painIntensity),
      budgetLevel: coerceBand(x.budgetLevel, personaTpl.budgetLevel),
      urgency: coerceBand(x.urgency, personaTpl.urgency),
      objections,
      description:
        typeof x.description === "string" ? x.description : personaTpl.description,
      acquisitionChannel:
        typeof x.acquisitionChannel === "string"
          ? x.acquisitionChannel
          : personaTpl.acquisitionChannel,
    });
  }
  return out.length ? out : mockWorkspace.personas;
}

function sanitizeAssumptions(assumptions: unknown): Assumption[] {
  if (!Array.isArray(assumptions)) return mockWorkspace.assumptions;
  const out: Assumption[] = [];
  for (let i = 0; i < assumptions.length; i++) {
    const a = assumptions[i];
    if (!a || typeof a !== "object") continue;
    const x = a as Partial<Assumption>;
    const id =
      typeof x.id === "string" && x.id.trim().length > 0
        ? x.id.trim()
        : `a${i + 1}`;
    const text = typeof x.text === "string" ? x.text.trim() : "";
    if (!text) continue;
    out.push({
      ...assumptionTpl,
      ...x,
      id,
      text,
      category: coerceAssumptionCategory(x.category),
      importance: coerceImportance(x.importance),
      status: coerceAssumptionStatus(x.status),
      testMethod:
        typeof x.testMethod === "string" ? x.testMethod : assumptionTpl.testMethod,
    });
  }
  return out.length ? out : mockWorkspace.assumptions;
}

function sanitizeExperiments(experiments: unknown): Experiment[] {
  if (!Array.isArray(experiments)) return mockWorkspace.experiments;
  const out: Experiment[] = [];
  for (let i = 0; i < experiments.length; i++) {
    const e = experiments[i];
    if (!e || typeof e !== "object") continue;
    const x = e as Partial<Experiment>;
    const id =
      typeof x.id === "string" && x.id.trim().length > 0
        ? x.id.trim()
        : `e${i + 1}`;
    const title = typeof x.title === "string" ? x.title.trim() : "";
    if (!title) continue;
    out.push({
      ...experimentTpl,
      ...x,
      id,
      title,
      hypothesis:
        typeof x.hypothesis === "string" ? x.hypothesis : experimentTpl.hypothesis,
      method: typeof x.method === "string" ? x.method : experimentTpl.method,
      successMetric:
        typeof x.successMetric === "string"
          ? x.successMetric
          : experimentTpl.successMetric,
      duration:
        typeof x.duration === "string" ? x.duration : experimentTpl.duration,
      effort: coerceEffort(x.effort),
      cost: coerceCost(x.cost),
      status: coerceExperimentStatus(x.status),
    });
  }
  return out.length ? out : mockWorkspace.experiments;
}

function sanitizeInterviewScript(raw: unknown): InterviewScript | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Partial<InterviewScript>;
  if (
    typeof x.title !== "string" ||
    typeof x.targetPersona !== "string" ||
    typeof x.goal !== "string"
  ) {
    return null;
  }
  const questionsRaw = Array.isArray(x.questions) ? x.questions : [];
  const questions = questionsRaw
    .filter(
      (q): boolean =>
        q != null && typeof q === "object" && !Array.isArray(q),
    )
    .map((q, i) => {
      const qq = q as Record<string, unknown>;
      const id =
        typeof qq.id === "string" ? qq.id : `q-${i}-${Math.random().toString(36).slice(2, 9)}`;
      return {
        id,
        question: typeof qq.question === "string" ? qq.question : "",
        purpose: typeof qq.purpose === "string" ? qq.purpose : "",
        goodSignal: typeof qq.goodSignal === "string" ? qq.goodSignal : "",
        redFlag: typeof qq.redFlag === "string" ? qq.redFlag : "",
      };
    });
  if (!questions.length) return null;
  return {
    title: x.title,
    targetPersona: x.targetPersona,
    goal: x.goal,
    questions,
  };
}

export function mergeWorkspace(raw: unknown): IdeaLensWorkspace {
  if (!raw || typeof raw !== "object") return mockWorkspace;
  const o = raw as Partial<IdeaLensWorkspace>;
  const interviewScript =
    o.interviewScript === undefined
      ? mockWorkspace.interviewScript
      : o.interviewScript === null
        ? null
        : sanitizeInterviewScript(o.interviewScript) ?? mockWorkspace.interviewScript;

  return {
    ...mockWorkspace,
    ...o,
    snapshot: { ...mockWorkspace.snapshot, ...(o.snapshot ?? {}) },
    personas: o.personas !== undefined ? sanitizePersonas(o.personas) : mockWorkspace.personas,
    selectedPersonaId:
      o.selectedPersonaId !== undefined ? o.selectedPersonaId : mockWorkspace.selectedPersonaId,
    assumptions:
      o.assumptions !== undefined
        ? sanitizeAssumptions(o.assumptions)
        : mockWorkspace.assumptions,
    experiments:
      o.experiments !== undefined
        ? sanitizeExperiments(o.experiments)
        : mockWorkspace.experiments,
    scorecard: {
      ...mockWorkspace.scorecard,
      ...(o.scorecard ?? {}),
      dimensions: {
        ...mockWorkspace.scorecard.dimensions,
        ...(o.scorecard?.dimensions ?? {}),
      },
    },
    interviewScript,
    agentState: {
      ...mockWorkspace.agentState,
      ...(o.agentState ?? {}),
    },
  };
}

export function useIdeaLens(agentId = IDEA_LENS_AGENT_ID) {
  const { agent } = useAgent({ agentId });
  const state = mergeWorkspace(agent?.state);

  return { state, agent };
}
