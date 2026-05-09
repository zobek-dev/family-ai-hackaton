# IdeaLens — Flujo Completo del Sistema
> Paso a paso: interacciones entre componentes, estado compartido y comunicación con IA

---

## El problema que resuelve este documento

IdeaLens no es una app lineal. Hay cuatro actores simultáneos: el founder que hace clic, los componentes React que reaccionan, el estado compartido que conecta todo, y el agente de IA que genera y actualiza el workspace. Este documento describe exactamente qué pasa en cada paso, quién lo dispara, qué cambia, y por qué.

---

## Actores del sistema

| Actor | Rol |
|---|---|
| **Founder** | El usuario. El primer acto es escribir su idea en lenguaje natural. Las interacciones posteriores son exclusivamente visuales — nunca escribe instrucciones al agente. |
| **LeftPanel** | Superficie de entrada. Captura idea, región, modelo de negocio y objetivo. Es el punto de partida obligatorio del flujo. |
| **DynamicWorkspace** | El renderizador central. Monta componentes a partir de descriptores del agente. Empieza vacío — nada se genera sin la idea del founder. |
| **useCoAgent** | El estado compartido. Conecta la UI de React con el runtime del agente. Cualquier mutación de cualquier lado se propaga al otro. |
| **CopilotKit Runtime** | El intermediario. Recibe eventos AG-UI del frontend, los convierte en llamadas a Gemini, y devuelve el JSON resultante. |
| **Gemini 2.0 Flash** | El modelo. Genera workspaces completos y actualizaciones parciales en JSON estructurado. |
| **AgentControlPanel** | El lanzador de herramientas. Muestra el estado del agente y autoriza tool calls a través de botones. |

---

## Flujo 0 — Estado inicial (app en blanco)

Cuando la app carga por primera vez, el workspace está completamente vacío. No se muestra ningún dato, no se llama al modelo, no se monta ningún componente de validación. El founder debe escribir su idea antes de que cualquier cosa suceda.

```
App carga
  → useCoAgent inicializa estado vacío (sin mockWorkspace visible)
  → DynamicWorkspace → vacío, muestra estado de bienvenida o placeholder
  → AgentControlPanel muestra: status "Idle" · sin objetivo · sin sugerencias
  → LeftPanel muestra:
      textarea vacío con placeholder: "Describe tu idea de startup..."
      selectores: región, modelo de negocio, objetivo de validación
      botón "Generate" → DESHABILITADO (textarea vacío)
      botón "Sample idea" → disponible para pre-cargar ejemplo
```

**Lo que el founder ve:** una interfaz limpia y vacía. El workspace central no tiene contenido. El mensaje implícito es claro: la idea del founder es el punto de partida — nada existe antes de que él escriba.

**Estado en este punto:**
```
idea = ""
agentState.status = "Idle"
agentState.isMockActive = false
interviewScript = null
selectedPersonaId = null
workspace = vacío
```

**Regla de habilitación del botón Generate:**
```tsx
<Button
  disabled={idea.trim().length === 0 || agentState.status === "Thinking"}
  onClick={handleGenerate}
>
  Generate Validation Workspace
</Button>
```

El botón solo se habilita cuando el textarea tiene contenido. Esto garantiza que el agente nunca se llama sin una idea real.

---

## Flujo 1 — Generación del workspace

### Paso 1.1 — El founder escribe su idea de startup

Este es el primer paso obligatorio del sistema. Sin este paso, nada más ocurre.

```
Founder escribe en el textarea del LeftPanel:
  "AI copilot for small e-commerce stores in LatAm that writes
   product descriptions and email campaigns."

  → idea.length > 0
  → Botón "Generate Validation Workspace" se habilita
  → Sin llamada al modelo todavía
  → Sin cambio en el workspace
```

El founder también puede ajustar los selectores de contexto:
```
  region: "LatAm"          (default o seleccionado)
  businessModel: "SaaS"    (default o seleccionado)
  goal: "Validate demand"  (default o seleccionado)
```

