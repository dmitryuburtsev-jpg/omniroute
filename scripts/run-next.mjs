#!/usr/bin/env node

import {
  normalizeNodeEnvForMode,
  resolveRuntimePorts,
  withRuntimePortEnv,
  spawnWithForwardedSignals,
} from "./runtime-env.mjs";
import { bootstrapEnv } from "./bootstrap-env.mjs";

const mode = process.argv[2] === "start" ? "start" : "dev";

// Load .env / server.env first so PORT / DASHBOARD_PORT from files affect --port below.
const { env, droppedNodeEnv } = normalizeNodeEnvForMode(bootstrapEnv(), mode);
if (droppedNodeEnv) {
  console.log(
    `[run-next] Ignoring NODE_ENV=${droppedNodeEnv} for \`next dev\` (Next.js requires development).`
  );
}
const runtimePorts = resolveRuntimePorts(env);
const { dashboardPort } = runtimePorts;

const args = ["./node_modules/next/dist/bin/next", mode, "--port", String(dashboardPort)];
// Default: use webpack (stable). Set OMNIROUTE_USE_TURBOPACK=1 in .env for Turbopack (faster dev).
// Must read merged `env` from bootstrap — .env is not applied to process.env in the launcher.
if (mode === "dev" && env.OMNIROUTE_USE_TURBOPACK !== "1") {
  args.splice(2, 0, "--webpack");
}

spawnWithForwardedSignals(process.execPath, args, {
  stdio: "inherit",
  env: withRuntimePortEnv(env, runtimePorts),
});
