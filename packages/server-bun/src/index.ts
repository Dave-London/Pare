#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/bun",
  version: "0.1.0",
  instructions:
    "Structured Bun runtime operations (run, test, build, install, add, remove, outdated, pm-ls). Returns typed JSON.",
  registerTools: registerAllTools,
});
