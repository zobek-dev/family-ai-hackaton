# IdeaLens — MVP Build Spec v4
### Hackathon Edition · 6-Hour Build · AI Tinkerers Santiago

---

## 1. What We Are Building

**IdeaLens** turns a rough startup idea into an agent-generated interactive validation workspace.

The agent does not return a chat message. It generates structured UI components at runtime — a startup snapshot, persona cards, an assumption map, an experiment list, and a validation score — all driven by shared agent state that updates as the founder interacts.

**One-line pitch for the demo:**
> *"The agent is not just inside the app. The agent is shaping the app."*

---

## 2. Hackathon Challenge Alignment

The challenge defines four criteria. Every feature in this spec maps directly to one or more of them.

### Criterion 1 — Dynamic Component Generation
> *"UI that adapts its structure and state based on the reasoning of the underlying model."*

**How IdeaLens satisfies it:**

The agent does not fill a fixed template. It returns a `workspace_update` event containing a `components` array — a list of typed component descriptors with their props. The frontend's `DynamicWorkspace` renderer looks up each `type` in a `componentRegistry` and mounts the corresponding React component. Two different startup ideas produce structurally different workspaces: different assumptions, different personas, different experiments — the agent decides what to generate based on the idea's domain and risk profile.

Additionally, when the user clicks "Generate Interview Script," the agent emits a new `interview_script_panel` component that did not exist in the initial workspace. The workspace grows at runtime based on agent reasoning.

**Implementation:** Component Registry (Section 13).

---

### Criterion 2 — Agentic Feedback Loops
> *"Interfaces that allow users to guide autonomous agents through interactive visual elements in real time."*

**How IdeaLens satisfies it:**

IdeaLens has three fully wired feedback loops. In every case, the user acts through a UI element — not a text box — and the agent responds by updating the workspace:

| Loop | User action (visual) | Agent response |
|---|---|---|
| Loop 1 | Click "Select as ICP" on persona card | Updates snapshot, assumptions, experiments, scorecard |
| Loop 2 | Click "Mark Risky" on assumption row | Lowers evidence score, generates new validation experiment |
| Loop 3 | Click "Generate Interview Script" button | Renders new InterviewScriptPanel component in workspace |

At no point does the user type instructions. The visual interaction *is* the input to the agent.

**Implementation:** Section 14.

---

### Criterion 3 — Latency-Optimized Rendering
> *"Leveraging techniques like KV cache optimization or local execution (via Gemma 4 or Muse Spark) for smooth, lag-free user experiences."*

**How IdeaLens satisfies it:**

Three-layer strategy:

**Layer A — Immediate skeletons.** All workspace sections display animated skeleton placeholders within 100ms of the user clicking Generate. The user never sees a blank screen.

**Layer B — KV cache via system prompt pinning.** The `SYSTEM_PROMPT` is kept constant across all Gemini calls. Gemini 2.0 Flash caches the system prompt KV automatically when it is identical between requests. This means workspace update calls (persona selection, risky assumption) are significantly faster than the initial generation call — the model does not reprocess the system context.

**Layer C — Client-side computation for instant feedback.** Score changes triggered by user interactions (marking risky, marking validated) are computed client-side using `computeOverallScore` — zero LLM latency. The scorecard updates in under 16ms. The LLM is only called when new generative content is needed (a new experiment, a new component).

**Gemma 4 / Muse Spark path (bonus, P6+):** If the team has bandwidth after P5, the interview script generator can be swapped to run locally via Gemma 4 using Ollama or via Muse Spark's edge runtime, eliminating network latency entirely for that action. This would be a meaningful upgrade to call out on stage.

**Implementation:** Section 15 (Latency Strategy).

---

### Criterion 4 — Tool-Enabled Interfaces
> *"UI that not only displays data but provides interactive hooks for agents to execute workflows across apps."*

**How IdeaLens satisfies it:**

The AgentControlPanel is not a display panel — it is a tool launcher. Each button in the panel is an interactive hook that triggers a specific agent tool action. The agent does not decide to run a tool autonomously; the user authorizes each tool call via a UI interaction.

For the MVP, one tool is fully wired:

| Tool button | Agent action | Output rendered |
|---|---|---|
| Generate Interview Script | Agent reads persona + riskiest assumption, calls `generate_interview_script` tool | New `InterviewScriptPanel` component in workspace |

Three additional tool hooks are present as visible buttons (not wired for MVP, demonstrating the pattern):

| Tool button | Intended tool action | MVP status |
|---|---|---|
| Generate 7-Day Plan | Agent builds a prioritized weekly experiment plan | Visual only |
| Find Competitors | Agent searches via MCP web_search tool, renders competitor cards | Visual only |
| Create Landing Page Copy | Agent generates hero + CTA copy as an editable card | Visual only |

**MCP pattern:** The tool buttons follow the MCP Apps pattern — the agent receives a tool call request, executes it, and returns a structured component payload that the frontend renders. For the MVP, the tool execution happens inside the CopilotKit runtime. The pattern is identical to MCP tool invocation and should be narrated as such on stage.

**Implementation:** Section 16 (Tool-Enabled Interface Pattern).

---

### Protocol Coverage

| Protocol | Role in IdeaLens | Status |
|---|---|---|
| **AG-UI** (CopilotKit) | Agent streams `workspace_update` events containing component descriptors to the frontend | ✅ Core protocol — used for all agent → UI communication |
| **A2UI** (Google) | Component descriptor schema — the agent sends typed component payloads (`type`, `props`) that the frontend registry maps to React components | ✅ Pattern implemented via component registry |
| **CopilotKit** | `useCoAgent` hook for shared agent ↔ UI state; CopilotKit runtime for Gemini integration | ✅ Core framework |
| **MCP Apps** | Tool button pattern in AgentControlPanel — agent tools triggered by interactive UI hooks | ✅ Pattern implemented; `generate_interview_script` tool is fully wired |

---

## 3. Stack — Non-Negotiable for 6 Hours

