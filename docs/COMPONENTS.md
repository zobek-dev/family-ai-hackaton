# IdeaLens — Component Specifications
> Every component in the workspace exists because a specific founder problem demands it.

---

## The Core Problem

Founders don't know what to validate first — and AI only gives them text.

When someone has a startup idea, the real question isn't "is this good?" It's:
**"What should I test first, with whom, and how?"**

Today's standard AI response is a generic paragraph. IdeaLens converts that question into a structured, interactive, agent-generated workspace — specific to that idea, built at runtime, with no templates and no chatbox.

Every component in this document is the answer to one slice of that problem.

---

## Component Index

| # | Component | File | Problem it solves |
|---|---|---|---|
| 1 | `StartupSnapshotCard` | `components/workspace/StartupSnapshotCard.tsx` | Ambiguous ideas can't be validated |
| 2 | `PersonaCards` | `components/workspace/PersonaCards.tsx` | No specific customer = no useful experiment |
| 3 | `AssumptionMap` | `components/workspace/AssumptionMap.tsx` | Unknown which bets are the riskiest |
| 4 | `ExperimentList` | `components/workspace/ExperimentList.tsx` | Insight without action is worthless |
| 5 | `ValidationScorecard` | `components/workspace/ValidationScorecard.tsx` | No objective signal for when to move forward |
| 6 | `InterviewScriptPanel` | `components/workspace/InterviewScriptPanel.tsx` | Knowing you need to talk to customers ≠ knowing how |
| 7 | `AgentControlPanel` | `components/layout/RightPanel.tsx` | The agent acts invisibly; the user loses trust |
| 8 | `DynamicWorkspace` | `components/workspace/DynamicWorkspace.tsx` | The workspace structure itself is fixed and generic |
| 9 | `SectionSkeleton` | `components/shared/SectionSkeleton.tsx` | Blank screens kill trust during LLM latency |
| 10 | `LeftPanel` | `components/layout/LeftPanel.tsx` | The founder needs a control surface, not a chat input |

---

## 1. StartupSnapshotCard

### Problem

Founders arrive with an idea expressed in natural language — vague, incomplete, and unstructured. They cannot begin validating until they know: what specific problem they are solving, who exactly the customer is, how the business makes money, and what the single riskiest assumption is. Without that clarity, all downstream validation is unfocused.

### What it resolves

Forces the agent to extract and structure eight required fields from the idea before any other component is rendered. If the agent cannot fill a field with specific, non-generic content, that gap is itself diagnostic — it means the founder hasn't thought through that dimension yet.

### Fields rendered

| Field | Purpose |
|---|---|
| `problem` | The specific pain being solved |
| `customer` | The exact customer segment, not a category |
| `solution` | The mechanism of the solution |
| `category` | Business category (B2B SaaS, marketplace, etc.) |
| `wedge` | The smallest initial use case to enter the market |
| `monetization` | Pricing model and amount |
| `mainAssumption` | The single most critical unproven belief |
| `validationPriority` | What to test before building anything |

### TypeScript interface

```ts
type StartupSnapshot = {
  problem: string;
  customer: string;
  solution: string;
  category: string;
  wedge: string;
  monetization: string;
  mainAssumption: string;
  validationPriority: string;
};
```

### Rendering spec

- Two-column card grid (`grid-cols-2`)
- Each field: `text-xs font-medium text-gray-400 uppercase` label + `text-sm text-gray-600` value
- Card wrapper: `rounded-xl border bg-white p-5`
- Section header: `text-sm font-semibold text-gray-500 uppercase tracking-wide`
- "Edit" and "Regenerate" buttons: visual only in MVP, not wired

### Hackathon criteria

Criterion 1 — Dynamic Component Generation. The agent decides the content of each field based on the idea's domain. A B2B SaaS idea and a consumer marketplace produce structurally and contextually different snapshots.

### Acceptance criteria

