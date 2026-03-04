#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/npm",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured npm/pnpm operations (install, audit, outdated, list, run, test, init). Returns typed JSON with structured dependency, vulnerability, and script execution data.",
  registerTools: registerAllTools,
});
