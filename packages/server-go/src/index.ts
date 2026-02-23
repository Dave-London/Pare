#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/go",
  version: "0.8.1",
  instructions:
    "Structured Go toolchain operations (build, test, vet, run, mod-tidy, fmt, generate). Returns typed JSON with structured compiler errors, test results, vet warnings, run output, and more.",
  registerTools: registerAllTools,
});
