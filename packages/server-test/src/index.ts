#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/test",
  version: "0.8.1",
  instructions:
    "Structured test runner operations (run, coverage). Auto-detects pytest, jest, vitest, and mocha. Returns typed JSON with structured pass/fail results and failure details.",
  registerTools: registerAllTools,
});
