#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/ruby",
  version: "0.1.0",
  instructions:
    "Structured Ruby & Bundler operations (run, check, gem-list, gem-install, gem-outdated, bundle-install, bundle-exec, bundle-check). Returns typed JSON.",
  registerTools: registerAllTools,
});
