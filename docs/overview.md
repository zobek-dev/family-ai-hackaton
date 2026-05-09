# Family AI — Documentación General

## ¿Qué es este proyecto?

Starter kit de hackathon construido con CopilotKit v2. Es una aplicación de IA donde un agente puede ver y manipular un "canvas" (tablero visual) en tiempo real mientras el usuario chatea con él.

Caso de uso concreto: gestión de leads de un workshop de IA, integrado con Notion.

---

## Arquitectura

```
BROWSER (localhost:3010)
    ↓  /api/copilotkit  (proxy Next.js)
BFF - Hono (localhost:4000)
    ↓  LangGraph agent connector
AGENT - Python/LangGraph (localhost:8133)
    ↓  herramientas, Notion MCP, canvas state
INFRA - Docker (Postgres :5433, Redis :6381, Intelligence :4203)
```

### 1. Frontend — `apps/frontend/`

Next.js 15 + React 19. Tablero visual de leads (Kanban + stats + chat). Usa CopilotKit hooks para compartir estado con el agente. Cuando el agente ejecuta una herramienta como `setLeads`, el canvas se actualiza en tiempo real en el browser.

### 2. BFF — `apps/bff/`

Hono + CopilotRuntime. Intermediario necesario porque CopilotKit bundlea Express y no puede correr dentro de Next.js App Router. Conecta el frontend con el agente LangGraph y con el Intelligence (threads persistentes).

### 3. Agent — `apps/agent/`

Python + LangGraph Deep Agents. Usa Gemini Flash-Lite por defecto (configurable). Puede:
- Leer y escribir leads en Notion vía MCP
- Mutar el canvas del frontend (filtros, highlights, tarjetas)
- Persistir conversaciones en Postgres via CopilotKit Intelligence

### 4. MCP Server — `apps/mcp/`

Expone el mismo agente como servidor MCP para usarse en Claude Desktop o ChatGPT, sin necesitar el frontend Next.js.

---

## Flujo de una interacción

```
Usuario escribe "tráeme los leads de Notion"
  → Next.js proxy → BFF (Hono :4000)
  → BFF llama al Agent en :8133
  → Agent planifica pasos (Deep Agent)
  → Agent llama a Notion MCP (npx @notionhq/notion-mcp-server)
  → Notion devuelve leads
  → Agent llama herramienta "setLeads" del canvas
  → Canvas del browser se actualiza en tiempo real
  → Thread se guarda en Postgres (persiste entre sesiones)
```

---

## Stack tecnológico

| Capa      | Tecnología                                                          |
|-----------|---------------------------------------------------------------------|
| Frontend  | Next.js 15, React 19, CopilotKit v2, Radix UI, Recharts, Tailwind 4 |
| BFF       | Hono, CopilotRuntime v2                                             |
| Agent     | Python, LangGraph, LangChain Deep Agents, Gemini Flash-Lite         |
| MCP       | mcp-use framework, TypeScript                                       |
| Infra     | Docker — Postgres 16, Redis 7, CopilotKit Intelligence              |
| Externo   | Notion API, Gemini API (o Claude como alternativa)                  |

---

## Estructura del proyecto

```
family-ai/
├── apps/
│   ├── frontend/          # Next.js 15 — canvas + chat UI
│   ├── bff/               # Hono — CopilotRuntime + LangGraph connector
│   ├── agent/             # Python — LangGraph Deep Agent + Notion MCP
│   └── mcp/               # mcp-use — MCP server para Claude/ChatGPT
├── deployment/
│   └── docker-compose.yml # Postgres, Redis, Intelligence composite
├── scripts/               # check-env, seed, ensure-databases
├── dev-docs/              # Documentación técnica detallada (en inglés)
├── docs/                  # Documentación general (este folder)
├── data/                  # CSV de leads de ejemplo para Notion
└── .env.example           # Variables de entorno requeridas
```

---

## Variables de entorno requeridas

