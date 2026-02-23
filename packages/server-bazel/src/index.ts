#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/bazel",
  version: "0.10.2",
  instructions:
    "Structured Bazel build system operations (build, test, query, info, run, clean, fetch). Returns typed JSON.",
  registerTools: registerAllTools,
});
