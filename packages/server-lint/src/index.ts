#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/lint",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured linting and formatting operations (ESLint, Prettier, Biome). Returns typed JSON with structured violation details and counts.",
  registerTools: registerAllTools,
});