- [ ] All eight fields render with labeled values
- [ ] No field ever displays raw JSON or `undefined`
- [ ] Renders correctly from mock data before any LLM call
- [ ] Updates when persona is selected (snapshot.customer and snapshot.mainAssumption change)

---

## 2. PersonaCards

### Problem

Most founders have a vague ICP: "SMBs" or "busy professionals." Without a specific, named customer type, no experiment has a clear target, no interview has a subject, and no assumption has an owner. Vague customers produce vague validation.

### What it resolves

The agent generates three distinct persona profiles based on the idea. The founder selects one as the ICP by clicking "Select as ICP." That click is the trigger for **Agentic Loop 1**: the agent reorganizes the entire workspace — snapshot, assumptions, experiments, and scorecard — around the chosen customer. The visual interaction replaces a text command.

### Fields per persona

| Field | Purpose |
|---|---|
| `id` | Unique identifier for agent reference |
| `name` | Short, memorable persona name |
| `description` | One-sentence role description |
| `painIntensity` | Low / Medium / High badge |
| `budgetLevel` | Low / Medium / High badge |
| `urgency` | Low / Medium / High badge |
| `acquisitionChannel` | Where this customer is reachable |
| `objections` | List of reasons they would not buy |

### TypeScript interface

```ts
type Persona = {
  id: string;
  name: string;
  description: string;
  painIntensity: "Low" | "Medium" | "High";
  budgetLevel: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  acquisitionChannel: string;
  objections: string[];
};
```

### Rendering spec

- Three cards in a horizontal row (`grid-cols-3`)
- Each card: `rounded-xl border bg-white p-4`
- Selected card: `border-2 border-blue-500` (optimistic, applied immediately on click)
- Three badges per card: `painIntensity`, `budgetLevel`, `urgency` — colored by value
- Objections: bulleted `text-xs text-gray-500` list
- "Select as ICP" button: primary action per card
- "Reject" button: visual only in MVP

### Badge color mapping

| Value | Classes |
|---|---|
| High | `bg-red-100 text-red-700` |
| Medium | `bg-amber-100 text-amber-700` |
| Low | `bg-green-100 text-green-700` |

### Agentic Loop 1 — Persona Selection

```
User clicks "Select as ICP"
  → Optimistic: card border changes immediately (< 100ms)
  → agentState.status = "Thinking"
  → AG-UI event: UPDATE_ON_PERSONA_PROMPT(workspace, personaId)
  → On response: parseWorkspaceSafely → setState
  → computeOverallScore(new dimensions) → scorecard updates
  → agentState.status = "WaitingForUser"
```

Fields updated by agent: `snapshot.customer`, `snapshot.mainAssumption`, `snapshot.validationPriority`, `assumptions` (re-ranked), `experiments` (reprioritized), `scorecard.dimensions.customerSpecificity`, `scorecard.dimensions.urgency`, `agentState`.

Fields not changed: persona list, idea text, region, business model.

### Hackathon criteria

Criterion 2 — Agentic Feedback Loop. The visual click is the instruction. No text input required. The agent responds by restructuring the workspace around the chosen customer.

### Acceptance criteria

- [ ] Three persona cards render in a row from mock/agent data
- [ ] "Select as ICP" highlights selected card immediately (optimistic update)
- [ ] Only one persona can be selected at a time
- [ ] Workspace updates after Gemini responds to persona selection
- [ ] Activity log prepends one entry per selection

---

## 3. AssumptionMap

### Problem

Every founder operates on implicit assumptions. The problem isn't having assumptions — it's not knowing which ones are most likely to kill the business if wrong. Without explicit prioritization, founders build on unexamined beliefs and discover fatal flaws after months of work.

### What it resolves

The agent surfaces five explicit assumptions, categorized and ranked by importance. The founder marks any assumption as "Risky" with a single click. This triggers two things simultaneously: the score drops instantly (client-side, zero LLM latency), and the agent generates a targeted experiment to test that specific assumption. The workspace becomes actionable in real time.

