"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Toaster, toast } from "sonner";
import {
  CopilotChatConfigurationProvider,
  useCopilotKit,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicWorkspace } from "@/components/idealens/DynamicWorkspace";
import { SectionSkeleton } from "@/components/idealens/SectionSkeleton";
import type { ComponentDescriptor } from "@/lib/idealens/types";
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

/** Explicit keys — empty `z.object({})` schemas confuse JSON-schema conversion / Gemini bindings. */
const idealensToolParameters = z
  .object({
    workspace: z.record(z.string(), z.unknown()).optional(),
    workspaceJson: z.string().optional(),
  })
  .passthrough();

function extractWorkspacePayload(args: unknown): Record<string, unknown> | null {
  if (!args || typeof args !== "object" || Array.isArray(args)) return null;
  const o = args as Record<string, unknown>;

  const nested = o.workspace;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }

  const rawJson = o.workspaceJson;
  if (typeof rawJson === "string") {
    try {
      const parsed = JSON.parse(
        rawJson.replace(/```json|```/gi, "").trim(),
      ) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
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

function IdeaLensInner() {
  const { state, agent } = useIdeaLens(IDEA_LENS_AGENT_ID);
  const { copilotkit } = useCopilotKit();
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const genTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [idea, setIdea] = useState(state.idea);
  const [region, setRegion] = useState(state.region);
  const [businessModel, setBusinessModel] = useState(state.businessModel);
  const [goal, setGoal] = useState(state.goal);

  const injectPrompt = useCallback(
    (prompt: string) => {
      if (!agent) return;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `msg-${Date.now()}`;
      agent.addMessage({ id, role: "user", content: prompt });
      void copilotkit.runAgent({ agent }).catch((error: unknown) => {
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
      });
    },
    [agent, copilotkit],
  );

  useFrontendTool({
    agentId: IDEA_LENS_AGENT_ID,
    name: "updateWorkspace",
    description:
      "Replace the entire IdeaLens workspace with agent-generated content. Pass { workspace: <object> } OR put snapshot/personas/assumptions/experiments/scorecard fields at the top level of the tool arguments.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        console.warn("updateWorkspace: unrecognized args", args);
        toast.error(
          "Agent tool payload shape was invalid — check the browser console.",
          { duration: 7000 },
        );
        setIsGenerating(false);
        return "invalid args";
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
      if (agent) patchAgentCanvas(agent, next);
      setIsGenerating(false);
      setIdea(next.idea);
      setRegion(next.region);
      setBusinessModel(next.businessModel);
      setGoal(next.goal);
      return "workspace updated";
    },
  });

  useFrontendTool({
    agentId: IDEA_LENS_AGENT_ID,
    name: "updatePersonaSelection",
    description:
      "Update workspace after the founder selects a persona as ICP. Same payload rules as updateWorkspace.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        console.warn("updatePersonaSelection: unrecognized args", args);
        return "invalid args";
      }
      const merged = mergeWorkspace(workspacePayload);
      const score = computeOverallScore(merged.scorecard.dimensions);
      const next = {
        ...merged,
        scorecard: { ...merged.scorecard, overallScore: score, decision: getDecision(score) },
        agentState: { ...merged.agentState, status: "WaitingForUser" as const, confidence: score },
      };
      if (agent) patchAgentCanvas(agent, next);
      return "persona updated";
    },
  });

  useFrontendTool({
    agentId: IDEA_LENS_AGENT_ID,
    name: "addExperiment",
    description:
      "Merge experiments after a risky assumption is marked. Same payload rules as updateWorkspace.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      if (!agent) return "skipped";
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        console.warn("addExperiment: unrecognized args", args);
        return "invalid args";
      }
      const incoming = mergeWorkspace(workspacePayload);
      const prev = mergeWorkspace(agent.state);
      const mergedEx = mergeNewExperiments(prev.experiments, incoming.experiments);
      const next = applyClientScores({
        ...prev,
        ...incoming,
        experiments: mergedEx,
        agentState: { ...incoming.agentState, status: "WaitingForUser" as const },
      });
      patchAgentCanvas(agent, next);
      return "experiments merged";
    },
  });

  useFrontendTool({
    agentId: IDEA_LENS_AGENT_ID,
    name: "setInterviewScript",
    description:
      "Set interviewScript (and optional agentState snippets). Same payload rules as updateWorkspace — partial objects are OK.",
    parameters: idealensToolParameters,
    handler: async (args) => {
      if (!agent) return "skipped";
      const workspacePayload = extractWorkspacePayload(args);
      if (!workspacePayload) {
        console.warn("setInterviewScript: unrecognized args", args);
        setInterviewLoading(false);
        return "invalid args";
      }
      const incoming = mergeWorkspace(workspacePayload);
      const prev = mergeWorkspace(agent.state);
      const next = applyClientScores({
        ...prev,
        interviewScript: incoming.interviewScript,
        agentState: { ...prev.agentState, ...incoming.agentState, status: "WaitingForUser" as const },
      });
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
    const prev = mergeWorkspace(agent.state);
    patchAgentCanvas(agent, {
      ...prev,
      idea,
      region,
      businessModel,
      goal,
      agentState: { ...prev.agentState, status: "Thinking" },
    });
    setIsGenerating(true);
    if (genTimeoutRef.current) clearTimeout(genTimeoutRef.current);
    genTimeoutRef.current = setTimeout(() => {
      genTimeoutRef.current = null;
      setIsGenerating(false);
      toast.warning("Timed out — showing demo workspace.", { duration: 6000 });
      patchAgentCanvas(agent, {
        ...mockWorkspace,
        agentState: { ...mockWorkspace.agentState, isMockActive: true },
      });
    }, 10000);
    injectPrompt(
      buildGenerateWorkspaceUserMessage(idea, region, businessModel, goal),
    );
  };

  const handleSelectPersona = (personaId: string) => {
    if (!agent) return;
    const prev = mergeWorkspace(agent.state);
    const next = {
      ...prev,
      selectedPersonaId: personaId,
      agentState: { ...prev.agentState, status: "Thinking" as const },
    };
    patchAgentCanvas(agent, next);
    injectPrompt(
      buildPersonaUpdateUserMessage(JSON.stringify(next), personaId),
    );
  };

  const handleMarkRisky = (assumptionId: string) => {
    if (!agent) return;
    const prev = mergeWorkspace(agent.state);
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
    patchAgentCanvas(agent, withLog);
    injectPrompt(
      buildRiskyAssumptionUserMessage(JSON.stringify(withLog), assumptionId),
    );
  };

  const handleMarkValidated = (assumptionId: string) => {
    if (!agent) return;
    const prev = mergeWorkspace(agent.state);
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
    patchAgentCanvas(agent, {
      ...scored,
      agentState: {
        ...scored.agentState,
        activityLog: [
          `Marked assumption ${assumptionId} as validated.`,
          ...scored.agentState.activityLog,
        ],
      },
    });
  };

  const handleMarkInvalidated = (assumptionId: string) => {
    if (!agent) return;
    const prev = mergeWorkspace(agent.state);
    const updated = {
      ...prev,
      assumptions: prev.assumptions.map((a) =>
        a.id === assumptionId ? { ...a, status: "Invalidated" as const } : a,
      ),
    };
    patchAgentCanvas(agent, {
      ...updated,
      agentState: {
        ...updated.agentState,
        activityLog: [
          `Marked assumption ${assumptionId} as invalidated.`,
          ...updated.agentState.activityLog,
        ],
      },
    });
  };

  const resetDemo = () => {
    if (!agent) return;
    patchAgentCanvas(agent, mockWorkspace);
    setIdea(mockWorkspace.idea);
    setRegion(mockWorkspace.region);
    setBusinessModel(mockWorkspace.businessModel);
    setGoal(mockWorkspace.goal);
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
    const prev = mergeWorkspace(agent.state);
    patchAgentCanvas(agent, {
      ...prev,
      agentState: { ...prev.agentState, status: "Thinking" },
    });
    setInterviewLoading(true);
    injectPrompt(buildInterviewScriptUserMessage(JSON.stringify(prev)));
  };

  const centerBlocked =
    isGenerating ||
    (state.agentState.status === "Thinking" && interviewLoading === false);

  const descriptors: ComponentDescriptor[] = [
    {
      id: "snapshot",
      type: "startup_snapshot_card",
      props: { snapshot: state.snapshot },
    },
    {
      id: "personas",
      type: "persona_cards",
      props: {
        personas: state.personas,
        selectedPersonaId: state.selectedPersonaId,
        onSelectICP: handleSelectPersona,
      },
    },
    {
      id: "assumptions",
      type: "assumption_map",
      props: {
        assumptions: state.assumptions,
        onMarkRisky: handleMarkRisky,
        onMarkValidated: handleMarkValidated,
        onMarkInvalidated: handleMarkInvalidated,
      },
    },
    {
      id: "experiments",
      type: "experiment_list",
      props: { experiments: state.experiments },
    },
    {
      id: "scorecard",
      type: "validation_scorecard",
      props: { scorecard: state.scorecard },
    },
  ];

  if (state.interviewScript) {
    descriptors.push({
      id: "interview",
      type: "interview_script_panel",
      props: { script: state.interviewScript },
    });
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <aside className="w-64 shrink-0 overflow-y-auto border-r bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Idea intake
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500" htmlFor="idea">
                Idea
              </label>
              <Textarea
                id="idea"
                className="mt-1 min-h-[100px] text-sm"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Region</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LatAm">LatAm</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                Business model
              </label>
              <Select value={businessModel} onValueChange={setBusinessModel}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SaaS">SaaS</SelectItem>
                  <SelectItem value="Marketplace">Marketplace</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="DTC">DTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Goal</label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Validate demand">Validate demand</SelectItem>
                  <SelectItem value="Pricing sensitivity">Pricing sensitivity</SelectItem>
                  <SelectItem value="Channel fit">Channel fit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              type="button"
              disabled={!idea.trim() || state.agentState.status === "Thinking"}
              onClick={handleGenerate}
            >
              Generate validation workspace
            </Button>
            <Button
              className="w-full"
              type="button"
              variant="outline"
              onClick={sampleIdea}
            >
              Sample idea
            </Button>
            <Button
              className="w-full"
              type="button"
              variant="ghost"
              onClick={resetDemo}
            >
              Reset to demo
            </Button>
            <a
              className="block text-center text-xs text-blue-600 underline"
              href="/leads"
            >
              Back to leads workspace
            </a>
          </div>
        </aside>

        <main className="flex-1 space-y-5 overflow-y-auto p-6">
          {state.agentState.isMockActive && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Demo mode: parsing timed out or failed — showing mock workspace.
            </div>
          )}
          {centerBlocked ? (
            <div className="space-y-5">
              <SectionSkeleton label="Snapshot" />
              <SectionSkeleton label="Personas" />
              <SectionSkeleton label="Assumptions" />
              <SectionSkeleton label="Experiments" />
              <SectionSkeleton label="Scorecard" />
            </div>
          ) : (
            <DynamicWorkspace components={descriptors} />
          )}
          {interviewLoading && (
            <SectionSkeleton label="Interview script" />
          )}
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Agent control
          </p>
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                Status: {state.agentState.status}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">
                Current objective
              </p>
              <p className="text-sm text-gray-700">{state.agentState.currentObjective}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">
                Confidence
              </p>
              <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                {state.agentState.confidence}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">
                Suggestions
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                {state.agentState.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tools
              </p>
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={state.agentState.status === "Thinking"}
                  onClick={handleInterviewScript}
                >
                  Generate interview script
                </Button>
                <Button type="button" size="sm" variant="outline" disabled>
                  Generate 7-day plan
                </Button>
                <Button type="button" size="sm" variant="outline" disabled>
                  Find competitors
                </Button>
                <Button type="button" size="sm" variant="outline" disabled>
                  Landing page copy
                </Button>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Activity log
              </p>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs text-gray-600">
                {state.agentState.activityLog.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
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
