# IdeaLens — Guía de implementación en este repositorio

Basado en `docs/IDEALENS_MVP_SPEC.md`. Esta guía documenta las **adaptaciones específicas** necesarias para construir IdeaLens dentro del monorepo `family-ai` en lugar de desde cero.

---

## Adaptaciones vs. el spec original

| Aspecto | Spec original | Este repositorio |
|---|---|---|
| Estructura | Next.js 14 standalone | Nueva ruta `/idealens` dentro de `apps/frontend` |
| CopilotKit runtime | Route handler `app/api/copilotkit/route.ts` | BFF Hono ya existe en `:4000` — no crear otro |
| Hook de estado | `useCoAgent()` | `useAgent()` + `useFrontendTool()` |
| Adaptador LLM | `GoogleGenerativeAIAdapter` directo | Nuevo agente Python en `apps/agent/src/idealens/` |
| UI components | Instalar shadcn/ui | Radix UI ya instalado — equivalente |
| Instalación deps | `npx shadcn@latest init` | Solo `npm install @dnd-kit/core` si se hace P6 |

---

## Estructura de archivos a crear

```
apps/frontend/src/
├── app/
│   └── idealens/
│       └── page.tsx                    ← layout 3 columnas + tools registrados
├── components/
│   └── idealens/
│       ├── DynamicWorkspace.tsx        ← component registry renderer
│       ├── StartupSnapshotCard.tsx
│       ├── PersonaCards.tsx
│       ├── AssumptionMap.tsx
│       ├── ExperimentList.tsx
│       ├── ValidationScorecard.tsx
│       ├── InterviewScriptPanel.tsx
│       └── SectionSkeleton.tsx
└── lib/
    └── idealens/
        ├── types.ts                    ← IdeaLensWorkspace + tipos (Sección 7 del spec)
        ├── mock.ts                     ← mockWorkspace (Sección 17 del spec)
        ├── scoring.ts                  ← computeOverallScore (Sección 8 del spec)
        ├── parseWorkspace.ts           ← parser JSON + fallback (Sección 11 del spec)
        ├── componentRegistry.ts        ← A2UI registry (Sección 13 del spec)
        └── useIdeaLens.ts              ← hook adaptado (ver abajo)

apps/agent/src/
└── idealens/
    ├── __init__.py
    ├── state.py                        ← IdeaLensState TypedDict
    └── prompts.py                      ← 4 prompts del spec (Sección 10)
```

---

## Paso 0 — Prerequisitos (ya listos)

Nada que instalar. Todo esto ya está en el repo:

- CopilotKit v2 configurado en `apps/frontend/src/components/copilot/CopilotKitProviderShell.tsx`
- BFF Hono en `apps/bff/src/server.ts` con `CopilotRuntime` activo
- Radix UI (Card, Badge, Button, Progress, etc.) en `apps/frontend/src/components/ui/`
- TailwindCSS 4 configurado
- `GEMINI_API_KEY` en `.env`
- `ThreadsDrawer` disponible para reutilizar

---

## Paso 1 — Tipos y datos (copiar del spec)

### `apps/frontend/src/lib/idealens/types.ts`

Copiar literalmente la Sección 7 del spec (`types/workspace.ts`). Sin cambios.

### `apps/frontend/src/lib/idealens/mock.ts`

Copiar literalmente la Sección 17 del spec (`lib/mock/mockWorkspace.ts`). Sin cambios.

Exportar como:
```ts
export const mockWorkspace: IdeaLensWorkspace = { ... };
```

### `apps/frontend/src/lib/idealens/scoring.ts`

Copiar literalmente la Sección 8 del spec (`lib/scoring.ts`). Sin cambios:
```ts
export function computeOverallScore(dimensions: ValidationScorecard["dimensions"]): number { ... }
export function getDecision(score: number): "Proceed" | "Validate First" | "Pivot" { ... }
```

### `apps/frontend/src/lib/idealens/parseWorkspace.ts`

Copiar literalmente la Sección 11 del spec (`lib/agent/parseWorkspace.ts`). Sin cambios:
```ts
export function parseWorkspaceSafely(raw: string): IdeaLensWorkspace { ... }
```