Alternativamente, hace clic en "Sample idea" para pre-cargar el texto de demostración en el textarea. El botón "Generate" se habilita automáticamente al detectar contenido.

**Lo que el founder ve:** el textarea con su idea escrita. El botón "Generate" aparece habilitado por primera vez. El workspace sigue vacío — la idea está ingresada pero aún no procesada.

---

### Paso 1.2 — El founder hace clic en "Generate Validation Workspace"

Este es el primer evento que conecta el frontend con el agente.

```
Founder hace clic en [Generate Validation Workspace]
  │
  ├─ INMEDIATO (< 100ms) — React state, sin llamada a red:
  │   agentState.status = "Thinking"
  │   DynamicWorkspace → todos los componentes reemplazados por SectionSkeleton
  │   LeftPanel → botón "Generate" deshabilitado
  │
  └─ ASYNC — useWorkspace dispara evento AG-UI:
      Evento: run_agent
      Payload: GENERATE_WORKSPACE_PROMPT(idea, region, model, goal)
```

**Lo que el founder ve:** el workspace entero se convierte en skeletons animados en menos de 100ms. El sistema se ve activo, no colgado.

---

### Paso 1.3 — El evento AG-UI llega al runtime

```
CopilotKit Runtime (app/api/copilotkit/route.ts)
  → Recibe el evento AG-UI del frontend
  → GoogleGenerativeAIAdapter construye el request
  → Llama a Gemini 2.0 Flash con GENERATE_WORKSPACE_PROMPT
  → System prompt idéntico al de todas las llamadas → KV cache activo
```

**El prompt que recibe Gemini incluye:**
- El `SYSTEM_PROMPT` constante (en caché)
- La idea del founder
- Región, modelo de negocio, objetivo de validación
- Instrucción de devolver JSON estructurado con todo el workspace

---

### Paso 1.4 — Gemini responde con el workspace JSON

```
Gemini 2.0 Flash devuelve JSON:
  {
    snapshot: { problem, customer, solution, category, wedge, monetization,
                mainAssumption, validationPriority },
    personas: [ {...}, {...}, {...} ],
    assumptions: [ {...}, {...}, {...}, {...}, {...} ],
    experiments: [ {...}, {...}, {...}, {...} ],
    scorecard: {
      dimensions: { problemClarity, customerSpecificity, urgency,
                    differentiation, monetizationClarity, mvpFeasibility,
                    distributionFeasibility, evidenceStrength }
      biggestRisk, recommendedNextStep, decision
    },
    agentState: { status, currentObjective, suggestions, activityLog }
  }
```

**Nota:** Gemini nunca incluye `overallScore`. El campo está prohibido en el prompt. El score siempre se computa en el cliente.

---

### Paso 1.5 — parseWorkspaceSafely procesa la respuesta

```
parseWorkspaceSafely(raw: string)
  ├─ Éxito → IdeaLensWorkspace parseado
  │   isMockActive = false
  │
  ├─ JSON inválido → mockWorkspace
  │   isMockActive = true
  │   badge "demo mode" aparece en AgentControlPanel
  │
  └─ Timeout (> 10s) → mockWorkspace
      isMockActive = true
      badge "demo mode" aparece en AgentControlPanel
```

En cualquier caso, el workspace nunca queda vacío ni roto.

---

### Paso 1.6 — useCoAgent propaga el nuevo estado

```
setState(workspace) → useCoAgent
  → El estado compartido se actualiza
  → React re-renderiza el árbol de componentes
  → DynamicWorkspace recibe el nuevo components[]
  → componentRegistry mapea cada descriptor a su React component
  → Los SectionSkeletons son reemplazados por los componentes reales:
      startup_snapshot_card  →  <StartupSnapshotCard />
      persona_cards          →  <PersonaCards />
      assumption_map         →  <AssumptionMap />
      experiment_list        →  <ExperimentList />
      validation_scorecard   →  <ValidationScorecard />
  → computeOverallScore(dimensions) → scorecard.overallScore calculado
  → agentState.status = "WaitingForUser"
```

