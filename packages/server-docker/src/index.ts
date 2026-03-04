#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/docker",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Docker operations (ps, build, logs, images, run, exec, compose-up, compose-down, compose-build, pull). Returns typed JSON with structured container, image, and build data.",
  registerTools: registerAllTools,
});
