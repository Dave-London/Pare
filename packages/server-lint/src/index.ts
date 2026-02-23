#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/lint",
  version: "0.8.1",
  instructions:
    "Structured linting and formatting operations (ESLint, Prettier, Biome). Returns typed JSON with structured violation details and counts.",
  registerTools: registerAllTools,
});
