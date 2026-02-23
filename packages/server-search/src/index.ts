#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/search",
  version: "0.8.1",
  instructions:
    "Structured code search operations (ripgrep + fd). Returns typed JSON with match locations, file lists, and match counts.",
  registerTools: registerAllTools,
});
