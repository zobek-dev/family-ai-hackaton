import { serve } from "@hono/node-server";
import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

const intelligence = new CopilotKitIntelligence({
  apiKey:
    process.env.INTELLIGENCE_API_KEY ?? "cpk_sPRVSEED_seed0privat0longtoken00",
  apiUrl: process.env.INTELLIGENCE_API_URL ?? "http://localhost:4203",
  wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL ?? "ws://localhost:4403",
});

const defaultLangGraphAssistantConfig = {
  recursion_limit: Number(process.env.LANGGRAPH_RECURSION_LIMIT ?? 60),
};

const agent = new LangGraphAgent({
  deploymentUrl:
    process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:8133",
  graphId: "default",
  langsmithApiKey: process.env.LANGSMITH_API_KEY ?? "",
  // 60 (vs LangGraph default 25) leaves headroom for the deepagents planner
  // loop on multi-step turns like "draft email + queue".
  assistantConfig: defaultLangGraphAssistantConfig,
});

const idealensAgent = new LangGraphAgent({
  deploymentUrl:
    process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:8133",
  graphId: "idealens",
  langsmithApiKey: process.env.LANGSMITH_API_KEY ?? "",
  assistantConfig: defaultLangGraphAssistantConfig,
});

const mcpAppsEnabled =
  process.env.ENABLE_MCP_APPS === "true" || process.env.ENABLE_MCP_APPS === "1";

/** Intelligence runs a tiny LLM pass to name new threads; IdeaLens-style prompts often fail JSON shaping → noisy retries → "Untitled". */
const generateThreadNames =
  process.env.COPILOTKIT_GENERATE_THREAD_NAMES !== "false" &&
  process.env.COPILOTKIT_GENERATE_THREAD_NAMES !== "0";

const app = createCopilotEndpoint({
  basePath: "/api/copilotkit",
  runtime: new CopilotRuntime({
    intelligence,
    identifyUser: () => ({ id: "default", name: "Hackathon User" }),
    licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
    agents: { default: agent, idealens: idealensAgent },
    openGenerativeUI: true,
    a2ui: { injectA2UITool: false },
    generateThreadNames,
    ...(mcpAppsEnabled
      ? {
          mcpApps: {
            servers: [
              {
                type: "http" as const,
                url:
                  process.env.MCP_SERVER_URL || "http://localhost:3001/mcp",
                serverId: "manufact_local",
              },
            ],
          },
        }
      : {}),
  }),
});

if (mcpAppsEnabled) {
  console.log(
    `[bff] MCP apps ON → ${process.env.MCP_SERVER_URL ?? "http://localhost:3001/mcp"}`,
  );
} else {
  console.log(
    "[bff] MCP apps OFF — set ENABLE_MCP_APPS=true when using npm run dev:mcp / dev:full",
  );
}

if (!generateThreadNames) {
  console.log(
    "[bff] COPILOTKIT_GENERATE_THREAD_NAMES disabled — new threads stay unnamed until renamed",
  );
}

// Rewrite known 5xx error bodies into structured `{ error, hint, command }`
// payloads the UI can render as actionable toasts. Conservative matching —
// we only remap when we can identify the failure from the body, so unknown
// 5xx errors fall through unchanged.
app.use("*", async (c, next) => {
  await next();
  const status = c.res.status;
  if (status < 500 || status > 599) return;
  const cloned = c.res.clone();
  const ctype = cloned.headers.get("content-type") || "";
  if (!ctype.includes("json") && !ctype.includes("text")) return;
  let body: string;
  try {
    body = await cloned.text();
  } catch {
    return;
  }
  const isThreadFkey =
    body.includes("threads_user_id_fkey") ||
    (body.includes("Failed to initialize thread") &&
      body.includes("user_id"));
  if (isThreadFkey) {
    const remapped = {
      error: "Postgres user seed missing",
      hint: "Run `npm run seed` to seed the default user, then retry.",
      command: "npm run seed",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }

  // AgentThreadLockedError: a prior run errored mid-stream and the LangGraph
  // SDK's per-thread lock didn't release. The thread is unrecoverable; the
  // hint tells the user to start a new conversation.
  const isThreadLocked =
    body.includes("AgentThreadLockedError") ||
    /Thread\s+[0-9a-f-]{36}\s+is locked/i.test(body);
  if (isThreadLocked) {
    const remapped = {
      error: "Thread is locked",
      hint:
        "A previous turn errored mid-stream and didn't release the run " +
        "lock. Start a new conversation (sidebar → +) to continue.",
      command: "new-thread",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }
});

const port = Number(process.env.PORT) || 4000;

const hostname =
  typeof process.env.HOST === "string" && process.env.HOST.trim() !== ""
    ? process.env.HOST.trim()
    : undefined;

const listenOpts =
  hostname !== undefined
    ? { fetch: app.fetch, port, hostname }
    : { fetch: app.fetch, port };

serve(listenOpts, () => {
  console.log(`BFF ready at http://${hostname ?? "localhost"}:${port}`);
});
