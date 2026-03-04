#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/dotnet",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured .NET CLI operations (build, test, run, publish, restore, clean, add-package, list-package). Returns typed JSON with significantly fewer tokens than raw CLI output.",
  registerTools: registerAllTools,
});
