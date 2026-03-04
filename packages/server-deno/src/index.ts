#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/deno",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Deno runtime operations (run, test, fmt, lint, check, task, info). Returns typed JSON.",
  registerTools: registerAllTools,
});
