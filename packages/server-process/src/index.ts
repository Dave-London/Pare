#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/process",
  version: "0.8.1",
  instructions:
    "Structured process execution (run, reload). Runs commands with timeout, environment, and signal support. Returns typed JSON with exit code, stdout, stderr, duration, and timeout status.",
  registerTools: registerAllTools,
});