**Lo que el founder ve:** los skeletons desaparecen y aparecen los cinco componentes con contenido real y específico para su idea. El score aparece en el `ValidationScorecard`. Las sugerencias del agente se actualizan en el `AgentControlPanel`.

---

## Flujo 2 — Loop 1: Selección de persona (ICP)

### Paso 2.1 — El founder hace clic en "Select as ICP"

El founder ve tres personas en `PersonaCards` y elige la que mejor representa su cliente objetivo.

```
Founder hace clic en [Select as ICP] en PersonaCard "Solo Shopify Seller"
  │
  ├─ INMEDIATO (< 100ms) — optimistic update:
  │   selectedPersonaId = "p1"
  │   PersonaCard "p1" → borde azul (border-2 border-blue-500)
  │   agentState.status = "Thinking"
  │
  └─ ASYNC — evento AG-UI:
      Evento: run_agent
      Payload: UPDATE_ON_PERSONA_PROMPT(workspaceJSON, "p1")
```

**Por qué el update optimista importa:** el founder ve el feedback visual inmediatamente. La interfaz se siente responsiva aunque el modelo tarde 3 segundos en responder.

---

### Paso 2.2 — Gemini actualiza el workspace para ese ICP

```
Gemini recibe UPDATE_ON_PERSONA_PROMPT
  → System prompt en KV cache → llamada más rápida que la generación inicial
  → Actualiza SOLO los campos relevantes:
      snapshot.customer          → redefinido para el ICP elegido
      snapshot.mainAssumption    → la suposición más crítica para ese cliente
      snapshot.validationPriority → qué testear primero con ese ICP
      assumptions[]              → re-rankeadas por relevancia al ICP
      experiments[]              → re-priorizados para ese cliente
      scorecard.dimensions.customerSpecificity  → ajustado
      scorecard.dimensions.urgency              → ajustado
      agentState.currentObjective → actualizado
      agentState.suggestions      → actualizadas
      agentState.activityLog      → nueva entrada prepended
  → Los demás campos no cambian (persona list, idea, región)
```

---

### Paso 2.3 — La UI refleja el workspace actualizado

```
parseWorkspaceSafely → setState(updatedWorkspace)
  → computeOverallScore(new dimensions) → score recalculado
  → StartupSnapshotCard → muestra nuevo customer y mainAssumption
  → AssumptionMap → assumptions reordenadas según el ICP
  → ExperimentList → experimentos repriorizados
  → ValidationScorecard → score animado hacia el nuevo valor
  → AgentControlPanel → nuevo currentObjective y sugerencias
  → agentState.status = "WaitingForUser"
```

**Lo que el founder ve:** el workspace entero se reacomoda alrededor del cliente elegido. Las suposiciones que más importan para ese ICP suben en la lista. Los experimentos recomendados cambian. El score refleja la nueva perspectiva. Todo sin escribir una sola instrucción.

---

## Flujo 3 — Loop 2: Marcar suposición como riesgosa

### Paso 3.1 — El founder marca una suposición como "Risky"

El founder identifica en `AssumptionMap` una suposición que le preocupa y hace clic en "Mark Risky".

```
Founder hace clic en [Mark Risky] en la fila:
  "Small stores will pay $29/month for better product copy."
  │
  ├─ INMEDIATO (< 100ms) — cliente, sin red:
  │   assumption.status = "Risky"
  │   Badge → rojo (bg-red-100 text-red-700)
  │   dimensions.evidenceStrength -= 1.5 (min 0)
  │   computeOverallScore(dimensions) → nuevo score en < 16ms
  │   ValidationScorecard → número animado al nuevo valor
  │   getDecision(score) → badge de decisión actualizado
  │
  └─ ASYNC — evento AG-UI:
      Evento: run_agent
      Payload: UPDATE_ON_RISKY_ASSUMPTION_PROMPT(workspaceJSON, "a1")
```