### Fields per assumption

| Field | Purpose |
|---|---|
| `id` | Unique identifier for cross-referencing with experiments |
| `text` | The assumption stated plainly |
| `category` | Customer / Problem / Solution / Market / Distribution / Monetization |
| `importance` | Low / Medium / High |
| `status` | Unknown / Risky / Validated / Invalidated |
| `testMethod` | One-line description of how to test it |

### TypeScript interface

```ts
type Assumption = {
  id: string;
  text: string;
  category: "Customer" | "Problem" | "Solution" | "Market" | "Distribution" | "Monetization";
  importance: "Low" | "Medium" | "High";
  status: "Unknown" | "Risky" | "Validated" | "Invalidated";
  testMethod: string;
};
```

### Rendering spec

- Table layout with columns: assumption text, category badge, importance badge, status badge, test method, action buttons
- Row height: compact — `py-3 px-4`
- Status badge changes color on interaction (see badge system)
- Three action buttons per row: "Mark Risky", "Mark Validated", "Mark Invalidated"

### Agentic Loop 2 — Risky Assumption

```
User clicks "Mark Risky"
  → Optimistic: status badge → "Risky" red (< 100ms)
  → Client-side: dimensions.evidenceStrength -= 1.5 (min 0)
  → computeOverallScore() → scorecard updates in < 16ms
  → AG-UI event: UPDATE_ON_RISKY_ASSUMPTION_PROMPT(workspace, assumptionId)
  → On response: new experiment merged at top of ExperimentList
  → activityLog: two entries prepended
```

"Mark Validated" and "Mark Invalidated" are client-side only — no LLM call:
- Validated: `evidenceStrength += 1.0` (max 10), badge → green
- Invalidated: no score change, badge → gray

### Score mutation rules

| Action | `evidenceStrength` delta | LLM call? |
|---|---|---|
| Mark Risky | − 1.5 (min 0) | Yes — generates new experiment |
| Mark Validated | + 1.0 (max 10) | No |
| Mark Invalidated | No change | No |

### Hackathon criteria

Criterion 2 — Agentic Feedback Loop (risky marking triggers agent). Criterion 3 — Latency-Optimized Rendering (score mutation is instant, client-side).

### Acceptance criteria

- [ ] Five assumptions render in table format
- [ ] "Mark Risky" changes badge to red immediately
- [ ] Score drops instantly after marking risky (< 16ms, no LLM call)
- [ ] New experiment appears at top of ExperimentList within 5 seconds
- [ ] `relatedAssumptionId` is set on the generated experiment
- [ ] "Mark Validated" and "Mark Invalidated" work client-side without LLM call

---

## 4. ExperimentList

### Problem

Knowing that an assumption is risky is only half the problem. The founder still needs to know exactly how to test it in the shortest possible time, with the lowest possible cost, and with a clear metric for success. "Talk to customers" is not an experiment. An experiment has a hypothesis, a method, and a pass/fail signal.

### What it resolves

The agent generates four experiments at workspace creation, each linked to a specific assumption by risk profile. When the founder marks an assumption risky (Loop 2), the agent generates a fifth experiment targeted at that specific assumption and inserts it at the top of the list with `relatedAssumptionId` set. The list grows in runtime based on founder decisions.

### Fields per experiment

| Field | Purpose |
|---|---|
| `id` | Unique identifier |
| `title` | Short action-oriented title |
| `hypothesis` | The belief being tested |
| `method` | Specific execution steps |
| `successMetric` | Measurable pass/fail signal |
| `effort` | Low / Medium / High |
| `cost` | Free / Low / Medium |
| `duration` | Time estimate (e.g., "3 days") |
| `status` | Backlog / This Week / Running / Done |
| `relatedAssumptionId` | Optional link to the assumption being tested |

### TypeScript interface

```ts
type Experiment = {
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
```

### Rendering spec

