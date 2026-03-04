#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/security",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured security scanning operations (trivy, semgrep, gitleaks). Returns typed JSON with vulnerability and finding data.",
  registerTools: registerAllTools,
});
