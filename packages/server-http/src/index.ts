#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/http",
  version: "0.8.1",
  instructions:
    "Structured HTTP request operations via curl (request, get, post, head). Returns typed JSON with status, headers, body, timing, and size.",
  registerTools: registerAllTools,
});
