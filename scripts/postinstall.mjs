/**
 * Run `install:agent` (uv sync) after npm install when `uv` is available.
 * Skip when explicitly opted out or when `uv` is missing (e.g. frontend-only Docker/Vercel image).
 */
import { spawnSync } from "node:child_process";

const shell = process.platform === "win32";

if (
  process.env.VERCEL === "1" ||
  process.env.SKIP_INSTALL_AGENT === "1" ||
  process.env.SKIP_POSTINSTALL_AGENT === "1"
) {
  process.exit(0);
}

const uvOk = spawnSync("uv", ["--version"], {
  stdio: "ignore",
  shell,
});
if (typeof uvOk.status !== "number" || uvOk.status !== 0) {
  console.warn(
    "postinstall: skipping install:agent (uv not in PATH). For local Python agent deps, install uv and run: npm run install:agent",
  );
  process.exit(0);
}

const r = spawnSync("npm", ["run", "install:agent"], {
  stdio: "inherit",
  shell,
});

process.exit(typeof r.status === "number" ? r.status : 1);