**Este paso demuestra dos cosas simultáneamente:**
- El score cae de forma instantánea (criterio 3 del hackathon: zero-latency client-side)
- El agente genera un experimento específico para testear esa suposición (criterio 2: feedback loop agéntico)

---

### Paso 3.2 — Gemini genera el experimento de validación

```
Gemini recibe UPDATE_ON_RISKY_ASSUMPTION_PROMPT
  → KV cache hit → respuesta más rápida
  → Genera UN nuevo experimento:
      title: "Fake-door pricing test"
      hypothesis: "Stores will pay at least $29/month"
      method: "Landing page con CTA de pricing + waitlist"
      successMetric: "5% de visitantes hacen clic en el CTA"
      effort: "Medium"
      cost: "Low"
      duration: "3 days"
      status: "This Week"
      relatedAssumptionId: "a1"   ← trazabilidad explícita
  → Actualiza agentState.currentObjective y activityLog (dos entradas)
```

---

### Paso 3.3 — El nuevo experimento aparece en el workspace

```
parseWorkspaceSafely → setState(updatedWorkspace)
  → mergeNewExperiment(current, incoming):
      newOnes = incoming.filter(e => !existingIds.has(e.id))
      return [...newOnes, ...current]
  → El nuevo experimento aparece al inicio de ExperimentList
  → relatedAssumptionId visible como badge o indicador en la tarjeta
  → activityLog prepended × 2:
      "Assumption marked risky: willingness to pay"
      "Experiment added: Fake-door pricing test"
```

**Lo que el founder ve:** el score bajó apenas hizo clic. Segundos después, un nuevo experimento específico aparece en la cima de la lista, directamente vinculado a la suposición que acaba de marcar como riesgosa.

---

## Flujo 4 — Loop 3: Generar script de entrevistas

### Paso 4.1 — El founder hace clic en "Generate Interview Script"

Desde el `AgentControlPanel`, el founder autoriza la tool action.

```
Founder hace clic en [Generate Interview Script] en AgentControlPanel
  │
  ├─ INMEDIATO (< 100ms):
  │   agentState.status = "Thinking"
  │   SectionSkeleton aparece al final del CenterPanel (label: "Interview Script")
  │   Botón queda deshabilitado (disabled mientras status === "Thinking")
  │
  └─ ASYNC — MCP-style tool call:
      Tool: generate_interview_script
      Lee del estado: selectedPersonaId + assumption con importance "High" y status "Risky"
      Payload: GENERATE_INTERVIEW_SCRIPT_PROMPT(workspaceJSON)
```

**Por qué este momento es diferente:** es la primera vez que aparece un skeleton en una posición que no existía antes. Señala al founder que algo completamente nuevo está siendo construido.

---

### Paso 4.2 — Gemini genera el script

```
Gemini recibe GENERATE_INTERVIEW_SCRIPT_PROMPT
  → KV cache hit en system prompt
  → Devuelve SOLO el objeto interviewScript:
      {
        "interviewScript": {
          "title": "Pricing Discovery — Solo Shopify Seller",
          "targetPersona": "Solo Shopify Seller",
          "goal": "Descubrir si pagaría por copy que convierte mejor",
          "questions": [
            {
              "id": "q1",
              "question": "¿Cuánto tiempo dedicas a escribir descripciones de productos por semana?",
              "purpose": "Medir la frecuencia e intensidad del dolor",
              "goodSignal": "Más de 3 horas semanales, lo menciona como frustrante",
              "redFlag": "Lo delega o usa templates sin pensar"
            },
            ...  6–8 preguntas en total
          ]
        }
      }
```

---

### Paso 4.3 — InterviewScriptPanel monta como componente nuevo

