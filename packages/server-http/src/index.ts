#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/http",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured HTTP request operations via curl (request, get, post, head). Returns typed JSON with status, headers, body, timing, and size.",
  registerTools: registerAllTools,
});
