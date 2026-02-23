#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/remote",
  version: "0.1.0",
  instructions:
    "Structured remote operations (SSH, rsync). Run commands on remote hosts, test connectivity, scan host keys, and sync files. Returns typed JSON.",
  registerTools: registerAllTools,
});
