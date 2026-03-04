#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/ruby",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured Ruby & Bundler operations (run, check, gem-list, gem-install, gem-outdated, bundle-install, bundle-exec, bundle-check). Returns typed JSON.",
  registerTools: registerAllTools,
});
