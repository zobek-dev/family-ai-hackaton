/**
 * Gemini often sends `updateWorkspace({ workspace: "<escaped JSON string>" })`.
 * That string may include fences, trailing commas, preamble text, double-encoded JSON,
 * or LLM "JSON dialect" quirks (single quotes, unescaped newlines/tabs in strings,
 * unquoted keys, JS comments). We try strict `JSON.parse` first, then fall back to
 * `jsonrepair` which is purpose-built for LLM output.
 */
import { jsonrepair } from "jsonrepair";

function stripBomAndFences(s: string): string {
  return s
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function normalizeTypography(s: string): string {
  return s
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

/** Outermost balanced `{ ... }`, respecting `"` strings (standard JSON). */
function extractBalancedObjectSubstring(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const c = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }

  return null;
}

function dropTrailingCommas(jsonish: string): string {
  return jsonish.replace(/,(\s*[\]}])/g, "$1");
}

function normalizeTrailingCommas(s: string): string {
  let cur = s;
  for (let i = 0; i < 12; i++) {
    const next = dropTrailingCommas(cur);
    if (next === cur) break;
    cur = next;
  }
  return cur;
}

function parseOnce(candidate: string): unknown {
  return JSON.parse(candidate);
}

function tryRepairAndParse(candidate: string): unknown {
  // jsonrepair handles: trailing commas, single quotes, unquoted keys,
  // unescaped newlines/tabs in strings, JS comments, ellipsis tokens,
  // truncated payloads (best-effort), Python True/False/None, etc.
  // It throws JSONRepairError when even repair can't make sense of it.
  return JSON.parse(jsonrepair(candidate));
}

/**
 * Parse tool/workspace JSON string into a workspace-shaped object, or null.
 */
export function parseWorkspaceJsonString(
  raw: string,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 5) return null;

  const trimmed = normalizeTypography(stripBomAndFences(raw));
  const slabs = [trimmed, extractBalancedObjectSubstring(trimmed) ?? ""].filter(
    Boolean,
  );

  for (const base of slabs) {
    let pass = normalizeTrailingCommas(base);
    for (let round = 0; round < 10; round++) {
      try {
        const v = parseOnce(pass);
        if (typeof v === "string") {
          return parseWorkspaceJsonString(normalizeTypography(v), depth + 1);
        }
        if (v && typeof v === "object" && !Array.isArray(v)) {
          return v as Record<string, unknown>;
        }
      } catch {
        pass = normalizeTrailingCommas(dropTrailingCommas(pass));
      }
    }
  }

  for (const base of slabs) {
    try {
      const v = tryRepairAndParse(base);
      if (typeof v === "string") {
        return parseWorkspaceJsonString(normalizeTypography(v), depth + 1);
      }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return v as Record<string, unknown>;
      }
    } catch {
      /* try next slab */
    }
  }

  return null;
}