---

## Paso 2 — Hook de workspace (ADAPTACIÓN CRÍTICA)

El spec usa `useCoAgent()`. Este repo usa `useAgent()` + `useFrontendTool()`.

### `apps/frontend/src/lib/idealens/useIdeaLens.ts`

```ts
"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import type { IdeaLensWorkspace } from "./types";
import { mockWorkspace } from "./mock";

function mergeWorkspace(raw: unknown): IdeaLensWorkspace {
  if (raw && typeof raw === "object") {
    return { ...mockWorkspace, ...(raw as Partial<IdeaLensWorkspace>) };
  }
  return mockWorkspace;
}

export function useIdeaLens() {
  const agent = useAgent("idealens");
  const state = mergeWorkspace(agent.state);

  return { state, agent };
}
```

Las mutaciones de estado NO se hacen con `setState()` directo — se registran como **frontend tools** en `page.tsx` (ver Paso 4).

---

## Paso 3 — Component Registry

### `apps/frontend/src/lib/idealens/componentRegistry.ts`

Copiar literalmente la Sección 13 del spec, ajustando los imports:

```ts
import { StartupSnapshotCard } from "@/components/idealens/StartupSnapshotCard";
import { PersonaCards } from "@/components/idealens/PersonaCards";
import { AssumptionMap } from "@/components/idealens/AssumptionMap";
import { ExperimentList } from "@/components/idealens/ExperimentList";
import { ValidationScorecard } from "@/components/idealens/ValidationScorecard";
import { InterviewScriptPanel } from "@/components/idealens/InterviewScriptPanel";

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

---

## Paso 4 — Frontend tools en `page.tsx` (ADAPTACIÓN CRÍTICA)

El spec llama a `setState()` directamente después de llamar al agente. En este repo, las mutaciones de canvas se registran como **frontend tools** con `useFrontendTool()`. El agente llama a estas herramientas — nunca escribe al estado directamente.

Referencia del patrón: `apps/frontend/src/app/leads/page.tsx` líneas 9–14.

### `apps/frontend/src/app/idealens/page.tsx`

```tsx
"use client";

import { useCallback, useState } from "react";
import { z } from "zod";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { useIdeaLens } from "@/lib/idealens/useIdeaLens";
import { parseWorkspaceSafely } from "@/lib/idealens/parseWorkspace";
import { computeOverallScore, getDecision } from "@/lib/idealens/scoring";
import { mockWorkspace } from "@/lib/idealens/mock";
import type { IdeaLensWorkspace } from "@/lib/idealens/types";
import { ThreadsDrawer } from "@/components/threads-drawer";