| Layer | Tool | Why |
|---|---|---|
| Frontend + routing | Next.js 14 (App Router) | Fast scaffold, no config overhead |
| UI components | shadcn/ui + Tailwind | Zero custom CSS — Card, Badge, Button, Progress |
| Agent state ↔ UI | CopilotKit `useCoAgent` | Shared state + AG-UI streaming built-in |
| Agent protocol | AG-UI events + A2UI component schema | Both protocols demonstrated on stage |
| LLM | Gemini 2.0 Flash | Hackathon credits, KV cache, fast structured output |
| Tool pattern | MCP-style tool hooks in AgentControlPanel | Demonstrates Criterion 4 |
| Local state | React Context | No Zustand — zero config, enough for MVP |
| Animations | Tailwind `animate-pulse` + `transition` | No Framer Motion — saves 1 hour |

**Hard do-not-add list:** auth, database, Framer Motion, react-beautiful-dnd, Zustand, Notion/Sheets APIs, payments, multi-user.

**Bonus-only additions (P6+):** Gemma 4 via Ollama for local script generation, `@dnd-kit/core` for kanban drag-and-drop.

---

## 4. Build Priority — In Order

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  MUST SHIP
 P1  Layout shell + component registry + mock data wired
 P2  AG-UI wiring + Persona loop (Agentic Loop 1)
 P3  Tool action: Interview Script → new component (Loop 3 + Criterion 4)
 P4  Assumption map + risky marking → new experiment (Agentic Loop 2)
 P5  Dynamic scorecard with client-side scoring (Criterion 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  BONUS ONLY
 P6  Kanban experiment board
 P7  Gemma 4 / Muse Spark local execution for script generation
```

**Decision rule:** If P2 is not complete by 1:30 PM, move to P3 and return to P4 after lunch. A clean P1–P3 demo that clearly shows all four hackathon criteria beats a broken P1–P6.

---

## 5. Detailed Phase Plan

---

### Phase 0 — Environment Setup
**Time:** 11:00 AM – 11:45 AM · 45 minutes
**Goal:** Running Next.js app with layout shell, component registry, and mock data visible in the browser.

**0.1 Scaffold**
```bash
npx create-next-app@latest idealens --typescript --tailwind --app
cd idealens
```

**0.2 Install all dependencies**
```bash
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime
npm install @ag-ui/client @ag-ui/react
npx shadcn@latest init
npx shadcn@latest add card badge button progress separator scroll-area
```

**0.3 Environment**
```bash
# .env.local
GEMINI_API_KEY=your_key_here
```

**0.4 Files to create in Phase 0**
- `types/workspace.ts` — Section 7
- `types/components.ts` — Section 13 (component registry types)
- `lib/mock/mockWorkspace.ts` — Section 17
- `lib/agent/componentRegistry.ts` — Section 13
- `app/api/copilotkit/route.ts` — Section 9
- `app/page.tsx` — Section 12 (layout shell, mock data, no agent calls)

**Exit criteria:** Browser shows three columns. Center panel shows five labeled sections with mock data rendered through the component registry. No console errors.

---

### Phase 1 — Static Layout + All Components (P1)
**Time:** 11:45 AM – 12:30 PM · 45 minutes
**Goal:** All workspace components built and rendering via the registry. No agent calls yet.

**1.1 Component registry first**
Build `lib/agent/componentRegistry.ts` before building any workspace component (Section 13). All workspace components must be registered before they can render.

**1.2 StartupSnapshotCard**
Eight labeled fields in a two-column card grid. "Edit" and "Regenerate" buttons visual only.

**1.3 PersonaCards**
Three cards in a row. Each shows: name, description, painIntensity / budgetLevel / urgency badges, acquisition channel, objections list, "Select as ICP" button (not wired), "Reject" button (not wired).

**1.4 AssumptionMap**
Table layout: assumption text, category badge, importance badge, status badge, test method, "Mark Risky" / "Mark Validated" / "Mark Invalidated" buttons (not wired).

**1.5 ExperimentList**
Simple vertical card list. Each card: title, hypothesis, method, success metric, effort / cost / duration / status badges.

**1.6 ValidationScorecard**
Overall score (large number), decision badge, biggest risk, recommended next step, eight dimension progress bars (0–10). "Provisional" label under score.

**1.7 AgentControlPanel (right panel)**
Status badge, current objective, confidence bar, suggestions list, divider, tool buttons section (four buttons — only "Generate Interview Script" wired later), divider, activity log.

**1.8 SectionSkeleton**
```tsx
export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 animate-pulse space-y-3">
      <div className="h-3 w-24 rounded bg-gray-100 uppercase text-xs">{label}</div>
      <div className="h-4 w-3/4 rounded bg-gray-100" />
      <div className="h-3 w-full rounded bg-gray-100" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
    </div>
  );
}
```

**1.9 Left panel**
Idea textarea, region selector, business model selector, goal selector, "Generate Validation Workspace" primary button (not wired), "Sample idea" ghost button, "Reset to Demo" ghost button (wired immediately — restores mock).

**Exit criteria:** All five workspace sections render through the component registry using mock data. "Reset to Demo" works. Skeletons render when a flag is toggled. No console errors.

---

### Phase 2 — AG-UI Wiring + Persona Loop (P2)
**Time:** 12:30 PM – 1:30 PM · 60 minutes
**Goal:** AG-UI connected. Workspace generates from a real idea. Persona selection updates workspace via Gemini.

**2.1 Wrap layout**
```tsx
// app/layout.tsx
import { CopilotKit } from "@copilotkit/react-core";
// Wrap children with <CopilotKit runtimeUrl="/api/copilotkit">
```

**2.2 Create workspace hook**
`lib/hooks/useWorkspace.ts` with `useCoAgent` — Section 9.

**2.3 Wire "Generate Validation Workspace"**
```
On click:
  → Show skeletons for all five sections (< 100ms)
  → agentState.status = "Thinking"
  → Emit AG-UI run event with GENERATE_WORKSPACE_PROMPT
  → On response: parseWorkspaceSafely → setState
  → DynamicWorkspace re-renders from new component array
  → On timeout (> 10s): mock fallback, isMockActive = true
```

**2.4 Wire "Select as ICP"**
```
On click:
  → Optimistic: highlight card immediately (< 100ms)
  → agentState.status = "Thinking"
  → Emit AG-UI run event with UPDATE_ON_PERSONA_PROMPT
  → On response: parseWorkspaceSafely → setState(updated)
  → computeOverallScore(updated.dimensions) → update scorecard
  → agentState.status = "WaitingForUser"