- MVP: simple vertical card list (not kanban)
- Each card: `rounded-xl border bg-white p-4` with title, hypothesis, method, success metric
- Four badges per card: effort, cost, duration, status
- New experiments from agent appear at the top of the list
- P6 (bonus): replace with four-column status grid using `<select>` per card

### Experiment merge logic

```ts
function mergeNewExperiment(current: Experiment[], incoming: Experiment[]): Experiment[] {
  const existingIds = new Set(current.map(e => e.id));
  return [...incoming.filter(e => !existingIds.has(e.id)), ...current];
}
```

New experiments always appear at the top. Existing experiments are never displaced.

### Hackathon criteria

Criterion 1 — Dynamic Component Generation. The component content grows at runtime as the founder interacts. The agent adds new experiments based on user decisions, not pre-seeded templates.

### Acceptance criteria

- [ ] Four experiments render from mock/agent data
- [ ] New experiment from risky assumption appears at top within 5 seconds
- [ ] `relatedAssumptionId` is set and visible on agent-generated experiments
- [ ] All four badges render per card with correct colors
- [ ] P6 (bonus): status can be changed per card via select element

---

## 5. ValidationScorecard

### Problem

Founders have no objective signal for when they know enough to proceed. They move on gut feeling — too fast or too slow. A score that the AI invents is useless because it reflects nothing the founder has actually done or discovered.

### What it resolves

Eight weighted dimensions produce a single score (0–100) computed entirely client-side using a deterministic formula. The score reflects the actual state of the workspace: how specific the customer is, how clear the problem is, how strong the evidence is. Every time the founder marks an assumption risky, the `evidenceStrength` dimension drops immediately, and the score recalculates in under 16ms — with no API call. The "Provisional" label is always visible. The score is not a verdict; it is a dashboard of known vs. unknown.

### Score dimensions

| Dimension | Weight | What it measures |
|---|---|---|
| `problemClarity` | 1.5 | How well-defined the pain is |
| `customerSpecificity` | 1.5 | How specific the target customer is |
| `urgency` | 1.0 | How pressing the problem is for the customer |
| `differentiation` | 1.0 | Whether the solution is meaningfully different |
| `monetizationClarity` | 1.5 | How clear the pricing model is |
| `mvpFeasibility` | 0.8 | How buildable the first version is |
| `distributionFeasibility` | 0.8 | How reachable the customer is |
| `evidenceStrength` | 1.9 | How much actual evidence exists (most impacted by user actions) |

### Score formula

```ts
// lib/scoring.ts
export function computeOverallScore(dimensions: ValidationScorecard["dimensions"]): number {
  const weights = {
    problemClarity: 1.5, customerSpecificity: 1.5, urgency: 1.0,
    differentiation: 1.0, monetizationClarity: 1.5, mvpFeasibility: 0.8,
    distributionFeasibility: 0.8, evidenceStrength: 1.9,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const weighted = Object.entries(dimensions).reduce(
    (sum, [k, v]) => sum + v * (weights[k as keyof typeof weights] ?? 1), 0
  );
  return Math.round((weighted / (total * 10)) * 100);
}
```

The LLM never provides `overallScore`. The field is always discarded from API responses. Score is always the output of `computeOverallScore()`.

### Decision thresholds

| Score | Decision | Badge color |
|---|---|---|
| ≥ 70 | Proceed | `bg-green-100 text-green-700` |
| 45 – 69 | Validate First | `bg-amber-100 text-amber-700` |
| < 45 | Pivot | `bg-red-100 text-red-700` |

### Rendering spec

- Score number: `text-5xl font-bold tabular-nums transition-all duration-500`
- "Provisional — based on available evidence" label: always visible, `text-xs text-muted-foreground`
- Decision badge: updates with score on every change
- Eight `<Progress>` bars (0–10 scale), one per dimension, labeled
- `biggestRisk` and `recommendedNextStep` fields below bars

### TypeScript interface

