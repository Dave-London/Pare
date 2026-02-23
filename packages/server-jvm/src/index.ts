#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/jvm",
  version: "0.1.0",
  instructions:
    "Structured JVM build tool operations (Gradle, Maven). Run builds, tests, list tasks, show dependencies. Returns typed JSON.",
  registerTools: registerAllTools,
});
