#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/jvm",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured JVM build tool operations (Gradle, Maven). Run builds, tests, list tasks, show dependencies. Returns typed JSON.",
  registerTools: registerAllTools,
});