```ts
type ValidationScorecard = {
  overallScore: number;         // always computed client-side, never from LLM
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
    evidenceStrength: number;   // decremented client-side when assumptions marked risky
  };
};
```

### Hackathon criteria

Criterion 3 — Latency-Optimized Rendering. The most visually striking demonstration of zero-latency client-side computation. Score drops instantly on risky marking. No skeleton, no spinner, no API call.

### Acceptance criteria

- [ ] Score renders as a number 0–100 with animation on change
- [ ] Score never sourced from LLM response — always `computeOverallScore()`
- [ ] Score drops in < 16ms when assumption is marked risky
- [ ] Score updates after persona selection (post-LLM response)
- [ ] Decision badge label and color update with score
- [ ] "Provisional" label always visible
- [ ] Eight dimension progress bars animate on state change

---

## 6. InterviewScriptPanel

### Problem

Knowing you need to talk to customers and knowing how to do it effectively are two completely different skills. An inexperienced founder arrives at a customer interview without structured questions, asks leading questions, and leaves without learning anything that can change a decision. "Talk to your customers" is generic advice. A specific, question-by-question script for a specific persona testing a specific assumption is actionable.

### What it resolves

The founder clicks "Generate Interview Script" in the `AgentControlPanel`. The agent reads the selected persona and the highest-importance `Risky` assumption, then generates a 6–8 question script. Each question includes four fields: the question itself, its purpose, what a good answer looks like, and what a red flag looks like. The component appears as a brand-new section at the bottom of the center panel — it did not exist before the click. This is the most visible demonstration of Generative UI in the entire application.

### Fields

```ts
type InterviewScript = {
  title: string;
  targetPersona: string;
  goal: string;
  questions: {
    id: string;
    question: string;     // open-ended, non-leading
    purpose: string;      // why this question is asked
    goodSignal: string;   // what a validating answer sounds like
    redFlag: string;      // what an invalidating answer sounds like
  }[];
};
```

### Rendering spec

- Conditionally rendered: only when `state.interviewScript !== null`
- Header card: script title + target persona badge + goal statement
- Question list: each question in a card with four labeled rows
- Question text: `text-sm font-medium text-gray-900`
- Purpose: `text-xs text-gray-500` with gray label
- Good signal: `text-xs text-green-700` with green label
- Red flag: `text-xs text-red-700` with red label
- Footer: "Copy all questions" button — `navigator.clipboard.writeText()`, no backend

### Agentic Loop 3 — Interview Script Tool Action

```
User clicks "Generate Interview Script" in AgentControlPanel
  → agentState.status = "Thinking"
  → SectionSkeleton appears at bottom of CenterPanel (< 100ms)
  → Agent tool: generate_interview_script
     reads: state.selectedPersonaId + riskiest High assumption
  → Gemini returns: { "interviewScript": { ... } }
  → setState({ interviewScript: parsed })
  → InterviewScriptPanel mounts as new component in DynamicWorkspace
  → activityLog: "Interview script generated for [persona name]."
```

### On-stage narration

> "I click the tool button. The agent reads the ICP and the risky assumption. It renders a new UI component into the workspace. Not a chat message — a tool-enabled interface action."

### Hackathon criteria

Criterion 1 — Dynamic Component Generation (new component appears at runtime, did not exist before the click). Criterion 4 — Tool-Enabled Interfaces (user authorizes a tool action via button; agent generates a new component as output).

### Acceptance criteria

- [ ] Component is not present on initial workspace load
- [ ] Clicking "Generate Interview Script" shows SectionSkeleton immediately
- [ ] Script renders as a new section with 6–8 question cards
- [ ] Each question card shows all four fields (question, purpose, good signal, red flag)
- [ ] Script references the selected persona by name
- [ ] Script focuses on the assumption with importance "High" and status "Risky"
- [ ] "Copy all questions" copies all question text to clipboard
- [ ] No chat message appears anywhere in the UI

---

## 7. AgentControlPanel (RightPanel)