export default function IdeaLensPage() {
  const { state, agent } = useIdeaLens();
  const [isGenerating, setIsGenerating] = useState(false);

  // Tool: el agente llama esto para reemplazar el workspace completo
  useFrontendTool({
    name: "updateWorkspace",
    description: "Replace the entire IdeaLens workspace with agent-generated content.",
    parameters: z.object({ workspaceJson: z.string() }),
    handler: ({ workspaceJson }) => {
      const parsed = parseWorkspaceSafely(workspaceJson);
      agent.setState(parsed);
      setIsGenerating(false);
    },
  });

  // Tool: selección de persona ICP
  useFrontendTool({
    name: "updatePersonaSelection",
    description: "Update workspace after persona selected as ICP.",
    parameters: z.object({ workspaceJson: z.string() }),
    handler: ({ workspaceJson }) => {
      const parsed = parseWorkspaceSafely(workspaceJson);
      const score = computeOverallScore(parsed.scorecard.dimensions);
      agent.setState({
        ...parsed,
        scorecard: {
          ...parsed.scorecard,
          overallScore: score,
          decision: getDecision(score),
        },
      });
    },
  });

  // Tool: marcar asunción como riesgosa
  useFrontendTool({
    name: "addExperiment",
    description: "Add a new experiment for a risky assumption.",
    parameters: z.object({ workspaceJson: z.string() }),
    handler: ({ workspaceJson }) => {
      const parsed = parseWorkspaceSafely(workspaceJson);
      agent.setState(parsed);
    },
  });

  // Tool: generar script de entrevista
  useFrontendTool({
    name: "setInterviewScript",
    description: "Render the InterviewScriptPanel with a generated script.",
    parameters: z.object({ workspaceJson: z.string() }),
    handler: ({ workspaceJson }) => {
      const parsed = parseWorkspaceSafely(workspaceJson);
      agent.setState((prev: IdeaLensWorkspace) => ({
        ...prev,
        interviewScript: parsed.interviewScript,
      }));
    },
  });

  // Fallback para cualquier herramienta sin render dedicado
  useDefaultRenderTool(() => null);

  return (
    <CopilotChatConfigurationProvider agentId="idealens">
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Panel izquierdo — idea intake */}
        <aside className="w-64 shrink-0 border-r bg-white overflow-y-auto">
          <LeftPanel state={state} onGenerate={() => setIsGenerating(true)} />
        </aside>

        {/* Centro — workspace dinámico */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          <CenterPanel state={state} isGenerating={isGenerating} />
        </main>

        {/* Derecha — agent control panel */}
        <aside className="w-72 shrink-0 border-l bg-white overflow-y-auto">
          <RightPanel state={state} agentStatus={agent.status} />
        </aside>

        <CopilotSidebar />
        <ThreadsDrawer />
      </div>
    </CopilotChatConfigurationProvider>
  );
}
```

### Interacciones client-side (cero latencia LLM)

Las acciones de "Mark Risky", "Mark Validated" e "Mark Invalidated" se manejan puramente en el cliente antes de llamar al agente:

```tsx
function handleMarkRisky(assumptionId: string) {
  // 1. Feedback inmediato — badge rojo sin esperar al LLM
  agent.setState((prev: IdeaLensWorkspace) => {
    const updated = {
      ...prev,
      assumptions: prev.assumptions.map(a =>
        a.id === assumptionId ? { ...a, status: "Risky" as const } : a
      ),
      scorecard: {
        ...prev.scorecard,
        dimensions: {
          ...prev.scorecard.dimensions,
          evidenceStrength: Math.max(0, prev.scorecard.dimensions.evidenceStrength - 1.5),
        },
      },
    };
    const score = computeOverallScore(updated.scorecard.dimensions);
    return {
      ...updated,
      scorecard: { ...updated.scorecard, overallScore: score, decision: getDecision(score) },
    };
  });
  // 2. El agente recibe el contexto y llama addExperiment con el nuevo experimento
}
```

---

## Paso 5 — Componentes workspace

Usar **Radix UI** (ya instalado) en lugar de instalar shadcn/ui. El equivalente es directo:

| shadcn (spec) | Radix UI (este repo) |
|---|---|
| `<Card>`, `<CardContent>` | `<div className="rounded-xl border bg-white p-5">` |
| `<Badge>` | `<span className="...badge classes...">` o `@/components/ui/badge` si existe |
| `<Button>` | `@/components/ui/button` |
| `<Progress>` | `@/components/ui/progress` |
| `<ScrollArea>` | `@/components/ui/scroll-area` |

Seguir el sistema de badges de la Sección 18 del spec:

```tsx
const badgeColors = {
  "High":       "bg-red-100 text-red-700",
  "Risky":      "bg-red-100 text-red-700",
  "Pivot":      "bg-red-100 text-red-700",
  "Medium":     "bg-amber-100 text-amber-700",
  "Unknown":    "bg-amber-100 text-amber-700",
  "Low":        "bg-green-100 text-green-700",
  "Validated":  "bg-green-100 text-green-700",
  "Proceed":    "bg-green-100 text-green-700",
  "Invalidated":"bg-gray-100 text-gray-500",
};
```

Implementar los 6 componentes siguiendo exactamente las Secciones 1.2–1.6 del spec. El código es idéntico; solo cambia que se importa desde `@/components/ui/` en vez de `shadcn/ui`.

### `SectionSkeleton.tsx` — copiar literal del spec

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

---

## Paso 6 — Agente Python

### `apps/agent/src/idealens/__init__.py`

Vacío.

### `apps/agent/src/idealens/state.py`

```python
from typing import Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from typing import Annotated


