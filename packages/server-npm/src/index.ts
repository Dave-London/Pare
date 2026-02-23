#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/npm",
  version: "0.8.1",
  instructions:
    "Structured npm/pnpm operations (install, audit, outdated, list, run, test, init). Returns typed JSON with structured dependency, vulnerability, and script execution data.",
  registerTools: registerAllTools,
});