### Problem

In most copilot applications, the agent acts invisibly or decides when to act on its own. The user does not understand what the agent is doing or why, which creates distrust. Tool calls happen without user authorization. The copilot "takes over" rather than assisting.

### What it resolves

The `AgentControlPanel` inverts the dynamic. It is a tool launcher and status display — the user sees exactly what the agent is doing and authorizes every tool action through a button click. The agent does not run tools autonomously; the interactive button is the authorization. The panel also provides real-time transparency into the agent's state, current objective, and reasoning.

### Sections

**Agent status row**
- Status badge: Idle / Thinking / Updating / WaitingForUser (color-coded)
- "demo mode" badge: visible when `isMockActive === true`

**Current objective**
- Text showing what the agent is currently focused on
- Updates after every loop completion

**Confidence bar**
- Progress bar 0–100, mirrors `overallScore`
- Updates when scorecard changes

**Suggestions list**
- Three actionable next-step suggestions from the agent
- Updates after persona selection and assumption marking

**Tool launcher section**
- "Generate Interview Script" — fully wired for MVP
- "Generate 7-Day Plan" — visual only (shows pattern)
- "Find Competitors" — visual only (shows pattern)
- "Create Landing Page Copy" — visual only (shows pattern)

Visual-only buttons use `disabled` state with a "soon" label:
```tsx
<Button variant="outline" disabled className="w-full justify-start">
  Find Competitors
  <span className="ml-auto text-xs text-muted-foreground">soon</span>
</Button>
```

**Activity log**
- Reverse-chronological list of agent actions
- Prepended after every loop completion
- Scrollable when entries overflow

### TypeScript interface

```ts
type AgentState = {
  status: "Idle" | "Thinking" | "Updating" | "WaitingForUser";
  currentObjective: string;
  confidence: number;        // 0–100, mirrors overallScore
  suggestions: string[];
  activityLog: string[];
  isMockActive: boolean;     // true → show "demo mode" badge
};
```

### MCP pattern narration (on stage)

> "These are MCP-style tool hooks. The user authorizes each action. The agent doesn't run tools on its own. The button is the contract — user clicks, agent executes, workspace gains a new component."

### Hackathon criteria

Criterion 4 — Tool-Enabled Interfaces. The panel is the explicit demonstration of the MCP Apps pattern: interactive UI hooks that authorize agent tool calls.

### Acceptance criteria

- [ ] Status badge updates on every state transition
- [ ] "demo mode" badge appears when `isMockActive === true`
- [ ] "Generate Interview Script" button triggers Loop 3
- [ ] Button is disabled while `agentState.status === "Thinking"`
- [ ] Visual-only buttons are labeled with "soon" and cannot be clicked
- [ ] Activity log is scrollable and reverse-chronological
- [ ] Confidence bar reflects `overallScore` and updates with it

---

## 8. DynamicWorkspace

### Problem

Traditional applications have pre-built pages. Every user sees the same layout. The content changes but the structure doesn't. A validation workspace for a B2B SaaS idea and a validation workspace for a consumer marketplace have fundamentally different structures, components, and priorities — but a pre-built app forces them into the same template.

### What it resolves

`DynamicWorkspace` is the A2UI pattern implementation. It does not render a fixed list of sections. It receives an array of `ComponentDescriptor` objects from the agent and maps each one through the `componentRegistry` to mount the appropriate React component. The structure of the workspace is decided by the agent at runtime. A new component type (e.g., `interview_script_panel`) can be added to the workspace without a page reload or navigation.

### Component registry

```ts
// lib/agent/componentRegistry.ts
export const componentRegistry = {
  startup_snapshot_card:  StartupSnapshotCard,
  persona_cards:          PersonaCards,
  assumption_map:         AssumptionMap,
  experiment_list:        ExperimentList,
  validation_scorecard:   ValidationScorecard,
  interview_script_panel: InterviewScriptPanel,
} as const;
```

### Renderer