```

**2.5 Narrate the AG-UI pattern on stage**
When generating the workspace, the agent emits `workspace_update` events that carry component descriptors. The frontend does not poll — it reacts to the stream. This is the AG-UI protocol in action.

**Exit criteria:** Entering an idea generates a real workspace (or clean mock fallback with "demo mode" badge). Selecting a persona updates all dependent sections. Activity log shows the event.

---

### Lunch Break
**Time:** 1:30 PM – 2:00 PM · 30 minutes
**Rule:** No laptops.

---

### Phase 3 — Tool Action: Interview Script (P3)
**Time:** 2:00 PM – 2:45 PM · 45 minutes
**Goal:** The "Generate Interview Script" button triggers an agent tool call that renders a new component in the workspace. This is the clearest demonstration of Criterion 4 (Tool-Enabled Interfaces) and Criterion 1 (Dynamic Component Generation) simultaneously.

**3.1 Wire the tool button**
```
On click:
  → agentState.status = "Thinking"
  → Show SectionSkeleton labeled "Interview Script" at bottom of center panel
  → Call agent tool: generate_interview_script
     (reads selected persona + riskiest assumption from state)
  → On response: parse interviewScript payload
  → setState({ interviewScript: parsed })
  → DynamicWorkspace mounts InterviewScriptPanel as a new component
  → agentState.status = "WaitingForUser"
  → activityLog: prepend "Interview script generated for [persona name]."
```

**3.2 Build InterviewScriptPanel**
- Header: script title + target persona badge + goal statement
- Question list: each question card has four labeled fields: question (bold), purpose (gray), good signal (green), red flag (red)
- Footer: "Copy all questions" — `navigator.clipboard.writeText()`, no backend

**3.3 Conditional render**
```tsx
{state.interviewScript && (
  <InterviewScriptPanel script={state.interviewScript} />
)}
```

**3.4 On-stage narration cue**
> "I click a tool button. The agent reads the ICP and the riskiest assumption. It doesn't return text — it renders a new component into the workspace. This is tool-enabled generative UI."

**Exit criteria:** Button shows skeleton immediately. Script renders as a new card section with 6–8 questions referencing the selected persona. No chat message appears anywhere.

---

### Phase 4 — Assumption Loop (P4)
**Time:** 2:45 PM – 3:30 PM · 45 minutes
**Goal:** Marking an assumption risky instantly updates the score (client-side) and triggers a new experiment (agent).

**4.1 Wire "Mark Risky"**
```
On click:
  → Optimistic: badge → "Risky" (red) immediately
  → Client-side: evidenceStrength -= 1.5 (min 0)
  → computeOverallScore → scorecard updates instantly (0 LLM calls)
  → Call agent with UPDATE_ON_RISKY_ASSUMPTION_PROMPT
  → On response: mergeNewExperiment(current, incoming)
  → New experiment appears at top of ExperimentList
  → activityLog: prepend two entries
```

**4.2 Experiment merge**
```ts
function mergeNewExperiment(current: Experiment[], incoming: Experiment[]): Experiment[] {
  const existingIds = new Set(current.map(e => e.id));
  return [...incoming.filter(e => !existingIds.has(e.id)), ...current];
}
```

**4.3 Wire "Mark Validated"** (client-side only, no LLM call)
- Badge → green, `evidenceStrength += 1.0` (max 10), recompute, log entry.

**4.4 Wire "Mark Invalidated"** (client-side only, no LLM call)
- Badge → gray, no score change, log entry.

**Exit criteria:** Badge turns red instantly. Score drops immediately. New experiment at top of list within 5 seconds. `relatedAssumptionId` is set.

---

### Phase 5 — Dynamic Scorecard (P5)
**Time:** 3:30 PM – 4:00 PM · 30 minutes
**Goal:** Scorecard reacts to every interaction instantly. Demonstrates Criterion 3 (client-side latency optimization).

**5.1** All mutations use `computeOverallScore` (Section 8). Discard LLM-provided `overallScore`.

**5.2** Animate score on change:
```tsx
<span className="text-5xl font-bold tabular-nums transition-all duration-500">
  {scorecard.overallScore}
</span>
```

**5.3** Decision badge color-coding:
- ≥ 70: `bg-green-100 text-green-700` — Proceed
- 45–69: `bg-amber-100 text-amber-700` — Validate First
- < 45: `bg-red-100 text-red-700` — Pivot

**5.4** Add "Provisional — based on available evidence" label under score.

**5.5** Eight dimension `<Progress>` bars read directly from `scorecard.dimensions`. No extra wiring needed.

**5.6 On-stage narration cue for Criterion 3:**
> "The score updates instantly — no API call. Client-side computation. The LLM is only called when new content needs to be generated."

**Exit criteria:** Score changes in < 16ms on risky marking. Score changes post-LLM on persona selection. Decision label updates. Bars animate.

---

### Buffer + Polish
**Time:** 4:00 PM – 4:30 PM · 30 minutes

**Checklist:**
- [ ] Full demo flow runs in under 3 minutes end-to-end
- [ ] "Reset to Demo" works reliably — test 3 times in a row
- [ ] No console errors during demo flow
- [ ] `isMockActive` badge visible in right panel when mock is active
- [ ] All skeletons appear within 100ms of Generate click
- [ ] Activity log scrolls correctly when full
- [ ] Score animation is smooth
- [ ] Tool buttons in AgentControlPanel are labeled clearly (wired ones vs. "coming soon" ones)

---

### Phase 6 — Kanban (P6, bonus only)
**Time:** 4:30 PM – 5:00 PM · only if P1–P5 are solid

Replace `ExperimentList` with four-column grid. Use `<select>` per card (not `dnd-kit`) to save time:
```tsx
<select
  value={experiment.status}
  onChange={e => moveExperiment(experiment.id, e.target.value as Experiment["status"])}
  className="text-xs border rounded p-1"
>
  {["Backlog", "This Week", "Running", "Done"].map(s => <option key={s}>{s}</option>)}
