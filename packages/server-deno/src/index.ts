#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/deno",
  version: "0.1.0",
  instructions:
    "Structured Deno runtime operations (run, test, fmt, lint, check, task, info). Returns typed JSON.",
  registerTools: registerAllTools,
});