class IdeaLensState(TypedDict):
    messages: Annotated[list, add_messages]
    idea: str
    region: str
    business_model: str
    goal: str
    workspace_json: Optional[str]
```

### `apps/agent/src/idealens/prompts.py`

Copiar literalmente los 4 prompts de la Sección 10 del spec. La única adaptación: añadir una instrucción para llamar a las frontend tools:

```python
SYSTEM_PROMPT = """
You are IdeaLens, an agent that generates startup validation workspaces.
Rules:
- Always return valid JSON. Never return markdown or plain text.
- Be specific. Avoid generic startup advice.
- Identify the riskiest assumptions, not the most obvious ones.
- Recommend experiments completable in under one week.
- Do not fabricate evidence. Mark confidence Low when there is no data.
- Never include overallScore in the scorecard — it is computed by the client.
- After generating workspace content, call the appropriate frontend tool:
  updateWorkspace, updatePersonaSelection, addExperiment, or setInterviewScript.
"""

def GENERATE_WORKSPACE_PROMPT(idea: str, region: str, model: str, goal: str) -> str:
    return f"""
{SYSTEM_PROMPT}

Generate a complete IdeaLensWorkspace JSON for:
Idea: {idea}
Region: {region}
Business model: {model}
Validation goal: {goal}

Include: snapshot, 3 personas, 5 assumptions, 4 experiments,
scorecard dimensions 0-10 (no overallScore), agentState.

Call updateWorkspace with the JSON string.
"""

# Copiar UPDATE_ON_PERSONA_PROMPT, UPDATE_ON_RISKY_ASSUMPTION_PROMPT,
# y GENERATE_INTERVIEW_SCRIPT_PROMPT literalmente del spec Sección 10,
# añadiendo en cada uno: "Call [toolName] with the JSON string."
```

### Registrar el agente en el BFF

Editar `apps/bff/src/server.ts`, añadir el agente IdeaLens:

```typescript
const leadsAgent = new LangGraphAgent({
  deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:8123",
  graphId: "default",
  langsmithApiKey: process.env.LANGSMITH_API_KEY ?? "",
  assistantConfig: { recursion_limit: Number(process.env.LANGGRAPH_RECURSION_LIMIT ?? 60) },
});

const idealensAgent = new LangGraphAgent({
  deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:8123",
  graphId: "idealens",   // ← graph separado en el agent Python
  langsmithApiKey: process.env.LANGSMITH_API_KEY ?? "",
  assistantConfig: { recursion_limit: 60 },
});

// En CopilotRuntime:
agents: { 
  default: leadsAgent,
  idealens: idealensAgent,  // ← añadir esto
},
```

### Registrar el graph en `apps/agent/main.py`

```python
# Añadir junto al graph "default" existente:
from src.idealens.state import IdeaLensState
from src.idealens.prompts import SYSTEM_PROMPT, GENERATE_WORKSPACE_PROMPT
from src.runtime import build_graph   # reutilizar el mismo factory

idealens_graph = build_graph(
    runtime=os.getenv("AGENT_RUNTIME", "gemini-flash-react"),
    tools=[],  # IdeaLens no usa backend tools — solo frontend tools
    system_prompt=SYSTEM_PROMPT,
)

