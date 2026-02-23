#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/k8s",
  version: "0.8.1",
  instructions:
    "Structured Kubernetes kubectl and Helm operations (get, describe, logs, apply, helm). Returns typed JSON.",
  registerTools: registerAllTools,
});