```
setState({ interviewScript: parsed.interviewScript })
  → useCoAgent propaga el cambio
  → CenterPanel detecta: state.interviewScript !== null
  → DynamicWorkspace → agente emite descriptor:
      { "id": "script_001", "type": "interview_script_panel", "props": {} }
  → componentRegistry["interview_script_panel"] → <InterviewScriptPanel />
  → El componente monta al final del workspace SIN recargar la página
  → El SectionSkeleton desaparece
  → agentState.status = "WaitingForUser"
  → activityLog: "Interview script generated for Solo Shopify Seller."
```

**Lo que el founder ve:** donde estaba el skeleton, aparece una nueva sección con 6–8 preguntas de entrevista. Cada pregunta tiene su propósito, señal positiva esperada y red flag. El componente no existía cuando se cargó la app. El agente lo construyó en runtime.

---

## Flujo 5 — Marcado de suposiciones: Validated e Invalidated

Estos dos estados son operaciones puramente client-side. Sin llamada al modelo. Sin latencia.

### Mark Validated

```
Founder hace clic en [Mark Validated]
  → assumption.status = "Validated"
  → Badge → verde (bg-green-100 text-green-700)
  → dimensions.evidenceStrength += 1.0 (max 10)
  → computeOverallScore(dimensions) → score sube en < 16ms
  → activityLog: "Assumption validated: [texto]"
  → Sin llamada a Gemini
```

### Mark Invalidated

```
Founder hace clic en [Mark Invalidated]
  → assumption.status = "Invalidated"
  → Badge → gris (bg-gray-100 text-gray-500)
  → Sin cambio en evidenceStrength
  → activityLog: "Assumption invalidated: [texto]"
  → Sin llamada a Gemini
```

**La lógica de esta asimetría:** invalidar una suposición no necesariamente es evidencia negativa — podría significar que se decidió descartar esa línea de investigación, no que se probó que era falsa. Solo el marcado como "Risky" tiene impacto en el score porque refleja riesgo activo no testeado.

---

## Flujo 6 — Reset a datos de demostración

```
Founder hace clic en [Reset to Demo]
  → setState(mockWorkspace)
  → interviewScript = null
  → selectedPersonaId = null
  → agentState.isMockActive = false
  → DynamicWorkspace → remonta los cinco componentes con datos mock
  → InterviewScriptPanel desaparece
  → Sin llamada a Gemini
  → Sin latencia
```

Este flujo es crítico para la demo en vivo. Permite resetear el workspace en un clic y repetir el demo script desde cero sin recargar la página.

---

## Mapa completo de interacciones entre componentes

```
                        ┌─────────────────────────────┐
                        │         useCoAgent           │
                        │   (estado compartido global) │
                        └──────────────┬──────────────┘
                                       │ lee / escribe
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
        ┌──────────┐          ┌────────────────┐       ┌──────────────────┐
        │LeftPanel │          │DynamicWorkspace│       │AgentControlPanel │
        │          │          │                │       │                  │
        │ escribe: │          │ monta según    │       │ lee:             │
        │ idea     │          │ components[]   │       │ agentState       │
        │ region   │          │ del agente     │       │                  │
        │ model    │          │                │       │ dispara:         │
        │ goal     │          └───────┬────────┘       │ Loop 3           │
        │          │                  │                │ tool calls       │
        │ dispara: │          ┌───────▼────────┐       └──────────────────┘
        │ Generate │          │                │
        │ Reset    │          │  componentRegistry
        └──────────┘          │                │
                              ├─ StartupSnapshotCard ← lee: snapshot
                              ├─ PersonaCards        ← lee: personas, selectedPersonaId
                              │                        dispara: Loop 1
                              ├─ AssumptionMap       ← lee: assumptions
                              │                        dispara: Loop 2 (client + agent)
                              ├─ ExperimentList      ← lee: experiments
                              ├─ ValidationScorecard ← lee: scorecard.dimensions
                              │                        computa: overallScore client-side
                              └─ InterviewScriptPanel ← lee: interviewScript
                                                        solo cuando ≠ null
```

