import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parseStateListOutput } from "../lib/parsers.js";
import { formatStateList, compactStateListMap, formatStateListCompact } from "../lib/formatters.js";
import { TerraformStateListResultSchema } from "../schemas/index.js";

/** Registers the `state-list` tool on the given MCP server. */
export function registerStateListTool(server: McpServer) {
  server.registerTool(
    "state-list",
    {
      title: "Terraform State List",
      description:
        "Lists all resources tracked in the Terraform state. Returns resource addresses.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: TerraformStateListResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const args = ["state", "list"];

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseStateListOutput(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatStateList,
        compactStateListMap,
        formatStateListCompact,
        compact === false,
      );
    },
  );
}