```bash
# LLM principal
GEMINI_API_KEY=            # desde aistudio.google.com

# CopilotKit (threads persistentes)
COPILOTKIT_LICENSE_TOKEN=  # desde la CLI: npx @copilotkit/cli license

# Notion (opcional, hay datos de fallback)
NOTION_TOKEN=
NOTION_LEADS_DATABASE_ID=

# Alternativa: usar Claude en vez de Gemini
AGENT_RUNTIME=claude-sonnet-4-6-react
ANTHROPIC_API_KEY=

# Observabilidad opcional
LANGSMITH_API_KEY=
```

---

## Cómo correr localmente

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Completar GEMINI_API_KEY y COPILOTKIT_LICENSE_TOKEN como mínimo

# 2. Validar prerequisitos
npm run check-env

# 3. Arrancar todo (infra Docker + frontend + BFF + agent)
npm run dev

# 4. Opcional: incluir el MCP server
npm run dev:full

# 5. Abrir en el browser
# http://localhost:3010/leads
```

---

## Cambiar el modelo LLM

En `.env`, cambiar `AGENT_RUNTIME`:

| Valor                    | Modelo                          |
|--------------------------|---------------------------------|
| `gemini-flash-deep`      | Gemini Flash-Lite (por defecto) |
| `gemini-flash-react`     | Gemini Flash ReAct              |
| `claude-sonnet-4-6-react`| Claude Sonnet 4.6 (requiere `ANTHROPIC_API_KEY`) |

---

## Despliegue

El proyecto no tiene CI/CD configurado. Tres opciones principales:

### Opción A — Vercel + servicios cloud (recomendada para MVP)

| Servicio   | Plataforma                                   |
|------------|----------------------------------------------|
| Frontend   | Vercel (soporte nativo Next.js)              |
| BFF        | Vercel Serverless / Railway / Render         |
| Agent      | Railway, Render o Fly.io (contenedor Python) |
| Postgres   | Supabase o Railway Postgres                  |
| Redis      | Upstash Redis                                |
| Intelligence | CopilotKit Intelligence cloud              |

### Opción B — Docker Compose en VPS

Un servidor (VPS, EC2, etc.) con Docker Compose y todos los servicios en contenedores. Nginx como reverse proxy.

### Opción C — Solo MCP Server (más liviano)

Si solo se necesita el agente sin el frontend:

```bash
npm run -w mcp deploy
# Publica en: https://<slug>.run.mcp-use.com/mcp
# Usable directamente desde Claude Desktop o ChatGPT
```

---

## Modelo de datos — Lead

```typescript
{
  id: string                  // Notion page ID
  name: string
  company: string
  email: string
  role: string
  phone?: string
  source?: string             // Website | LinkedIn | Referral | Event | ...
  technical_level: string     // Non-technical | Some technical | Developer | Advanced
  interested_in: string[]
  tools: string[]             // CopilotKit | LangChain | Anthropic | ...
  workshop: string            // Agentic UI | MCP Apps | RAG & Data Chat | ...
  status: string              // Not started | In progress | Done
  opt_in: boolean
  message: string
  submitted_at: string        // ISO timestamp
}
```

---

## Canvas State — lo que el agente comparte con el frontend

```typescript
{
  leads: Lead[]
  filter: {
    workshops: string[]
    technical_levels: string[]
    tools: string[]
    opt_in: 'any' | 'yes' | 'no'
    search: string
  }
  highlightedLeadIds: string[]
  selectedLeadId: string | null
  header: { title: string, subtitle: string }
  sync: { databaseId: string, databaseTitle: string, syncedAt: string }
}
```

---

## Documentación técnica adicional

En `dev-docs/` se encuentra documentación más detallada en inglés:

- `architecture.md` — Diagramas de secuencia y flujos detallados
- `setup.md` — Prerequisitos paso a paso
- `model-switching.md` — Cómo cambiar de LLM
- `mcp-server.md` — Desarrollo y despliegue del MCP server
- `customization.md` — Cómo extender el canvas y las herramientas
- `threads.md` — Cómo funciona la persistencia de conversaciones
- `demo-prompts.md` — Prompts de ejemplo para probar la app
- `troubleshooting.md` — Problemas comunes y soluciones
