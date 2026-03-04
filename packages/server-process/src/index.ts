#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/process",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured process execution (run, reload). Runs commands with timeout, environment, and signal support. Returns typed JSON with exit code, stdout, stderr, duration, and timeout status.",
  registerTools: registerAllTools,
});