</select>
```

Add `@dnd-kit/core` only if 45+ minutes remain after the select version works.

---

### Phase 7 — Local Execution via Gemma 4 (P7, moonshot)
**Time:** 5:00 PM – 5:30 PM · only if P1–P6 are solid and Gemma 4 is available locally

Swap the interview script generator to use Gemma 4 via Ollama:
```bash
ollama pull gemma4
```
```ts
// Use Ollama's OpenAI-compatible endpoint
const response = await fetch("http://localhost:11434/v1/chat/completions", {
  method: "POST",
  body: JSON.stringify({
    model: "gemma4",
    messages: [{ role: "user", content: GENERATE_INTERVIEW_SCRIPT_PROMPT(workspaceJson) }]
  })
});
```

If this works, the interview script generates with zero network latency. On stage: "This component is generated locally — no API call, no cloud, instant." That directly demonstrates the Gemma 4 / Muse Spark path from Criterion 3.

---

### Submission + Show-and-Tell Prep
**Time:** 5:00 PM – 5:30 PM (or earlier if P7 is skipped)

1. Push to public GitHub repo
2. `README.md`: one-line description, stack + protocols used, how to run, `.env` setup
3. Submit to hackathon global platform before 6:00 PM
4. Practice demo script (Section 18) twice — target under 2:30
5. Open a backup browser tab with mock data pre-loaded

---

## 6. Project Structure

```
idealens/
├── app/
│   ├── page.tsx                       ← three-column layout shell
│   ├── layout.tsx                     ← CopilotKit provider
│   ├── globals.css
│   └── api/
│       └── copilotkit/
│           └── route.ts               ← CopilotKit + Gemini runtime
├── components/
│   ├── layout/
│   │   ├── LeftPanel.tsx              ← idea intake + controls
│   │   ├── CenterPanel.tsx            ← DynamicWorkspace renderer
│   │   └── RightPanel.tsx             ← agent state + tool launcher
│   ├── workspace/
│   │   ├── DynamicWorkspace.tsx       ← component registry renderer
│   │   ├── StartupSnapshotCard.tsx
│   │   ├── PersonaCards.tsx
│   │   ├── AssumptionMap.tsx
│   │   ├── ExperimentList.tsx
│   │   ├── ValidationScorecard.tsx
│   │   └── InterviewScriptPanel.tsx
│   └── shared/
│       └── SectionSkeleton.tsx
├── lib/
│   ├── hooks/
│   │   └── useWorkspace.ts            ← useCoAgent wrapper
│   ├── agent/
│   │   ├── componentRegistry.ts       ← A2UI-style component registry
│   │   ├── prompts.ts                 ← all LLM prompts
│   │   └── parseWorkspace.ts          ← safe JSON parse + fallback
│   ├── mock/
│   │   └── mockWorkspace.ts
│   └── scoring.ts
├── types/
│   ├── workspace.ts
│   └── components.ts                  ← component descriptor types
└── README.md
```

---

## 7. Core Data Types

```ts
// types/workspace.ts

export type IdeaLensWorkspace = {
  idea: string;
  region: string;
  businessModel: string;
  goal: string;
  snapshot: StartupSnapshot;
  personas: Persona[];
  selectedPersonaId: string | null;
  assumptions: Assumption[];
  experiments: Experiment[];
  scorecard: ValidationScorecard;
  interviewScript: InterviewScript | null;
  agentState: AgentState;
};

export type StartupSnapshot = {
  problem: string;
  customer: string;
  solution: string;
  category: string;
  wedge: string;
  monetization: string;
  mainAssumption: string;
  validationPriority: string;
};

export type Persona = {
  id: string;
  name: string;
  description: string;
  painIntensity: "Low" | "Medium" | "High";
  budgetLevel: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  acquisitionChannel: string;
  objections: string[];
};

export type Assumption = {
  id: string;
  text: string;
  category: "Customer" | "Problem" | "Solution" | "Market" | "Distribution" | "Monetization";
  importance: "Low" | "Medium" | "High";
  status: "Unknown" | "Risky" | "Validated" | "Invalidated";
  testMethod: string;
};

export type Experiment = {
  id: string;
  title: string;
  hypothesis: string;
  method: string;
  successMetric: string;
  effort: "Low" | "Medium" | "High";
  cost: "Free" | "Low" | "Medium";
  duration: string;
  status: "Backlog" | "This Week" | "Running" | "Done";
  relatedAssumptionId?: string;
};

export type ValidationScorecard = {
  overallScore: number;         // 0–100, always computed client-side
  decision: string;             // "Proceed" | "Validate First" | "Pivot"
  biggestRisk: string;
  recommendedNextStep: string;
  dimensions: {
    problemClarity: number;
    customerSpecificity: number;
    urgency: number;
    differentiation: number;
    monetizationClarity: number;
    mvpFeasibility: number;
    distributionFeasibility: number;
    evidenceStrength: number;   // reduced client-side when assumptions marked risky
  };
};

export type InterviewScript = {
  title: string;
  targetPersona: string;
  goal: string;
  questions: {
    id: string;
    question: string;
    purpose: string;
    goodSignal: string;
    redFlag: string;
  }[];
};

export type AgentState = {
  status: "Idle" | "Thinking" | "Updating" | "WaitingForUser";
  currentObjective: string;
  confidence: number;
  suggestions: string[];
  activityLog: string[];
  isMockActive: boolean;
};
```

```ts
// types/components.ts

// A2UI-style component descriptor
export type ComponentDescriptor = {
  id: string;
  type: keyof typeof componentRegistry;
  props: Record<string, unknown>;
};

export type WorkspaceUpdateEvent = {
  type: "workspace_update";
  reason: string;
  components: ComponentDescriptor[];
};
```

---

## 8. Deterministic Score Formula

**Never let the LLM compute the overall score.**

```ts
// lib/scoring.ts

