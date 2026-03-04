#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/bazel",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Bazel build system operations (build, test, query, info, run, clean, fetch). Returns typed JSON.",
  registerTools: registerAllTools,
});
