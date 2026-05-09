"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Toaster, toast } from "sonner";
import {
  CopilotChatConfigurationProvider,
  useCopilotKit,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { DynamicWorkspace } from "@/components/idealens/DynamicWorkspace";
import { SectionSkeleton } from "@/components/idealens/SectionSkeleton";
import { IdeaLensIcon } from "@/components/idealens/IdeaLensIcon";
import type {
  ComponentDescriptor,
  IdeaLensWorkspace,
} from "@/lib/idealens/types";
import {
  applyClientScores,
  computeOverallScore,
  getDecision,
} from "@/lib/idealens/scoring";
import { mockWorkspace } from "@/lib/idealens/mock";
import { mergeNewExperiments } from "@/lib/idealens/mergeExperiments";
import {
  IDEA_LENS_AGENT_ID,
  mergeWorkspace,
  useIdeaLens,
} from "@/lib/idealens/useIdeaLens";
import {
  buildGenerateWorkspaceUserMessage,
  buildInterviewScriptUserMessage,
  buildPersonaUpdateUserMessage,
  buildRiskyAssumptionUserMessage,
} from "@/lib/idealens/agentPrompts";
import { parseWorkspaceJsonString } from "@/lib/idealens/parseWorkspaceJson";

import "@/styles/idealens-tokens.css";
import "@/styles/idealens-app.css";

/** Verbose, untruncated debug for failed tool-call payloads.
 *  Chrome's default `console.warn(obj)` truncates long string values to ~150 chars
 *  with an ellipsis, which makes it impossible to see *why* the JSON didn't parse.
 *  Logging the raw string + length + head/tail surfaces unescaped chars / truncation.
 */
function logUnrecognizedToolArgs(toolName: string, args: unknown) {
  const summary: Record<string, unknown> = { toolName, argsType: typeof args };
  if (args && typeof args === "object" && !Array.isArray(args)) {
    const o = args as Record<string, unknown>;
    summary.keys = Object.keys(o);
    for (const k of ["workspace", "workspaceJson", "arguments", "input", "args"]) {
      const v = o[k];
      if (typeof v === "string") {
        summary[`${k}__len`] = v.length;
        summary[`${k}__head`] = v.slice(0, 400);
        summary[`${k}__tail`] = v.slice(Math.max(0, v.length - 400));
      } else if (v !== undefined) {
        summary[`${k}__type`] = typeof v;
      }
    }
  } else if (typeof args === "string") {
    summary.len = args.length;
    summary.head = args.slice(0, 400);
    summary.tail = args.slice(Math.max(0, args.length - 400));
  }
  console.warn(`${toolName}: unrecognized args`, summary);
  console.warn(`${toolName}: raw args (untruncated)`, args);
}

/**
 * z.any().optional() → JSON Schema: {} → Pydantic: required BaseModel field → crashes on None.
 * anyOf with explicit null → Pydantic: Optional[Union[dict, str]] → accepts None safely.
 * Runtime extraction is handled by extractWorkspacePayload, not Zod.
 */
const idealensToolParameters = z
  .object({
    workspace: z
      .union([z.record(z.unknown()), z.string(), z.null()])
      .optional()
      .default(null),
    workspaceJson: z.union([z.string(), z.null()]).optional().default(null),
  })
  .passthrough();

function extractWorkspacePayload(args: unknown): Record<string, unknown> | null {
  if (args == null) return null;
  if (typeof args === "string") {
    const direct = parseWorkspaceJsonString(args);
    if (direct) return direct;
    try {
      const parsed = JSON.parse(args.replace(/```json|```/gi, "").trim()) as unknown;
      return extractWorkspacePayload(parsed);
    } catch {
      return null;
    }
  }
  if (typeof args !== "object" || Array.isArray(args)) return null;
  const o = args as Record<string, unknown>;

  let fromArguments: unknown;
  if (typeof o.arguments === "string") {
    try {
      fromArguments = JSON.parse(o.arguments);
    } catch {
      fromArguments = undefined;
    }
  } else {
    fromArguments = o.arguments;
  }
  const wrapped = o.args ?? o.input ?? fromArguments;
  if (wrapped != null && wrapped !== o) {
    const inner = extractWorkspacePayload(wrapped as unknown);
    if (inner) return inner;
    if (typeof wrapped === "string") {
      const loose = parseWorkspaceJsonString(wrapped);
      if (loose) return loose;
    }
  }

  const nested = o.workspace;
  if (typeof nested === "string") {
    const parsed = parseWorkspaceJsonString(nested);
    if (parsed) return parsed;
    try {
      const fallback = JSON.parse(
        nested.replace(/```json|```/gi, "").trim(),
      ) as unknown;
      if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
        return fallback as Record<string, unknown>;
      }
    } catch {
      /* fall through to workspaceJson / markers */
    }
  }
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }

  const rawJson = o.workspaceJson;
  if (typeof rawJson === "string") {
    const parsed = parseWorkspaceJsonString(rawJson);
    if (parsed) return parsed;
    try {
      const fallback = JSON.parse(
        rawJson.replace(/```json|```/gi, "").trim(),
      ) as unknown;
      if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
        return fallback as Record<string, unknown>;
      }
    } catch {
      /* fall through */
    }
  }

  const markers = [
    "snapshot",
    "personas",
    "assumptions",
    "experiments",
    "scorecard",
    "idea",
    "interviewScript",
    "agentState",
    "businessModel",
    "goal",
    "region",
  ];
  if (markers.some((k) => k in o)) return o;

  return null;
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) =>
        typeof b === "string"
          ? b
          : typeof b === "object" &&
              b &&
              "text" in b &&
              typeof (b as { text?: unknown }).text === "string"
            ? (b as { text: string }).text
            : JSON.stringify(b),
      )
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    const t = (content as { text?: unknown }).text;
    return typeof t === "string" ? t : JSON.stringify(content);
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