```tsx
export function DynamicWorkspace({ components }: { components: ComponentDescriptor[] }) {
  return (
    <div className="space-y-5">
      {components.map(descriptor => {
        const Component = componentRegistry[descriptor.type];
        if (!Component) return null;
        return <Component key={descriptor.id} {...(descriptor.props as never)} />;
      })}
    </div>
  );
}
```

### A2UI payload (what the agent returns)

```json
{
  "type": "workspace_update",
  "reason": "B2B SaaS concept with high monetization risk and unclear ICP.",
  "components": [
    { "id": "snapshot_001",    "type": "startup_snapshot_card",  "props": {} },
    { "id": "personas_001",    "type": "persona_cards",           "props": {} },
    { "id": "assumptions_001", "type": "assumption_map",          "props": {} },
    { "id": "experiments_001", "type": "experiment_list",         "props": {} },
    { "id": "score_001",       "type": "validation_scorecard",    "props": {} }
  ]
}
```

When the interview script is generated:
```json
{ "id": "script_001", "type": "interview_script_panel", "props": {} }
```

This descriptor is appended to the components array. `DynamicWorkspace` mounts the new component without any page reload.

### Safety rule

Unknown `type` values are silently skipped (`if (!Component) return null`). The registry is a closed allowlist — the agent cannot cause arbitrary components to mount.

### Hackathon criteria

Criterion 1 — Dynamic Component Generation. This component is the architectural implementation of that criterion. Every other component in this document is rendered through it.

### Acceptance criteria

- [ ] Renders all components from the agent's descriptor array in order
- [ ] Unknown component types are skipped without error
- [ ] New components (e.g., `interview_script_panel`) mount without page reload
- [ ] Component order matches the agent's `components` array order
- [ ] Works identically with mock data and live agent data

---

## 9. SectionSkeleton

### Problem

LLM calls take 4–8 seconds. Showing a blank screen or a spinner during that time violates two principles: it signals to the user that the system is unresponsive, and it fails the hackathon's Criterion 3 (latency-optimized rendering).

### What it resolves

`SectionSkeleton` appears within 100ms of any Generate action — before the LLM call has a chance to return. Every section that will eventually render shows a pulsing skeleton in its place. The user sees a full workspace immediately, just with placeholder content. When the LLM responds, skeletons are replaced by real components.

### Implementation

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

### Usage

Shown when `agentState.status === "Thinking"`. Each section renders its own skeleton with a relevant label:

```tsx
{agentState.status === "Thinking"
  ? <SectionSkeleton label="Personas" />
  : <PersonaCards personas={state.personas} ... />
}
```

The `InterviewScriptPanel` skeleton appears at the bottom of the center panel when Loop 3 is triggered — before the interview script has been generated.

### Hackathon criteria

Criterion 3 — Latency-Optimized Rendering. The skeleton is the first layer of the three-layer latency strategy: users never see blank space, regardless of how long the LLM takes to respond.

### Acceptance criteria

- [ ] Skeletons appear within 100ms of any Generate action
- [ ] Each skeleton has a visible label matching the section it represents
- [ ] Skeletons are replaced cleanly by real components on LLM response
- [ ] Interview script skeleton appears at the bottom of center panel on Loop 3 trigger
- [ ] Skeleton uses `animate-pulse` — no layout shift when replaced

---

## 10. LeftPanel

### Problem

The founder needs a way to input their idea and control the generation cycle without a chatbox. A free-form text field connected to a chat interface would return to the same paradigm IdeaLens is replacing. The control surface must make the agent's inputs explicit and bounded.

### What it resolves

The left panel is the idea intake form and the reset surface. It structures the founder's input into four explicit dimensions before passing anything to the agent: the idea, the region, the business model, and the validation goal. This prevents the agent from making ambiguous assumptions about context. The "Sample idea" button demonstrates a complete input immediately. The "Reset to Demo" button restores the mock workspace reliably — essential for demo repeatability.

