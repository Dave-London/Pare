#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/db",
  version: "0.1.0",
  instructions:
    "Structured database CLI operations (psql, mysql, redis-cli, mongosh). Returns typed JSON with query results, server info, and connectivity status.",
  registerTools: registerAllTools,
});