/** Stable JSON for debug panel — avoids dumping LangGraph `messages` via mergeWorkspace spread. */
function ideaLensWorkspaceDebugPayload(ws: IdeaLensWorkspace) {
  return {
    idea: ws.idea,
    region: ws.region,
    businessModel: ws.businessModel,
    goal: ws.goal,
    snapshot: ws.snapshot,
    selectedPersonaId: ws.selectedPersonaId,
    personas: ws.personas,
    assumptions: ws.assumptions,
    experiments: ws.experiments,
    scorecard: ws.scorecard,
    interviewScript: ws.interviewScript,
    agentState: ws.agentState,
  };
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function patchAgentCanvas(
  agent: NonNullable<ReturnType<typeof useIdeaLens>["agent"]>,
  workspacePatch: Record<string, unknown>,
) {
  const raw =
    agent.state && typeof agent.state === "object" ? agent.state : {};
  agent.setState({ ...raw, ...workspacePatch });
}

function statusPillClass(status: string): string {
  if (status === "Thinking" || status === "Updating") return "il-status-thinking";
  if (status === "WaitingForUser") return "il-status-waiting";
  return "il-status-idle";
}

function IdeaLensInner() {
  const { state, agent } = useIdeaLens(IDEA_LENS_AGENT_ID);
  const { copilotkit } = useCopilotKit();

  /**
   * toolWorkspace is set by tool handlers and persists through LangGraph run
   * finalization. Without this, `onRunFinalized` syncs the LangGraph checkpoint
   * (which lacks snapshot/personas/etc.) back to the canvas, reverting to mock.
   * workspace is the effective state for content display.
   */
  const [toolWorkspace, setToolWorkspace] = useState<IdeaLensWorkspace | null>(null);
  const workspace = toolWorkspace ?? state;
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const genTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearThinkingAfterRunRef = useRef(false);
  /** Set when updateWorkspace succeeds this turn — avoids a false "without updateWorkspace" log racing the tool handler. */
  const workspaceToolSucceededRef = useRef(false);
  const thinkingCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Prevents overlapping copilotkit.runAgent calls (race + duplicate turns). */
  const runAgentInFlightRef = useRef(false);

  const [idea, setIdea] = useState(state.idea);
  const [region, setRegion] = useState(state.region);
  const [businessModel, setBusinessModel] = useState(state.businessModel);
  const [goal, setGoal] = useState(state.goal);
  const [simpleUi, setSimpleUi] = useState(false);
  /** After first successful updateWorkspace — blocks persona / risky / interview until then. */
  const [followUpsUnlocked, setFollowUpsUnlocked] = useState(false);

  const agentBusy = useMemo(
    () =>
      isGenerating ||
      interviewLoading ||
      workspace.agentState.status === "Thinking",
    [isGenerating, interviewLoading, workspace.agentState.status],
  );

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("simple");
    if (q === "1" || q === "true") setSimpleUi(true);
  }, []);

  const injectPrompt = useCallback(
    (prompt: string) => {
      if (!agent) return;
      if (runAgentInFlightRef.current) {
        toast.message("Espera a que termine el turno del agente.");
        return;
      }
      runAgentInFlightRef.current = true;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `msg-${Date.now()}`;
      agent.addMessage({ id, role: "user", content: prompt });
      void copilotkit
        .runAgent({ agent })
        .catch((error: unknown) => {
          console.error("IdeaLens runAgent failed", error);
          let hint: string | undefined;
          if (error && typeof error === "object") {
            const anyErr = error as Record<string, unknown>;
            if (typeof anyErr.hint === "string") hint = anyErr.hint;
            else if (typeof anyErr.message === "string") {
              try {
                const parsed = JSON.parse(anyErr.message);
                if (parsed && typeof parsed.hint === "string") hint = parsed.hint;
              } catch {
                /* not JSON */
              }
            }
          }
          if (hint) toast.error(hint, { duration: 8000 });
          else
            toast.error("Agent run failed — check the browser console and LangGraph.", {
              duration: 8000,
            });
        })
        .finally(() => {
          runAgentInFlightRef.current = false;
          if (genTimeoutRef.current) {
            clearTimeout(genTimeoutRef.current);
            genTimeoutRef.current = null;
          }
          setIsGenerating(false);
          setInterviewLoading(false);
          const shouldClearThinking = clearThinkingAfterRunRef.current;
          clearThinkingAfterRunRef.current = false;
          if (!shouldClearThinking) return;
          if (thinkingCleanupTimerRef.current) {
            clearTimeout(thinkingCleanupTimerRef.current);
            thinkingCleanupTimerRef.current = null;
          }
          thinkingCleanupTimerRef.current = setTimeout(() => {
            thinkingCleanupTimerRef.current = null;
            if (!agent) return;
            if (workspaceToolSucceededRef.current) return;
            const prev = mergeWorkspace(agent.state);
            if (prev.agentState.status !== "Thinking") return;
            patchAgentCanvas(agent, {
              ...prev,
              agentState: {
                ...prev.agentState,
                status: "WaitingForUser",
                activityLog: [
                  "Turn finished without updateWorkspace — canvas may still show demo merge. Check LangGraph (:8133), model tool calls, and browser console.",
                  ...prev.agentState.activityLog,
                ],
              },
            });
          }, 400);
        });
    },
    [agent, copilotkit],
  );

  useFrontendTool({
    name: "updateWorkspace",
    description:
      "Required after generating a validation workspace. Replaces canvas content and must reflect the founder's idea (not unrelated demo templates). Pass { workspace: <object> } OR snapshot/personas/assumptions/experiments/scorecard fields at the top level.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        logUnrecognizedToolArgs("updateWorkspace", args);
        toast.error(
          "Agent tool payload shape was invalid — check the browser console.",
          { duration: 7000 },
        );
        setIsGenerating(false);
        if (agent) {
          const prev = mergeWorkspace(agent.state);
          patchAgentCanvas(agent, {
            ...prev,
            agentState: { ...prev.agentState, status: "WaitingForUser" },
          });
        }
        return "invalid args";
      }
      workspaceToolSucceededRef.current = true;
      if (thinkingCleanupTimerRef.current) {
        clearTimeout(thinkingCleanupTimerRef.current);
        thinkingCleanupTimerRef.current = null;
      }
      if (genTimeoutRef.current) {
        clearTimeout(genTimeoutRef.current);
        genTimeoutRef.current = null;
      }
      const merged = mergeWorkspace(workspacePayload);
      const scored = applyClientScores(merged);
      const next = {
        ...scored,
        agentState: { ...scored.agentState, status: "WaitingForUser" as const },
      };
      // setToolWorkspace first — guarantees UI update even if agent state reverts
      setToolWorkspace(next);
      if (agent) patchAgentCanvas(agent, next);
      setIsGenerating(false);
      setFollowUpsUnlocked(true);
      setIdea(next.idea);
      setRegion(next.region);
      setBusinessModel(next.businessModel);
      setGoal(next.goal);
      return "workspace updated";
    },
  });

  useFrontendTool({
    name: "updatePersonaSelection",
    description:
      "Update workspace after the founder selects a persona as ICP. Same payload rules as updateWorkspace.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        logUnrecognizedToolArgs("updatePersonaSelection", args);
        return "invalid args";
      }
      const merged = mergeWorkspace(workspacePayload);
      const score = computeOverallScore(merged.scorecard.dimensions);
      const next = {
        ...merged,
        scorecard: { ...merged.scorecard, overallScore: score, decision: getDecision(score) },
        agentState: { ...merged.agentState, status: "WaitingForUser" as const, confidence: score },
      };
      setToolWorkspace(next);
      if (agent) patchAgentCanvas(agent, next);
      return "persona updated";
    },
  });

  useFrontendTool({
    name: "addExperiment",
    description:
      "Merge experiments after a risky assumption is marked. Same payload rules as updateWorkspace.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      if (!agent) return "skipped";
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        logUnrecognizedToolArgs("addExperiment", args);
        return "invalid args";
      }
      const incoming = mergeWorkspace(workspacePayload);
      const prev = toolWorkspace ?? mergeWorkspace(agent.state);
      const mergedEx = mergeNewExperiments(prev.experiments, incoming.experiments);
      const next = applyClientScores({
        ...prev,
        ...incoming,
        experiments: mergedEx,
        agentState: { ...incoming.agentState, status: "WaitingForUser" as const },
      });
      setToolWorkspace(next);
      patchAgentCanvas(agent, next);
      return "experiments merged";
    },
  });

  useFrontendTool({
    name: "setInterviewScript",
    description:
      "Set interviewScript (and optional agentState snippets). Same payload rules as updateWorkspace — partial objects are OK.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      if (!agent) return "skipped";
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        logUnrecognizedToolArgs("setInterviewScript", args);
        setInterviewLoading(false);
        return "invalid args";
      }
      const incoming = mergeWorkspace(workspacePayload);
      const prev = toolWorkspace ?? mergeWorkspace(agent.state);
      const next = applyClientScores({
        ...prev,
        interviewScript: incoming.interviewScript,
        agentState: { ...prev.agentState, ...incoming.agentState, status: "WaitingForUser" as const },
      });
      setToolWorkspace(next);
      patchAgentCanvas(agent, next);
      setInterviewLoading(false);
      return "interview script set";
    },
  });

  useDefaultRenderTool({
    render: () => <span className="hidden" aria-hidden />,
  });

  const handleGenerate = () => {
    if (!agent) return;
    if (runAgentInFlightRef.current || agentBusy) {
      toast.message("Ya hay un turno en curso; espera a que termine.");
      return;
    }
    const prev = mergeWorkspace(agent.state);
    patchAgentCanvas(agent, {
      ...prev,
      idea,
      region,
      businessModel,
      goal,
      agentState: {
        ...prev.agentState,
        status: "Thinking",
        isMockActive: false,
        activityLog: [
          `Generating workspace for: ${idea.trim().slice(0, 160)}${idea.trim().length > 160 ? "…" : ""}`,
        ],
      },
    });
    setIsGenerating(true);
    if (thinkingCleanupTimerRef.current) {
      clearTimeout(thinkingCleanupTimerRef.current);
      thinkingCleanupTimerRef.current = null;
    }
    if (genTimeoutRef.current) clearTimeout(genTimeoutRef.current);
    genTimeoutRef.current = setTimeout(() => {
      genTimeoutRef.current = null;
      setIsGenerating(false);
      toast.warning(
        "Still no workspace update after 2 minutes — showing demo template. Check GEMINI_API_KEY and LangGraph (:8133).",
        { duration: 9000 },
      );
      patchAgentCanvas(agent, {
        ...mockWorkspace,
        idea,
        region,
        businessModel,
        goal,
        agentState: { ...mockWorkspace.agentState, isMockActive: true },
      });
    }, 120_000);
    clearThinkingAfterRunRef.current = true;
    workspaceToolSucceededRef.current = false;
    injectPrompt(
      buildGenerateWorkspaceUserMessage(idea, region, businessModel, goal),
    );
  };

  const handleSelectPersona = (personaId: string) => {
    if (!agent) return;
    if (!followUpsUnlocked) {
      toast.message("Primero genera el workspace con tu idea.");
      return;
    }
    if (agentBusy || runAgentInFlightRef.current) {
      toast.message("Espera a que termine el turno del agente.");
      return;
    }
    const prev = workspace;
    const next = {
      ...prev,
      selectedPersonaId: personaId,
      agentState: { ...prev.agentState, status: "Thinking" as const },
    };
    setToolWorkspace(next);
    patchAgentCanvas(agent, next);
    injectPrompt(
      buildPersonaUpdateUserMessage(JSON.stringify(next), personaId),
    );
  };

  const handleMarkRisky = (assumptionId: string) => {
    if (!agent) return;
    if (!followUpsUnlocked) {
      toast.message("Primero genera el workspace con tu idea.");
      return;
    }
    if (agentBusy || runAgentInFlightRef.current) {
      toast.message("Espera a que termine el turno del agente.");
      return;
    }
    const prev = workspace;
    const updated = {
      ...prev,
      assumptions: prev.assumptions.map((a) =>
        a.id === assumptionId ? { ...a, status: "Risky" as const } : a,
      ),
      scorecard: {
        ...prev.scorecard,
        dimensions: {
          ...prev.scorecard.dimensions,
          evidenceStrength: Math.max(
            0,
            prev.scorecard.dimensions.evidenceStrength - 1.5,
          ),
        },
      },
    };
    const scored = applyClientScores(updated);
    const withLog = {
      ...scored,
      agentState: {
        ...scored.agentState,
        status: "Thinking" as const,
        activityLog: [
          `Marked assumption ${assumptionId} as risky (score adjusted client-side).`,
          ...scored.agentState.activityLog,
        ],
      },
    };
    setToolWorkspace(withLog);
    patchAgentCanvas(agent, withLog);
    injectPrompt(
      buildRiskyAssumptionUserMessage(JSON.stringify(withLog), assumptionId),
    );
  };

  const handleMarkValidated = (assumptionId: string) => {
    if (!agent) return;
    const prev = workspace;
    const updated = {
      ...prev,
      assumptions: prev.assumptions.map((a) =>
        a.id === assumptionId ? { ...a, status: "Validated" as const } : a,
      ),
      scorecard: {
        ...prev.scorecard,
        dimensions: {
          ...prev.scorecard.dimensions,
          evidenceStrength: Math.min(
            10,
            prev.scorecard.dimensions.evidenceStrength + 1,
          ),
        },
      },
    };
    const scored = applyClientScores(updated);
    const validatedNext = {
      ...scored,
      agentState: {
        ...scored.agentState,
        activityLog: [
          `Marked assumption ${assumptionId} as validated.`,
          ...scored.agentState.activityLog,
        ],
      },
    };
    setToolWorkspace(validatedNext);
    patchAgentCanvas(agent, validatedNext);
  };

  const handleMarkInvalidated = (assumptionId: string) => {
    if (!agent) return;
    const prev = workspace;
    const updated = {
      ...prev,
      assumptions: prev.assumptions.map((a) =>
        a.id === assumptionId ? { ...a, status: "Invalidated" as const } : a,
      ),
    };
    const invalidatedNext = {
      ...updated,
      agentState: {
        ...updated.agentState,
        activityLog: [
          `Marked assumption ${assumptionId} as invalidated.`,
          ...updated.agentState.activityLog,
        ],
      },
    };
    setToolWorkspace(invalidatedNext);
    patchAgentCanvas(agent, invalidatedNext);
  };

  const resetDemo = () => {
    if (!agent) return;
    setToolWorkspace(null);
    patchAgentCanvas(agent, mockWorkspace);
    setIdea(mockWorkspace.idea);
    setRegion(mockWorkspace.region);
    setBusinessModel(mockWorkspace.businessModel);
    setGoal(mockWorkspace.goal);
    setFollowUpsUnlocked(false);
    setIsGenerating(false);
    setInterviewLoading(false);
  };

  const sampleIdea = () => {
    setIdea(mockWorkspace.idea);
    setRegion(mockWorkspace.region);
    setBusinessModel(mockWorkspace.businessModel);
    setGoal(mockWorkspace.goal);
  };

  const handleInterviewScript = () => {
    if (!agent) return;
    if (!followUpsUnlocked) {
      toast.message("Primero genera el workspace con tu idea.");
      return;
    }
    if (!workspace.selectedPersonaId) {
      toast.message("Elige una persona ICP antes de generar el script.");
      return;
    }
    if (agentBusy || runAgentInFlightRef.current) {
      toast.message("Espera a que termine el turno del agente.");
      return;
    }
    const prev = workspace;
    const thinkingNext = { ...prev, agentState: { ...prev.agentState, status: "Thinking" as const } };
    setToolWorkspace(thinkingNext);
    patchAgentCanvas(agent, thinkingNext);
    setInterviewLoading(true);
    injectPrompt(buildInterviewScriptUserMessage(JSON.stringify(prev)));
  };

  const centerBlocked =
    isGenerating ||
    (workspace.agentState.status === "Thinking" && interviewLoading === false);

  const descriptors: ComponentDescriptor[] = [
    {
      id: "snapshot",
      type: "startup_snapshot_card",
      props: { snapshot: workspace.snapshot },
    },
    {
      id: "personas",
      type: "persona_cards",
      props: {
        personas: workspace.personas,
        selectedPersonaId: workspace.selectedPersonaId,
        onSelectICP: handleSelectPersona,
        selectionDisabled: !followUpsUnlocked || agentBusy,
      },
    },
    {
      id: "experiments",
      type: "experiment_list",
      props: { experiments: workspace.experiments },
    },
    {
      id: "assumptions",
      type: "assumption_map",
      props: {
        assumptions: workspace.assumptions,
        onMarkRisky: handleMarkRisky,
        onMarkValidated: handleMarkValidated,
        onMarkInvalidated: handleMarkInvalidated,
        riskyDisabled: !followUpsUnlocked || agentBusy,
      },
    },
    {
      id: "scorecard",
      type: "validation_scorecard",
      props: { scorecard: workspace.scorecard },
    },
  ];

  if (workspace.interviewScript) {
    descriptors.push({
      id: "interview",
      type: "interview_script_panel",
      props: { script: workspace.interviewScript },
    });
  }

  const messageTail =
    (
      agent?.messages as Array<{
        id?: string;
        role?: string;
        content?: unknown;
      }>
    )?.slice(-25) ?? [];

  const ideaCount = idea.length;
  const ideaMax = 500;

  return (
    <>
      <div className="il-theme il-app-shell">
        <header className="il-topbar">
          <div className="il-brand">
            <div className="il-mark" aria-hidden>
              <IdeaLensIcon name="il-lens" size={18} />
            </div>
            <div>
              <div className="il-brand-name">
                <span>Idea</span>Lens
              </div>
              <div className="il-tagline">Valida mejor. Construye lo que importa.</div>
            </div>
          </div>
          <div className="il-workspace-title">
            <h1>
              <span>IdeaLens</span> MVP — Main Workspace
            </h1>
            <div className="il-subtitle">
              Workspace de validación generado por IA que se adapta mientras guías al agente.
            </div>
          </div>
          <div className="il-top-actions">
            <a
              className="il-icon-btn"
              href="/leads"
              title="Volver al workspace de leads"
            >
              <IdeaLensIcon name="il-chevron-down" size={14} style={{ transform: "rotate(90deg)" }} />
              Leads
            </a>
            <button
              className="il-icon-btn"
              type="button"
              onClick={resetDemo}
              title="Reset to demo workspace"
            >
              <IdeaLensIcon name="il-refresh" size={14} />
              Reset demo
            </button>
          </div>
        </header>

        <main className="il-main-grid">
          <aside className="il-sidebar">
            <h2 className="il-section-label">
              <span className="il-step">A</span>
              Idea Intake
            </h2>

            <div className="il-field">
              <label className="il-label" htmlFor="idea">
                Startup idea
              </label>
              <textarea
                id="idea"
                className="il-textarea"
                value={idea}
                maxLength={ideaMax}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe la idea de tu startup en una o dos oraciones."
              />
              <div className="il-counter">
                {ideaCount}/{ideaMax}
              </div>
            </div>

            <div className="il-field">
              <label className="il-label" htmlFor="region">
                Region
              </label>
              <select
                id="region"
                className="il-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="LatAm">LatAm</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="Global">Global</option>
              </select>
            </div>

            <div className="il-field">
              <label className="il-label" htmlFor="businessModel">
                Business model
              </label>
              <select
                id="businessModel"
                className="il-select"
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
              >
                <option value="SaaS">SaaS</option>
                <option value="Marketplace">Marketplace</option>
                <option value="Services">Services</option>
                <option value="DTC">DTC</option>
              </select>
            </div>

            <div className="il-field">
              <label className="il-label" htmlFor="goal">
                Validation goal
              </label>
              <select
                id="goal"
                className="il-select"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              >
                <option value="Validate demand">Validate demand</option>
                <option value="Pricing sensitivity">Pricing sensitivity</option>
                <option value="Channel fit">Channel fit</option>
              </select>
            </div>

            <button
              type="button"
              className="il-button il-button-primary w-full"
              style={{ width: "100%" }}
              disabled={!idea.trim() || agentBusy}
              onClick={handleGenerate}
            >
              <IdeaLensIcon name="il-spark" size={14} />
              Generate validation workspace
            </button>

            <hr className="il-divider" />

            <h2 className="il-section-label" style={{ margin: "0 0 10px" }}>
              <span className="il-step">B</span>
              Quick actions
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              <button type="button" className="il-button" onClick={sampleIdea}>
                <IdeaLensIcon name="il-edit" size={14} />
                Load sample idea
              </button>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 10,
                  border: "1px dashed var(--il-color-line)",
                  borderRadius: "var(--il-radius-md)",
                  background: "var(--il-color-surface-soft)",
                  fontSize: "var(--il-font-size-11)",
                  color: "var(--il-color-text)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  style={{ marginTop: 2 }}
                  checked={simpleUi}
                  onChange={(e) => setSimpleUi(e.target.checked)}
                />
                <span>
                  <strong style={{ color: "var(--il-color-ink)" }}>Simple UI</strong>
                  &nbsp;— mensajes del agente + JSON. Tip: <code>?simple=1</code>
                </span>
              </label>
            </div>
          </aside>

          <section className="il-canvas">
            {workspace.agentState.isMockActive && (
              <div className="il-mock-banner">
                <IdeaLensIcon name="il-warning" size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Demo mode: parsing timed out or failed — showing mock workspace.
              </div>
            )}

            {simpleUi ? (
              <>
                <div className="il-debug-card">
                  <h2>Mensajes del agente (últimos {messageTail.length})</h2>
                  {centerBlocked && (
                    <p
                      style={{
                        color: "var(--il-color-warning)",
                        fontSize: "var(--il-font-size-12)",
                        margin: "6px 0 0",
                      }}
                    >
                      Turno en curso… Si el modelo solo escribe texto sin llamar
                      <code style={{ background: "var(--il-color-surface-soft)", padding: "0 4px", margin: "0 4px", borderRadius: 4 }}>
                        updateWorkspace
                      </code>
                      el JSON seguirá siendo el demo.
                    </p>
                  )}
                  <ul style={{ marginTop: 12, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
                    {messageTail.length === 0 ? (
                      <li style={{ fontSize: 12, color: "var(--il-color-muted)" }}>
                        Aún no hay mensajes en este hilo.
                      </li>
                    ) : (
                      messageTail.map((m, i) => (
                        <li
                          key={m.id ?? `msg-${i}`}
                          style={{
                            borderBottom: "1px solid var(--il-color-line)",
                            paddingBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 850,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "var(--il-color-muted)",
                            }}
                          >
                            {m.role ?? "?"}
                          </span>
                          <pre
                            style={{
                              marginTop: 6,
                              maxHeight: 200,
                              overflow: "auto",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--il-color-text)",
                            }}
                          >
                            {messageContentToString(m.content)}
                          </pre>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="il-debug-card">
                  <h2>Workspace (debug)</h2>
                  <pre>{JSON.stringify(ideaLensWorkspaceDebugPayload(workspace), null, 2)}</pre>
                </div>
              </>
            ) : centerBlocked ? (
              <>
                <SectionSkeleton label="Snapshot" />
                <SectionSkeleton label="Personas" />
                <SectionSkeleton label="Experiments" />
                <SectionSkeleton label="Assumptions" />
                <SectionSkeleton label="Scorecard" />
              </>
            ) : (
              <DynamicWorkspace components={descriptors} />
            )}
            {interviewLoading && <SectionSkeleton label="Interview script" />}
          </section>

          <aside className="il-agent-panel">
            <h2 className="il-section-label">
              <span className="il-step">C</span>
              Agent Control
            </h2>
            <div className="il-agent-status">
              <strong>Agent status</strong>
              <span className={`il-status-pill ${statusPillClass(workspace.agentState.status)}`}>
                {workspace.agentState.status}
              </span>
            </div>

            <div className="il-objective">
              <span className="il-block-label">Current objective</span>
              <p>{workspace.agentState.currentObjective}</p>
            </div>

            <div className="il-confidence-row">
              <span>Confidence</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--il-color-brand)" }}>
                {workspace.agentState.confidence}%
              </span>
            </div>
            <div className="il-progress" style={{ marginBottom: 18 }}>
              <span style={{ ["--value" as string]: `${workspace.agentState.confidence}%` }} />
            </div>

            <span className="il-block-label">Suggested next actions</span>
            <div className="il-next-actions">
              {workspace.agentState.suggestions.length === 0 ? (
                <div style={{ color: "var(--il-color-muted)" }}>
                  Genera un workspace para recibir sugerencias del agente.
                </div>
              ) : (
                workspace.agentState.suggestions.map((s) => <div key={s}>{s}</div>)
              )}
            </div>

            <span className="il-block-label">Tools</span>
            <div className="il-tool-list">
              <button
                type="button"
                className="il-button il-button-primary"
                disabled={
                  agentBusy ||
                  !followUpsUnlocked ||
                  !workspace.selectedPersonaId ||
                  interviewLoading
                }
                onClick={handleInterviewScript}
              >
                <IdeaLensIcon name="il-tool" size={14} />
                Generate interview script
              </button>
              <button type="button" className="il-button" disabled>
                <IdeaLensIcon name="il-experiment" size={14} />
                Generate 7-day plan
              </button>
              <button type="button" className="il-button" disabled>
                <IdeaLensIcon name="il-target" size={14} />
                Find competitors (beta)
              </button>
              <button type="button" className="il-button" disabled>
                <IdeaLensIcon name="il-edit" size={14} />
                Landing page copy
              </button>
            </div>

            <span className="il-block-label">Activity log</span>
            <div className="il-activity">
              {workspace.agentState.activityLog.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--il-color-muted)" }}>
                  Sin eventos todavía.
                </div>
              ) : (
                workspace.agentState.activityLog.map((line, i) => (
                  <div className="il-event" key={`${i}-${line.slice(0, 24)}`}>
                    <span className="il-event-time">{String(i + 1).padStart(2, "0")}</span>
                    <span className="il-event-copy">{line}</span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            error: "!bg-rose-50 !text-rose-900 !border !border-rose-200",
          },
        }}
      />
    </>
  );
}

export default function IdeaLensPage() {
  return (
    <ClientOnly>
      <CopilotChatConfigurationProvider agentId={IDEA_LENS_AGENT_ID}>
        <IdeaLensInner />
      </CopilotChatConfigurationProvider>
    </ClientOnly>
  );
}
