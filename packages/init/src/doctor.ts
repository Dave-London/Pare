#!/usr/bin/env node

import { runDoctor } from "./doctor-run.js";

runDoctor(process.argv.slice(2)).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
