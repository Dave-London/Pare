#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/python",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Python tool operations (pip install, mypy, ruff, pip-audit, pytest, uv, black). Returns typed JSON with structured type errors, lint violations, vulnerability data, test results, and formatting status.",
  registerTools: registerAllTools,
});