export function computeOverallScore(
  dimensions: ValidationScorecard["dimensions"]
): number {
  const weights = {
    problemClarity: 1.5,
    customerSpecificity: 1.5,
    urgency: 1.0,
    differentiation: 1.0,
    monetizationClarity: 1.5,
    mvpFeasibility: 0.8,
    distributionFeasibility: 0.8,
    evidenceStrength: 1.9,    // highest weight — most impacted by user interactions
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const weighted = Object.entries(dimensions).reduce(
    (sum, [k, v]) => sum + v * (weights[k as keyof typeof weights] ?? 1), 0
  );
  return Math.round((weighted / (total * 10)) * 100);
}

export function getDecision(score: number): "Proceed" | "Validate First" | "Pivot" {
  if (score >= 70) return "Proceed";
  if (score >= 45) return "Validate First";
  return "Pivot";
}
```

**Client-side mutation rules (zero LLM latency):**

| User action | `evidenceStrength` delta | LLM call? |
|---|---|---|
| Mark assumption Risky | − 1.5 (min 0) | Yes — to generate new experiment |
| Mark assumption Validated | + 1.0 (max 10) | No |
| Mark assumption Invalidated | No change | No |
| Select persona | LLM returns new dimensions | Yes — full workspace update |

Always call `computeOverallScore` after any dimension mutation. Discard any `overallScore` in the LLM response.

---

## 9. CopilotKit + AG-UI Setup

### Runtime Route

```ts
// app/api/copilotkit/route.ts
import { CopilotRuntime, GoogleGenerativeAIAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const runtime = new CopilotRuntime();
  const { handleRequest } = runtime.process(
    new GoogleGenerativeAIAdapter({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
    })
  );
  return handleRequest(req);
}
```

### Root Layout

```tsx
// app/layout.tsx
import { CopilotKit } from "@copilotkit/react-core";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
      </body>
    </html>
  );
}
```

### Workspace Hook

```tsx
// lib/hooks/useWorkspace.ts
import { useCoAgent } from "@copilotkit/react-core";
import { IdeaLensWorkspace } from "@/types/workspace";
import { mockWorkspace } from "@/lib/mock/mockWorkspace";

export function useWorkspace() {
  return useCoAgent<IdeaLensWorkspace>({
    name: "idealens_agent",
    initialState: mockWorkspace,
  });
}
```

---

## 10. LLM Prompts

```ts
// lib/agent/prompts.ts

// IMPORTANT: Keep SYSTEM_PROMPT identical across all calls.
// Gemini 2.0 Flash caches the system prompt KV automatically
// when the content is byte-identical. This makes workspace
// update calls significantly faster than the initial generation.
export const SYSTEM_PROMPT = `
You are IdeaLens, an agent that generates startup validation workspaces.
Rules:
- Always return valid JSON. Never return markdown or plain text.
- Be specific. Avoid generic startup advice.
- Identify the riskiest assumptions, not the most obvious ones.
- Recommend experiments completable in under one week.
- Do not fabricate evidence. Mark confidence Low when there is no data.
- Never include overallScore in the scorecard — it is computed by the client.
`;

export const GENERATE_WORKSPACE_PROMPT = (
  idea: string, region: string, model: string, goal: string
) => `
${SYSTEM_PROMPT}

Generate a complete IdeaLensWorkspace JSON for:
Idea: ${idea}
Region: ${region}
Business model: ${model}
Validation goal: ${goal}

Include: snapshot, 3 personas, 5 assumptions, 4 experiments,
scorecard dimensions 0–10 (no overallScore), agentState.
`;

export const UPDATE_ON_PERSONA_PROMPT = (workspace: string, personaId: string) => `
${SYSTEM_PROMPT}

Persona selected: ${personaId}
Current workspace: ${workspace}

Update ONLY: snapshot.customer, snapshot.mainAssumption,
snapshot.validationPriority, assumptions (re-rank by relevance),
experiments (reprioritize), scorecard.dimensions.customerSpecificity,
scorecard.dimensions.urgency, agentState.currentObjective,
agentState.suggestions, agentState.activityLog (prepend one entry).

Return the full updated workspace JSON. Do not omit unchanged fields.
`;

export const UPDATE_ON_RISKY_ASSUMPTION_PROMPT = (workspace: string, assumptionId: string) => `
${SYSTEM_PROMPT}

Assumption marked risky: ${assumptionId}
Current workspace: ${workspace}

Update ONLY:
- assumptions[id].status → "Risky"
- experiments: add ONE new experiment (relatedAssumptionId = ${assumptionId},
  status = "This Week", effort Low or Medium)
- agentState.currentObjective, agentState.suggestions,
  agentState.activityLog (prepend one entry)

Return the full updated workspace JSON.
`;

export const GENERATE_INTERVIEW_SCRIPT_PROMPT = (workspace: string) => `
${SYSTEM_PROMPT}

Generate a customer interview script for the selected persona and riskiest assumption.
Current workspace: ${workspace}

Return ONLY:
{
  "interviewScript": {
    "title": string,
    "targetPersona": string,
    "goal": string,
    "questions": [{
      "id": string,
      "question": string,
      "purpose": string,
      "goodSignal": string,
      "redFlag": string
    }]
  }
}

6–8 questions. Open-ended only. Focus on the highest-importance Risky assumption.
`;
```

---

## 11. Safe JSON Parser + Fallback

```ts
// lib/agent/parseWorkspace.ts
import { IdeaLensWorkspace } from "@/types/workspace";
import { mockWorkspace } from "@/lib/mock/mockWorkspace";

export function parseWorkspaceSafely(raw: string): IdeaLensWorkspace {
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return { ...parsed, agentState: { ...parsed.agentState, isMockActive: false } };
  } catch {
    console.warn("IdeaLens: parse failed — activating mock fallback.");
    return { ...mockWorkspace, agentState: { ...mockWorkspace.agentState, isMockActive: true } };
  }
}
```

**10-second timeout:**
```ts
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | { fallback: true }> =>
  Promise.race([promise, new Promise<{ fallback: true }>(r => setTimeout(() => r({ fallback: true }), ms))]);

const result = await withTimeout(geminiCall, 10000);
if ("fallback" in result) {
  setState({ ...mockWorkspace, agentState: { ...mockWorkspace.agentState, isMockActive: true } });
}
```

---

## 12. Three-Column Layout

```tsx
// app/page.tsx
"use client";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { LeftPanel } from "@/components/layout/LeftPanel";
import { CenterPanel } from "@/components/layout/CenterPanel";
import { RightPanel } from "@/components/layout/RightPanel";

export default function Home() {
  const { state, setState } = useWorkspace();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="w-64 shrink-0 border-r bg-white overflow-y-auto">
        <LeftPanel state={state} setState={setState} />
      </aside>
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <CenterPanel state={state} setState={setState} />
      </main>
      <aside className="w-72 shrink-0 border-l bg-white overflow-y-auto">
        <RightPanel state={state} setState={setState} />
      </aside>
    </div>
  );
}
```

---

## 13. Component Registry (A2UI Pattern — Criterion 1)

This is the core of Dynamic Component Generation. The agent never sends raw React components. It sends typed descriptors with props. The registry maps descriptor types to React components.

```ts
// lib/agent/componentRegistry.ts
import { StartupSnapshotCard } from "@/components/workspace/StartupSnapshotCard";
import { PersonaCards } from "@/components/workspace/PersonaCards";
import { AssumptionMap } from "@/components/workspace/AssumptionMap";
import { ExperimentList } from "@/components/workspace/ExperimentList";
import { ValidationScorecard } from "@/components/workspace/ValidationScorecard";
import { InterviewScriptPanel } from "@/components/workspace/InterviewScriptPanel";

