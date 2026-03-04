#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/bun",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Bun runtime operations (run, test, build, install, add, remove, outdated, pm-ls). Returns typed JSON.",
  registerTools: registerAllTools,
});
