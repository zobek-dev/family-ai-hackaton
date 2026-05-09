# IdeaLens · espacio interactivo de validación para ideas de startup

Repositorio del hackathon **Generative UI Global Hackathon: Agentic Interfaces**, adaptado a **IdeaLens**: una app donde un agente convierte una idea en borrador en un **workspace visual** actualizable en tiempo real (snapshot, personas, mapa de supuestos, experimentos, scorecard y panel de script de entrevista), en lugar de limitarse al chat.

Pitch en una línea:

> **El agente no solo está dentro de la app: moldea la superficie.**

![Hackathon Banner](apps/frontend/public/banner.jpg)

---

## Qué incluye esta versión

- **Workspace generativo.** El modelo devuelve estructuras tipadas (`workspace`/componentes) que el frontend renderiza con una **registro de componentes** controlado (controlled generative UI), no HTML arbitrario.
- **Bucles agenticos por UI.** Acciones como “seleccionar ICP”, “marcar supuesto arriesgado” o “generar guion de entrevista” actualizan el estado compartido y disparan nueva generación donde hace falta.
- **Hilos persistentes.** CopilotKit Intelligence (Postgres + gateway) conserva conversaciones nombradas; el flujo típico levanta `npm run dev` con Docker para la infra del Intelligence.
- **Agente LangGraph en Python.** La lógica IdeaLens vive en `apps/agent/` (prompts y runtime acoplados al workspace); el BFF (`apps/bff`) enruta al despliegue local de LangGraph.
- **Notion leads (opcional).** Variables `NOTION_*` en `.env`; si no están, el chequeo previo permite seguir solo con Gemini y IdeaLens (`scripts/check-env.sh` trata Notion como opcional cuando faltan credenciales).

---

## Stack (resumen)

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js (`/idealens`), Radix/Tailwind, CopilotKit v2 (`useAgent`, herramientas de frontend) |
| API / runtime chat | Hono (`apps/bff`), `CopilotRuntime`, enlace al agente LangGraph |
| Agente | LangGraph (`langgraph dev` en `:8133`), Gemini por defecto (ver `apps/agent/.env.example`) |
| Intelligence | Postgres, Redis y servicios CopilotKit vía Docker (`deployment/docker-compose.yml`) |

Referencias del kit original: [CopilotKit](https://docs.copilotkit.ai), [LangGraph](https://github.com/langchain-ai/langgraph), [Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview) (si tu runtime usa ese camino).

---

## Cómo ejecutarlo en local

1. **CopilotKit Intelligence (una vez)**  
   `npx @copilotkit/cli@latest init` y elige **Intelligence** si aún no generaste proyecto/licencia para hilos locales.

2. **Variables de entorno**  
   - Copiar `.env.example` → `.env` en la raíz y `apps/agent/.env.example` → `apps/agent/.env`.  
   - Poner `GEMINI_API_KEY` real en **ambos** (y `COPILOTKIT_LICENSE_TOKEN` según `npm run license`).  
   - Notion solo si vas a usar el demo de leads: `NOTION_TOKEN` + `NOTION_LEADS_DATABASE_ID`. Detalle histórico en [dev-docs/setup.md](dev-docs/setup.md).

3. **Arranque**

   ```bash
   npm install
   npm run dev
   ```

   `predev` ejecuta `scripts/check-env.sh`: Docker activo, clave Gemini no “stub”, y Notion solo si configuraste ambas variables.

4. **Demo IdeaLens**  
   Abre el frontend (puerto habitual del workspace de Next) en **`/idealens`**. Documentación funcional y de implementación: [docs/IDEALENS_MVP_SPEC.md](docs/IDEALENS_MVP_SPEC.md) y [docs/idealens-implementation.md](docs/idealens-implementation.md).

Comandos adicionales del monorepo: `npm run dev:full` (incluye servidor MCP opcional si lo usáis). Despliegue Docker completo: `npm run deploy:docker` y [deployment/docker-compose-stack.env.example](deployment/docker-compose-stack.env.example).

---

## Generative UI (contexto)

Este proyecto encaja el espectro CopilotKit: **componentes controlados** en el workspace IdeaLens (el agente elige tipo + props dentro de un catálogo acotado). El kit de partida también podía combinar A2UI, MCP Apps y canvas de leads; la adaptación actual centra el producto en **IdeaLens**. Más lectura: [Generative UI en CopilotKit](https://docs.copilotkit.ai/generative-ui).

---

## Documentación

- **IdeaLens:** [docs/IDEALENS_MVP_SPEC.md](docs/IDEALENS_MVP_SPEC.md) · [docs/idealens-implementation.md](docs/idealens-implementation.md) · [docs/COMPONENTS.md](docs/COMPONENTS.md) · [docs/FLOW.md](docs/FLOW.md)
- **Kit / operación:** [dev-docs/setup.md](dev-docs/setup.md) · [dev-docs/architecture.md](dev-docs/architecture.md) · [dev-docs/model-switching.md](dev-docs/model-switching.md) · [dev-docs/troubleshooting.md](dev-docs/troubleshooting.md)

## Skills para agentes de código

Siguen disponibles en `.claude/skills/`, `.cursor/skills-cursor/` (Cursor) y convenciones en `.agent/`: CopilotKit, MCP / mcp-use, etc. Actualizar skills CopilotKit: `npx skills add copilotkit/skills --full-depth -y`.

## Licencia

MIT.

---

> Proyecto original: *Generative UI Global Hackathon: Agentic Interfaces*. Evolución en este repo: **IdeaLens** (validación de ideas con interfaz generada por el agente).
