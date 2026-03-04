#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/search",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured code search operations (ripgrep + fd). Returns typed JSON with match locations, file lists, and match counts.",
  registerTools: registerAllTools,
});
