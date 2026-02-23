#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/git",
  version: "0.8.1",
  instructions:
    "Structured git operations (status, log, diff, branch, show, add, commit, push, pull, checkout). Returns typed JSON with significantly fewer tokens than raw CLI output.",
  registerTools: registerAllTools,
});
