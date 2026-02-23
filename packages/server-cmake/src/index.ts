#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/cmake",
  version: "0.10.2",
  instructions:
    "Structured CMake build system operations (configure, build, test, list-presets, install, clean). Returns typed JSON.",
  registerTools: registerAllTools,
});
