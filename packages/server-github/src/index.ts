#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/github",
  version: "0.8.1",
  instructions:
    "Structured GitHub operations (PRs, issues, actions runs) via gh CLI. Returns typed JSON.",
  registerTools: registerAllTools,
});
