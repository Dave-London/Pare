#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/cmake",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured CMake build system operations (configure, build, test, list-presets, install, clean). Returns typed JSON.",
  registerTools: registerAllTools,
});
