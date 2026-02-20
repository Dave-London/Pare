import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { z } from "zod";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parsePlanOutput } from "../lib/parsers.js";
import { formatPlan, compactPlanMap, formatPlanCompact } from "../lib/formatters.js";
import { TerraformPlanResultSchema } from "../schemas/index.js";

/** Registers the `plan` tool on the given MCP server. */
export function registerPlanTool(server: McpServer) {
  server.registerTool(
    "plan",
    {
      title: "Terraform Plan",
      description:
        "Shows the Terraform execution plan with resource change counts. Read-only — does not modify infrastructure.",
      inputSchema: {
        path: projectPathInput,
        out: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Save the plan to a file for later apply (-out=FILE)"),
        target: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Target a specific resource for planning (-target=RESOURCE)"),
        varFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a variable definitions file (-var-file=FILE)"),
        vars: z
          .record(z.string(), z.string())
          .optional()
          .describe("Variable overrides as key-value pairs (-var KEY=VALUE)"),
        compact: compactInput,
      },
      outputSchema: TerraformPlanResultSchema,
    },
    async ({ path, out, target, varFile, vars, compact }) => {
      const cwd = path || process.cwd();
      if (out) assertNoFlagInjection(out, "out");
      if (target) assertNoFlagInjection(target, "target");
      if (varFile) assertNoFlagInjection(varFile, "varFile");

      const args: string[] = ["plan", "-input=false"];

      if (out) args.push(`-out=${out}`);
      if (target) args.push(`-target=${target}`);
      if (varFile) args.push(`-var-file=${varFile}`);
      if (vars) {
        for (const [key, value] of Object.entries(vars)) {
          args.push("-var", `${key}=${value}`);
        }
      }

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parsePlanOutput(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatPlan,
        compactPlanMap,
        formatPlanCompact,
        compact === false,
      );
    },
  );
}
