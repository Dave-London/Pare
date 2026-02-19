import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parseValidateJsonOutput } from "../lib/parsers.js";
import { formatValidate, compactValidateMap, formatValidateCompact } from "../lib/formatters.js";
import { TerraformValidateResultSchema } from "../schemas/index.js";

/** Registers the `validate` tool on the given MCP server. */
export function registerValidateTool(server: McpServer) {
  server.registerTool(
    "validate",
    {
      title: "Terraform Validate",
      description:
        "Validates Terraform configuration files for syntax and consistency errors. Returns structured diagnostics.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: TerraformValidateResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const args = ["validate", "-json"];

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseValidateJsonOutput(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatValidate,
        compactValidateMap,
        formatValidateCompact,
        compact === false,
      );
    },
  );
}
