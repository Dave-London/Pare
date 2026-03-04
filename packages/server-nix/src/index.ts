#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/nix",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Nix operations (build, run, develop, shell, flake show/check/update). Returns typed JSON.",
  registerTools: registerAllTools,
});
