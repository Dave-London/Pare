#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/python",
  version: "0.8.1",
  instructions:
    "Structured Python tool operations (pip install, mypy, ruff, pip-audit, pytest, uv, black). Returns typed JSON with structured type errors, lint violations, vulnerability data, test results, and formatting status.",
  registerTools: registerAllTools,
});