---

## Mapa de quién llama a Gemini y cuándo

| Evento del founder | Componente que dispara | Prompt enviado | Campos actualizados por Gemini |
|---|---|---|---|
| Escribe idea en textarea | `LeftPanel` | — | Ninguno (habilita el botón, nada más) |
| Clic en "Generate Workspace" | `LeftPanel` | `GENERATE_WORKSPACE_PROMPT` | Todo el workspace |
| Clic en "Select as ICP" | `PersonaCards` | `UPDATE_ON_PERSONA_PROMPT` | snapshot, assumptions, experiments, scorecard (parcial), agentState |
| Clic en "Mark Risky" | `AssumptionMap` | `UPDATE_ON_RISKY_ASSUMPTION_PROMPT` | Un nuevo experimento + agentState |
| Clic en "Generate Interview Script" | `AgentControlPanel` | `GENERATE_INTERVIEW_SCRIPT_PROMPT` | Solo `interviewScript` |
| Clic en "Mark Validated" | `AssumptionMap` | — | Ninguno (client-side) |
| Clic en "Mark Invalidated" | `AssumptionMap` | — | Ninguno (client-side) |
| Clic en "Reset" | `LeftPanel` | — | Ninguno (workspace vacío) |

---

## Qué pasa con la latencia en cada flujo

```
Evento                          │ Feedback inmediato (< 100ms)       │ Feedback diferido (2–8s)
────────────────────────────────┼────────────────────────────────────┼──────────────────────────
Escribe idea en textarea        │ Botón "Generate" se habilita        │ (sin llamada al modelo)
Generate Workspace              │ Todos los skeletons aparecen        │ Workspace real sustituye skeletons
Select as ICP                   │ Card resaltada (optimistic)          │ Workspace actualizado alrededor del ICP
Mark Risky                      │ Badge rojo + score baja al instante │ Nuevo experimento aparece arriba
Mark Validated / Invalidated    │ Badge color + score (si aplica)     │ (sin llamada al modelo)
Generate Interview Script       │ Skeleton al fondo del workspace      │ InterviewScriptPanel montado
Reset                           │ Workspace vacío restaurado           │ (sin llamada al modelo)
```

---

## Flujo de fallback — cuando algo falla

En cualquier error de red, JSON inválido o timeout, el sistema activa el fallback silenciosamente:

```
Error o timeout en cualquier llamada a Gemini
  │
  ├─ parseWorkspaceSafely captura el error
  │   → setState(mockWorkspace)
  │   → agentState.isMockActive = true
  │
  ├─ AgentControlPanel muestra badge "demo mode"
  │
  ├─ El workspace sigue siendo completamente interactivo
  │   (todos los loops funcionan con datos mock)
  │
  └─ La demo continúa sin interrupciones
```

El founder (o el juez en la demo) nunca ve una pantalla rota, un componente vacío, ni un error en la UI. El sistema degrada de forma controlada y silenciosa.

---

## Resumen del flujo completo en una línea por paso

```
0. App carga         → interfaz vacía, workspace en blanco, botón deshabilitado
1. Founder escribe   → idea en textarea → botón "Generate" se habilita
2. Founder genera    → skeletons + llamada a Gemini + workspace real
3. Elige ICP         → optimistic highlight + Gemini + workspace reorientado
4. Marca riesgo      → badge rojo + score instantáneo + Gemini + nuevo experimento
5. Genera script     → skeleton al fondo + Gemini + nuevo componente montado
6. Valida/Invalida   → badge + score (sin Gemini)
7. Reset             → workspace vacío restaurado (sin Gemini)
```

Siete pasos. El primero es siempre el founder escribiendo su idea — nada existe antes de eso. Cuatro llamadas a Gemini. Dos operaciones puramente client-side. Un workspace que crece en runtime sin recargar la página.