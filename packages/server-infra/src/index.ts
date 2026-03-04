#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/infra",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured infrastructure-as-code operations (Terraform init, plan, validate, fmt, output, state, workspace, show; Vagrant status, up, halt, destroy, global-status; Ansible playbook, inventory, galaxy). Returns typed JSON.",
  registerTools: registerAllTools,
});
