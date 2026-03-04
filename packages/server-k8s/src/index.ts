#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/k8s",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Kubernetes kubectl and Helm operations (get, describe, logs, apply, helm). Returns typed JSON.",
  registerTools: registerAllTools,
});
