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
import { parseShowJsonOutput } from "../lib/parsers.js";
import { formatShow, compactShowMap, formatShowCompact } from "../lib/formatters.js";
import { TerraformShowResultSchema } from "../schemas/index.js";

/** Registers the `show` tool on the given MCP server. */
export function registerShowTool(server: McpServer) {
  server.registerTool(
    "show",
    {
      title: "Terraform Show",
      description:
        "Shows the current Terraform state or a saved plan file in structured JSON. Returns resources, outputs, and version info.",
      inputSchema: {
        path: projectPathInput,
        planFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to a saved plan file to show instead of the current state"),
        compact: compactInput,
      },
      outputSchema: TerraformShowResultSchema,
    },
    async ({ path, planFile, compact }) => {
      const cwd = path || process.cwd();
      if (planFile) assertNoFlagInjection(planFile, "planFile");

      const args: string[] = ["show", "-json"];
      if (planFile) args.push(planFile);

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseShowJsonOutput(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatShow,
        compactShowMap,
        formatShowCompact,
        compact === false,
      );
    },
  );
}
