#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/cargo",
  version: "0.8.1",
  instructions:
    "Structured Rust/Cargo operations (build, test, clippy, run, add, remove, fmt, doc, check). Returns typed JSON with structured compiler errors, test results, lint warnings, and dependency management output.",
  registerTools: registerAllTools,
});
