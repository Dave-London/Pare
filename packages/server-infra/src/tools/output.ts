import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parseOutputJsonOutput } from "../lib/parsers.js";
import { formatOutput, compactOutputMap, formatOutputCompact } from "../lib/formatters.js";
import { TerraformOutputResultSchema } from "../schemas/index.js";

/** Registers the `output` tool on the given MCP server. */
export function registerOutputTool(server: McpServer) {
  server.registerTool(
    "output",
    {
      title: "Terraform Output",
      description:
        "Shows Terraform output values from the current state. Returns structured name/value/type/sensitive data.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: TerraformOutputResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const args = ["output", "-json"];

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseOutputJsonOutput(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatOutput,
        compactOutputMap,
        formatOutputCompact,
        compact === false,
      );
    },
  );
}
