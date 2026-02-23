#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/swift",
  version: "0.11.0",
  instructions:
    "Structured Swift operations (build, test, run, package resolve/update/show-dependencies/clean/init). Returns typed JSON.",
  registerTools: registerAllTools,
});