### Controls

| Control | Type | Purpose |
|---|---|---|
| Idea textarea | `<textarea>` | Free-text startup idea description |
| Region selector | `<select>` | Geographic focus (LatAm, EEUU, Europe, Global) |
| Business model selector | `<select>` | SaaS / Marketplace / Consumer / B2B Services |
| Validation goal selector | `<select>` | Validate demand / Validate willingness to pay / Find ICP |
| "Generate Validation Workspace" | Primary button | Triggers agent call with all four inputs |
| "Sample idea" | Ghost button | Pre-fills textarea with demo idea |
| "Reset to Demo" | Ghost button | Restores mock workspace, clears `interviewScript` |

### Generate button behavior

```
On click:
  → Show SectionSkeleton for all five center panel sections (< 100ms)
  → agentState.status = "Thinking"
  → Emit AG-UI run event with GENERATE_WORKSPACE_PROMPT(idea, region, model, goal)
  → On response: parseWorkspaceSafely → setState
  → On timeout (> 10s): setState(mockWorkspace), isMockActive = true
```

### Reset button behavior

```
On click:
  → setState(mockWorkspace)
  → No LLM call
  → isMockActive = false (mock is the intended state for reset)
  → interviewScript cleared to null
```

### Hackathon criteria

Provides the idea intake surface that feeds all four hackathon criteria — the agent cannot generate anything without structured input from this panel.

### Acceptance criteria

- [ ] All four selectors render with correct options
- [ ] "Generate" button disabled while `agentState.status === "Thinking"`
- [ ] "Sample idea" pre-fills textarea with the demo idea string
- [ ] "Reset to Demo" restores mock workspace and clears `interviewScript`
- [ ] Reset works correctly when tested 3 times in a row

---

## Cross-Component State Map

This table shows which workspace state fields each component reads and which interactions it triggers.

| Component | Reads | Triggers |
|---|---|---|
| `StartupSnapshotCard` | `snapshot` | — |
| `PersonaCards` | `personas`, `selectedPersonaId` | Loop 1 (AG-UI event) |
| `AssumptionMap` | `assumptions` | Loop 2 (client-side + AG-UI event) |
| `ExperimentList` | `experiments` | — |
| `ValidationScorecard` | `scorecard.dimensions`, `scorecard.decision`, `scorecard.biggestRisk` | — |
| `InterviewScriptPanel` | `interviewScript` | "Copy all" (clipboard) |
| `AgentControlPanel` | `agentState` | Loop 3 (AG-UI tool event) |
| `DynamicWorkspace` | `components[]` (derived) | — |
| `SectionSkeleton` | `agentState.status` | — |
| `LeftPanel` | `idea`, `region`, `businessModel`, `goal` | Generate (AG-UI event), Reset (local state) |

---

## Failure Handling Per Component

| Component | Failure scenario | Behavior |
|---|---|---|
| `StartupSnapshotCard` | LLM returns partial snapshot | Render available fields; empty fields show `—` |
| `PersonaCards` | LLM returns < 3 personas | Render however many exist; no crash |
| `AssumptionMap` | LLM returns 0 assumptions | Render empty state message |
| `ExperimentList` | Experiment merge produces duplicate IDs | `mergeNewExperiment` filters by ID set |
| `ValidationScorecard` | LLM includes `overallScore` | Field discarded; `computeOverallScore()` used |
| `InterviewScriptPanel` | LLM returns malformed script | `parseWorkspaceSafely` catches and activates mock |
| `AgentControlPanel` | Agent status stuck on "Thinking" | 10s timeout resets to mock, status → "WaitingForUser" |
| `DynamicWorkspace` | Unknown `type` in descriptor array | `if (!Component) return null` — section skipped silently |
| `SectionSkeleton` | Skeleton never replaced | Timeout fallback forces state update, skeleton replaced by mock |
| `LeftPanel` | Generate clicked without idea text | Button disabled if textarea is empty |