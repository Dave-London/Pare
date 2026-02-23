#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/nix",
  version: "0.11.0",
  instructions:
    "Structured Nix operations (build, run, develop, shell, flake show/check/update). Returns typed JSON.",
  registerTools: registerAllTools,
});
