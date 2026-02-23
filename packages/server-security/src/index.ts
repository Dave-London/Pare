#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/security",
  version: "0.1.0",
  instructions:
    "Structured security scanning operations (trivy, semgrep, gitleaks). Returns typed JSON with vulnerability and finding data.",
  registerTools: registerAllTools,
});
