#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/build",
  version: "0.8.1",
  instructions:
    "Structured build tool operations (tsc, esbuild, vite, webpack, generic build). Returns typed JSON with structured error diagnostics and build results.",
  registerTools: registerAllTools,
});
