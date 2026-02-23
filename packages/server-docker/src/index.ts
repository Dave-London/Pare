#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/docker",
  version: "0.8.1",
  instructions:
    "Structured Docker operations (ps, build, logs, images, run, exec, compose-up, compose-down, compose-build, pull). Returns typed JSON with structured container, image, and build data.",
  registerTools: registerAllTools,
});