export const componentRegistry = {
  startup_snapshot_card: StartupSnapshotCard,
  persona_cards: PersonaCards,
  assumption_map: AssumptionMap,
  experiment_list: ExperimentList,
  validation_scorecard: ValidationScorecard,
  interview_script_panel: InterviewScriptPanel,
} as const;

export type ComponentType = keyof typeof componentRegistry;
```

```tsx
// components/workspace/DynamicWorkspace.tsx
import { componentRegistry, ComponentType } from "@/lib/agent/componentRegistry";

type ComponentDescriptor = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
};

export function DynamicWorkspace({ components }: { components: ComponentDescriptor[] }) {
  return (
    <div className="space-y-5">
      {components.map(descriptor => {
        const Component = componentRegistry[descriptor.type];
        if (!Component) return null;
        return (
          <Component
            key={descriptor.id}
            {...(descriptor.props as never)}
          />
        );
      })}
    </div>
  );
}
```

**What the agent returns (A2UI-style component payload):**
```json
{
  "type": "workspace_update",
  "reason": "B2B SaaS concept with high monetization risk and unclear ICP.",
  "components": [
    { "id": "snapshot_001", "type": "startup_snapshot_card", "props": {} },
    { "id": "personas_001", "type": "persona_cards", "props": {} },
    { "id": "assumptions_001", "type": "assumption_map", "props": {} },
    { "id": "experiments_001", "type": "experiment_list", "props": {} },
    { "id": "score_001", "type": "validation_scorecard", "props": {} }
  ]
}
```

When the interview script is generated, the agent emits an additional descriptor:
```json
{ "id": "script_001", "type": "interview_script_panel", "props": {} }
```

The `DynamicWorkspace` mounts it as a new component without a page reload. This is the A2UI pattern.

**On-stage narration cue:**
> "The agent sent a component descriptor. The registry mapped it to a React component. A new section appeared in the workspace. This is A2UI — the agent controls the interface structure."

---

## 14. Agentic Feedback Loops (Criterion 2)

### Loop 1 — Persona Selection

```
User clicks "Select as ICP" on a persona card
  → Optimistic: card highlighted (< 100ms)
  → agentState.status = "Thinking"
  → AG-UI run event: UPDATE_ON_PERSONA_PROMPT
  → On response: parseWorkspaceSafely → setState
  → computeOverallScore(new dimensions) → scorecard updates
  → agentState.status = "WaitingForUser"
```

Updates: snapshot.customer, mainAssumption, assumptions ranking, experiments, scorecard.customerSpecificity, scorecard.urgency, agentState.

Does not change: persona list, idea input, region.

### Loop 2 — Risky Assumption

```
User clicks "Mark Risky" on assumption row
  → Optimistic: badge → "Risky" red (< 100ms)
  → evidenceStrength -= 1.5 → computeOverallScore → instant score drop
  → AG-UI run event: UPDATE_ON_RISKY_ASSUMPTION_PROMPT
  → On response: new experiment merged at top of list
  → Two activityLog entries prepended
```

Score drop is instant (client-side). LLM only called for new experiment generation.

### Loop 3 — Tool Action: Interview Script

```
User clicks "Generate Interview Script" in right panel
  → agentState.status = "Thinking"
  → SectionSkeleton appears at bottom of center panel (< 100ms)
  → Agent tool: generate_interview_script
  → On response: interview_script_panel descriptor emitted
  → DynamicWorkspace mounts new component
  → agentState.status = "WaitingForUser"
```

This is the intersection of Criterion 2 (feedback loop triggered by UI element) and Criterion 4 (tool action renders new component).

---

## 15. Latency Strategy (Criterion 3)

### Layer A — Immediate Skeletons
All sections show `SectionSkeleton` within 100ms of any Generate action. Users never see blank space.

### Layer B — KV Cache via System Prompt Pinning
```ts
// The SYSTEM_PROMPT string is imported from prompts.ts and injected identically
// into every call. Gemini 2.0 Flash automatically caches the KV state for
// identical system prompt content. Workspace update calls (P2, P3, P4) reuse
// the cached context — they are meaningfully faster than the initial generation.
//
// Rule: Never modify SYSTEM_PROMPT between calls. Even one character difference
// breaks the cache.
```

### Layer C — Client-Side Zero-Latency Updates
Score changes, badge changes, and optimistic selections all happen client-side before any LLM response. The user receives immediate visual feedback on every interaction.

| Interaction | Latency | Method |
|---|---|---|
| Skeleton display | < 100ms | React state |
| Optimistic persona highlight | < 100ms | React state |
| Assumption badge → Risky | < 100ms | React state |
| Score drop after marking risky | < 16ms | `computeOverallScore` |
| Workspace generation | 4–8s | Gemini 2.0 Flash |
| Workspace update (persona/risky) | 2–5s | Gemini 2.0 Flash + KV cache |
| Interview script (cloud) | 2–4s | Gemini 2.0 Flash + KV cache |
| Interview script (local, P7) | < 500ms | Gemma 4 via Ollama |

### Layer D — Auto Fallback
If Gemini exceeds 10 seconds, mock activates silently. "demo mode" badge appears. Demo continues.

---

## 16. Tool-Enabled Interface Pattern (Criterion 4)

The AgentControlPanel is a tool launcher — not a display panel.

### Wired tool (MVP)

```tsx
// "Generate Interview Script" — fully wired
<Button onClick={handleGenerateInterviewScript} disabled={agentState.status === "Thinking"}>
  Generate Interview Script
