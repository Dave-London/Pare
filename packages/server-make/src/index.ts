#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/make",
  version: "0.8.1",
  instructions:
    "Structured Make/Just task runner operations (run, list). Auto-detects make vs just. Returns typed JSON.",
  registerTools: registerAllTools,
});