# Registrar en langgraph:
graphs = {
    "default": leads_graph,
    "idealens": idealens_graph,
}
```

---

## Paso 7 — Estrategia de latencia (copiar del spec)

La Sección 15 del spec aplica sin cambios:

**Layer A — Skeletons inmediatos (< 100ms)**
```tsx
// En handleGenerate dentro de page.tsx:
setIsGenerating(true);  // → muestra SectionSkeleton en todas las secciones
// Luego el agente responde y llama updateWorkspace → setIsGenerating(false)
```

**Layer B — KV Cache via system prompt idéntico**

El `SYSTEM_PROMPT` en `apps/agent/src/idealens/prompts.py` debe ser **byte-idéntico** en todas las llamadas. No concatenar strings dinámicos en el system prompt — solo en el user prompt.

**Layer C — Score client-side (< 16ms)**

Llamar `computeOverallScore()` en cada mutación de estado antes de hacer cualquier llamada al LLM.

**Fallback automático a mock**

```ts
// En parseWorkspace.ts — ya incluido en la Sección 11 del spec:
const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<{ fallback: true }>(r => setTimeout(() => r({ fallback: true }), ms))]);
```

---

## Prompts LLM — copiar literalmente

Los 4 prompts de la Sección 10 del spec son compatibles con Gemini Flash-Lite (el modelo que ya corre en `apps/agent`). Copiarlos sin cambios a `apps/agent/src/idealens/prompts.py`.

**Regla crítica:** El string `SYSTEM_PROMPT` debe ser idéntico en todas las llamadas para que el KV cache funcione. No modificarlo entre llamadas.

---

## Variables de entorno

Ninguna variable nueva. IdeaLens usa las mismas que el proyecto:

```bash
GEMINI_API_KEY=...           # ya requerido
AGENT_RUNTIME=gemini-flash-react  # ideaLens funciona mejor con react (no deep)
```

---

## Orden de build — P1 a P5

Seguir exactamente el orden de la Sección 4 del spec. Con la adaptación del monorepo:

| Prioridad | Qué construir | Tiempo estimado |
|---|---|---|
| **P1** | Tipos + mock + scoring + registry + `page.tsx` shell con mock data | 45 min |
| **P2** | Agente Python + BFF + `useFrontendTool` wiring + persona loop | 60 min |
| **P3** | Tool button "Generate Interview Script" → `InterviewScriptPanel` | 45 min |
| **P4** | Assumption loop (mark risky → score drop → nuevo experimento) | 45 min |
| **P5** | Scorecard animado + client-side scoring completo | 30 min |
| **P6+** | Kanban, Gemma 4 local — solo si P1-P5 están sólidos | bonus |

**Regla de decisión (del spec):** Si P2 no está completo a las 1:30 PM, pasar a P3 y volver a P4 después del almuerzo.

---

## Criterios de aceptación por fase

Ver Sección 19 del spec para los checklists completos. Los paths cambian así:

| Spec (standalone) | Este repo (monorepo) |
|---|---|
| `app/page.tsx` | `apps/frontend/src/app/idealens/page.tsx` |
| `lib/hooks/useWorkspace.ts` | `apps/frontend/src/lib/idealens/useIdeaLens.ts` |
| `lib/agent/componentRegistry.ts` | `apps/frontend/src/lib/idealens/componentRegistry.ts` |
| `components/workspace/` | `apps/frontend/src/components/idealens/` |
| `app/api/copilotkit/route.ts` | No existe — usa el BFF en `:4000` |

---

## Demo script

El script de la Sección 20 del spec aplica sin cambios. Target: bajo 2:30 minutos.

```
Opening (15s): "La IA no responde. Construye la interfaz."
Step 1 (30s): Generar workspace → AG-UI + A2UI en acción
Step 2 (30s): Seleccionar persona → feedback loop en tiempo real
Step 3 (30s): Mark Risky → score cae en < 16ms, experimento nuevo
Step 4 (30s): Generate Interview Script → nuevo componente, sin chat
Closing (15s): "El agente no está dentro de la app. El agente está dando forma a la app."
```

---

## Archivos de referencia para la implementación

| Para entender... | Leer... |
|---|---|
| Patrón `useFrontendTool` completo | `apps/frontend/src/app/leads/page.tsx` |
| Cómo está configurado CopilotKit v2 | `apps/frontend/src/components/copilot/CopilotKitProviderShell.tsx` |
| Cómo añadir agent al BFF | `apps/bff/src/server.ts` |
| Factory de runtimes Python | `apps/agent/src/runtime.py` |
| Tipos TypeScript existentes (patrón) | `apps/frontend/src/lib/leads/types.ts` |
| Componentes Radix UI disponibles | `apps/frontend/src/components/ui/` |
| ThreadsDrawer para reutilizar | `apps/frontend/src/components/threads-drawer/` |
| Spec original completo | `docs/IDEALENS_MVP_SPEC.md` |
