#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/swift",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Swift operations (build, test, run, package resolve/update/show-dependencies/clean/init). Returns typed JSON.",
  registerTools: registerAllTools,
});
