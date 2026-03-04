#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/cargo",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Rust/Cargo operations (build, test, clippy, run, add, remove, fmt, doc, check). Returns typed JSON with structured compiler errors, test results, lint warnings, and dependency management output.",
  registerTools: registerAllTools,
});
