#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/make",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Make/Just task runner operations (run, list). Auto-detects make vs just. Returns typed JSON.",
  registerTools: registerAllTools,
});
