#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/github",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured GitHub operations (PRs, issues, actions runs) via gh CLI. Returns typed JSON.",
  registerTools: registerAllTools,
});
