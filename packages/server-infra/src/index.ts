#!/usr/bin/env node

import { createServer } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/infra",
  version: "0.1.0",
  instructions:
    "Structured infrastructure-as-code operations (Terraform init, plan, validate, fmt, output, state, workspace, show; Vagrant status, up, halt, destroy, global-status; Ansible playbook, inventory, galaxy). Returns typed JSON.",
  registerTools: registerAllTools,
});