</Button>
```

### Visual-only tools (shows the pattern, not wired)

```tsx
{[
  { label: "Generate 7-Day Plan", description: "Builds a prioritized weekly experiment plan" },
  { label: "Find Competitors", description: "Searches and renders competitor cards via MCP" },
  { label: "Create Landing Page Copy", description: "Generates hero + CTA as an editable card" },
].map(tool => (
  <Button key={tool.label} variant="outline" disabled className="w-full justify-start">
    {tool.label}
    <span className="ml-auto text-xs text-muted-foreground">soon</span>
  </Button>
))}
```

**On-stage narration cue:**
> "These are MCP-style tool hooks. The user authorizes each tool action through the UI. The agent doesn't decide to run these on its own — the interactive button is the authorization. This is the MCP Apps pattern: agents discover tools, users confirm them through UI."

---

## 17. Mock Data

```ts
// lib/mock/mockWorkspace.ts
import { IdeaLensWorkspace } from "@/types/workspace";

export const mockWorkspace: IdeaLensWorkspace = {
  idea: "AI copilot for small e-commerce stores in LatAm that writes product descriptions and email campaigns.",
  region: "LatAm",
  businessModel: "SaaS",
  goal: "Validate demand",
  snapshot: {
    problem: "Small e-commerce stores struggle to produce high-converting product copy consistently.",
    customer: "Small Shopify sellers in LatAm",
    solution: "AI copilot that generates product descriptions and email campaigns tailored to each store.",
    category: "B2B SaaS",
    wedge: "Product descriptions first",
    monetization: "$29/month subscription",
    mainAssumption: "Sellers will pay monthly for copy that converts better than what they write themselves.",
    validationPriority: "Test willingness to pay before building.",
  },
  selectedPersonaId: null,
  personas: [
    {
      id: "p1",
      name: "Solo Shopify Seller",
      description: "Runs a small online store alone, handles all marketing.",
      painIntensity: "High",
      budgetLevel: "Medium",
      urgency: "High",
      acquisitionChannel: "Shopify communities, TikTok, WhatsApp groups",
      objections: ["Already uses ChatGPT", "Does not want another monthly tool"],
    },
    {
      id: "p2",
      name: "Instagram Store Owner",
      description: "Sells through Instagram and WhatsApp, no formal store.",
      painIntensity: "Medium",
      budgetLevel: "Low",
      urgency: "Medium",
      acquisitionChannel: "Instagram creators, WhatsApp communities",
      objections: ["Low willingness to pay", "Prefers manual posting"],
    },
    {
      id: "p3",
      name: "Small Brand Operator",
      description: "Manages a growing DTC brand with frequent product launches.",
      painIntensity: "High",
      budgetLevel: "Medium",
      urgency: "High",
      acquisitionChannel: "E-commerce newsletters, Shopify partners",
      objections: ["Needs brand voice control", "May already use marketing tools"],
    },
  ],
  assumptions: [
    {
      id: "a1",
      text: "Small stores will pay $29/month for better product copy.",
      category: "Monetization",
      importance: "High",
      status: "Unknown",
      testMethod: "Pricing interviews + fake-door landing page",
    },
    {
      id: "a2",
      text: "Writing product descriptions is a frequent, repeated pain — not a one-time task.",
      category: "Problem",
      importance: "High",
      status: "Unknown",
      testMethod: "Customer discovery interviews",
    },
    {
      id: "a3",
      text: "Shopify sellers in LatAm are reachable through online communities.",
      category: "Distribution",
      importance: "Medium",
      status: "Unknown",
      testMethod: "Cold outreach test in 3 communities",
    },
    {
      id: "a4",
      text: "The product can differentiate from generic AI writing tools like ChatGPT.",
      category: "Market",
      importance: "High",
      status: "Unknown",
      testMethod: "Competitor messaging comparison",
    },
    {
      id: "a5",
      text: "Users care more about conversion-focused copy than generic content generation.",
      category: "Solution",
      importance: "High",
      status: "Unknown",
      testMethod: "Landing page headline A/B test",
    },
  ],
  experiments: [
    {
      id: "e1",
      title: "Interview 10 Shopify sellers",
      hypothesis: "Shopify sellers struggle with product copy every week.",
      method: "Short discovery interviews via WhatsApp or Zoom.",
      successMetric: "7 of 10 confirm this is a repeated pain.",
      effort: "Medium",
      cost: "Free",
      duration: "2 days",
      status: "This Week",
    },
    {
      id: "e2",
      title: "Fake-door pricing test",
      hypothesis: "Stores are willing to pay at least $29/month.",
      method: "Simple landing page with pricing CTA and waitlist.",
      successMetric: "5% of visitors click the pricing CTA.",
      effort: "Medium",
      cost: "Low",
      duration: "3 days",
      status: "Backlog",
    },
    {
      id: "e3",
      title: "Concierge MVP with 5 stores",
      hypothesis: "Users accept AI-generated copy when edited for brand voice.",
      method: "Manually generate descriptions for 5 stores, deliver over WhatsApp.",
      successMetric: "3 stores ask to repeat the service.",
      effort: "High",
      cost: "Free",
      duration: "5 days",
      status: "Backlog",
    },
    {
      id: "e4",
      title: "Landing page headline A/B test",
      hypothesis: "Conversion-focused messaging outperforms generic AI copy messaging.",
      method: "Test two headlines on a simple landing page.",
      successMetric: "Conversion-focused headline gets 30% more CTA clicks.",
      effort: "Low",
      cost: "Low",
      duration: "2 days",
      status: "Backlog",
    },
  ],
  scorecard: {
    overallScore: 52,
    decision: "Validate First",
    biggestRisk: "Willingness to pay is unproven. Sellers may prefer free tools.",
    recommendedNextStep: "Run 10 pricing interviews this week before writing any code.",
    dimensions: {
      problemClarity: 7,
      customerSpecificity: 5,
      urgency: 7,
      differentiation: 4,
      monetizationClarity: 4,
      mvpFeasibility: 7,
      distributionFeasibility: 6,
      evidenceStrength: 2,
    },
  },
  interviewScript: null,
  agentState: {
    status: "WaitingForUser",
    currentObjective: "Help the founder narrow the ICP and test willingness to pay.",
    confidence: 52,
    suggestions: [
      "Select a persona to sharpen the validation focus.",
      "Mark your riskiest assumption to generate a targeted experiment.",
      "Generate an interview script to start talking to customers this week.",
    ],
    activityLog: ["Workspace generated for: AI copilot for LatAm e-commerce stores."],
    isMockActive: false,
  },
};
```

---

## 18. UI Design Direction

### Visual Style

IdeaLens should feel like a modern, professional founder workspace — not a chatbot, not a consumer app, not a marketing page.

**Use:**
- Clean white background (`bg-white`) or dark gray (`bg-gray-950`) — no gradients
- Rounded cards (`rounded-xl`) with subtle borders (`border`) — no drop shadows on default state
- Compact layout — information density is a feature, not a problem
- Color-coded badges (see badge system below)
- Labeled action buttons — no icon-only buttons in the MVP
- Structured labeled fields instead of AI paragraph blocks
- Monospaced tabular numbers for scores (`tabular-nums`)

**Avoid:**
- Gradients, hero imagery, decorative illustrations
- Marketing copy, exclamation marks, cheerleader tone
- Long AI-generated paragraph blocks — always break into labeled fields

### Badge Color System

| Value | Tailwind classes |
|---|---|
| High / Risky / Pivot | `bg-red-100 text-red-700` |
| Medium / Unknown / Validate First | `bg-amber-100 text-amber-700` |
| Low / Validated / Proceed | `bg-green-100 text-green-700` |
| Invalidated / Inactive | `bg-gray-100 text-gray-500` |
| Category labels | `bg-blue-100 text-blue-700` |
| Agent Thinking / Updating | `bg-purple-100 text-purple-700` |
| Demo mode active | `bg-yellow-100 text-yellow-700` |

### Typography

- Section label: `text-sm font-semibold text-gray-500 uppercase tracking-wide`
- Card title: `text-base font-semibold text-gray-900`
- Body text: `text-sm text-gray-600`
- Score: `text-5xl font-bold tabular-nums`
- Field label: `text-xs font-medium text-gray-400 uppercase`
- Badge: `text-xs font-medium`

### Tone

- **Practical:** "Your biggest risk is willingness to pay", not "Great work!"
- **Evidence-driven:** Scores are labeled "provisional"
- **Startup-focused:** ICP, assumption, wedge, experiment, validated — no explanation needed
- **Direct:** No hedging, no filler

### Key Generative UI Principle

Every section should look generated — content that is specific to the entered idea, not generic advice. The workspace should feel stable and interactive after it loads. The agent-generated nature is evident in content specificity, not in visual chaos.

---

## 19. Component Acceptance Criteria

### P1 — Layout + Registry

- [ ] Three-column layout renders without errors using mock data
- [ ] All five workspace sections render through `DynamicWorkspace` component registry
- [ ] `SectionSkeleton` appears when `agentState.status === "Thinking"`
- [ ] "Reset to Demo" restores mock cleanly — test 3 times
- [ ] "Sample idea" pre-fills textarea

### P2 — AG-UI + Persona Loop (Criterion 1 + 2)

- [ ] AG-UI run event fires on Generate click
- [ ] Skeletons appear within 100ms
- [ ] "Select as ICP" highlights card immediately (optimistic)
- [ ] Only one persona selected at a time
- [ ] Workspace sections update post-LLM
- [ ] Score recomputes client-side
- [ ] Activity log updates

### P3 — Tool Action: Interview Script (Criterion 4 + 1)

- [ ] "Generate Interview Script" in right panel triggers agent tool
- [ ] SectionSkeleton appears immediately at bottom of center panel
- [ ] `interview_script_panel` descriptor emitted → new component mounted
- [ ] Script references selected persona
- [ ] Script focuses on riskiest High assumption
- [ ] No chat message appears anywhere

### P4 — Assumption Loop (Criterion 2 + 3)

- [ ] "Mark Risky" badge changes red immediately (client-side)
- [ ] Score drops immediately (client-side, < 16ms)
- [ ] New experiment at top of list within 5 seconds
- [ ] `relatedAssumptionId` set on new experiment
- [ ] Two activity log entries prepended

### P5 — Scorecard (Criterion 3)

- [ ] Score animates on change (`transition-all duration-500`)
- [ ] Decision badge and color update correctly
- [ ] "Provisional" label always visible
- [ ] Eight dimension bars animate on state change
- [ ] Score never sourced from LLM response

### P6 — Kanban (bonus)

- [ ] Experiments can change status between columns
- [ ] Status change reflected in badge and activity log

### P7 — Local Execution (moonshot)

- [ ] Interview script generated via Gemma 4 locally (< 500ms)
- [ ] No network call for script generation

---

## 20. Demo Script

Practice until it runs in under 2:30. Target 2:00.

**Opening — 15 seconds**
> "Most founders ask AI 'is this a good idea?' and get a wall of text.
> IdeaLens goes beyond the chatbox.
> The agent doesn't answer — it builds the interface."

**Step 1 — Generate workspace — 30 seconds**
Enter the demo idea. Click "Generate Validation Workspace."
> "The agent generates the workspace this idea needs — snapshot, personas, assumptions, experiments, validation score. Not a template. Generated at runtime using AG-UI and the A2UI component registry."

**Step 2 — Select persona — 30 seconds**
Click "Select as ICP" on Solo Shopify Seller.
> "I pick my ICP. The agent sends updated component descriptors — the workspace rebuilds around this specific customer. This is a live agentic feedback loop."

**Step 3 — Mark assumption risky — 30 seconds**
Click "Mark Risky" on: *"Small stores will pay $29/month for better product copy."*
> "I'm not confident about this assumption. The score drops instantly — no API call, computed client-side. Then the agent generates a pricing experiment to test it."

**Step 4 — Generate interview script — 30 seconds**
Click "Generate Interview Script."
> "I click the tool button. The agent reads the ICP and the risky assumption, executes the tool, and renders a new component into the workspace. Not a chat message — a tool-enabled interface action."

**Closing — 15 seconds**
> "The agent is not just inside the app.
> The agent is shaping the app."

---

## 21. Definition of Done

IdeaLens ships when a judge can observe all of the following in under 3 minutes:

1. A startup idea generates a structured workspace via AG-UI events and A2UI component descriptors.
2. Selecting a persona triggers a live agentic feedback loop — the workspace rebuilds around the chosen ICP.
3. Marking an assumption risky drops the score instantly (client-side) and creates a new experiment (agent).
4. Clicking a tool button renders a brand-new UI component — not a chat message.
5. The app never shows a broken, empty, or indefinitely loading state.
6. There is no chatbox anywhere in the interface.
7. The demo resets and repeats cleanly.
8. All four hackathon challenge criteria are narrated explicitly during the 2-minute show-and-tell.