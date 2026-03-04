#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/remote",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured remote operations (SSH, rsync). Run commands on remote hosts, test connectivity, scan host keys, and sync files. Returns typed JSON.",
  registerTools: registerAllTools,
});
