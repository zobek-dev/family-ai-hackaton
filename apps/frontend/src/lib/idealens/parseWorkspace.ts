import type {
  IdeaLensWorkspace,
  InterviewScript,
  ValidationScorecard,
} from "./types";
import { mockWorkspace } from "./mock";

function mergeParsedIntoWorkspace(
  parsed: Partial<IdeaLensWorkspace>,
): IdeaLensWorkspace {
  const dim = {
    ...mockWorkspace.scorecard.dimensions,
    ...(parsed.scorecard?.dimensions ?? {}),
  };
  const scorecard: ValidationScorecard = {
    ...mockWorkspace.scorecard,
    ...(parsed.scorecard ?? {}),
    dimensions: dim,
  };
  return {
    ...mockWorkspace,
    ...parsed,
    snapshot: { ...mockWorkspace.snapshot, ...(parsed.snapshot ?? {}) },
    personas: parsed.personas ?? mockWorkspace.personas,
    selectedPersonaId:
      parsed.selectedPersonaId !== undefined
        ? parsed.selectedPersonaId
        : mockWorkspace.selectedPersonaId,
    assumptions: parsed.assumptions ?? mockWorkspace.assumptions,
    experiments: parsed.experiments ?? mockWorkspace.experiments,
    scorecard,
    interviewScript:
      parsed.interviewScript !== undefined
        ? parsed.interviewScript
        : mockWorkspace.interviewScript,
    agentState: {
      ...mockWorkspace.agentState,
      ...(parsed.agentState ?? {}),
      isMockActive: false,
    },
  };
}

export function parseWorkspaceSafely(raw: string): IdeaLensWorkspace {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<IdeaLensWorkspace> &
      Record<string, unknown>;

    const interviewOnly =
      parsed.interviewScript &&
      typeof parsed.interviewScript === "object" &&
      !parsed.snapshot &&
      !parsed.idea;

    if (interviewOnly) {
      return {
        ...mockWorkspace,
        interviewScript: parsed.interviewScript as InterviewScript,
        agentState: {
          ...mockWorkspace.agentState,
          ...(parsed.agentState ?? {}),
          isMockActive: false,
        },
      };
    }

    return mergeParsedIntoWorkspace(parsed);
  } catch {
    console.warn("IdeaLens: parse failed — activating mock fallback.");
    return {
      ...mockWorkspace,
      agentState: {
        ...mockWorkspace.agentState,
        isMockActive: true,
      },
    };
  }
}
