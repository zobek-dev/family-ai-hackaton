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

function sanitizePersonas(personas: unknown): Persona[] {
  if (!Array.isArray(personas)) return mockWorkspace.personas;
  const out: Persona[] = [];
  for (const p of personas) {
    if (!p || typeof p !== "object") continue;
    const x = p as Partial<Persona>;
    if (typeof x.id !== "string" || typeof x.name !== "string") continue;
    const objections = Array.isArray(x.objections)
      ? x.objections.filter((o): o is string => typeof o === "string")
      : personaTpl.objections;
    out.push({
      ...personaTpl,
      ...x,
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
  for (const a of assumptions) {
    if (!a || typeof a !== "object") continue;
    const x = a as Partial<Assumption>;
    if (typeof x.id !== "string" || typeof x.text !== "string") continue;
    out.push({
      ...assumptionTpl,
      ...x,
      testMethod:
        typeof x.testMethod === "string" ? x.testMethod : assumptionTpl.testMethod,
    });
  }
  return out.length ? out : mockWorkspace.assumptions;
}

function sanitizeExperiments(experiments: unknown): Experiment[] {
  if (!Array.isArray(experiments)) return mockWorkspace.experiments;
  const out: Experiment[] = [];
  for (const e of experiments) {
    if (!e || typeof e !== "object") continue;
    const x = e as Partial<Experiment>;
    if (typeof x.id !== "string" || typeof x.title !== "string") continue;
    out.push({
      ...experimentTpl,
      ...x,
      hypothesis:
        typeof x.hypothesis === "string" ? x.hypothesis : experimentTpl.hypothesis,
      method: typeof x.method === "string" ? x.method : experimentTpl.method,
      successMetric:
        typeof x.successMetric === "string"
          ? x.successMetric
          : experimentTpl.successMetric,
      duration:
        typeof x.duration === "string" ? x.duration : experimentTpl.duration,
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
