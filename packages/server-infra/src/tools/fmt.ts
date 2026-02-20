import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { z } from "zod";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parseFmtOutput } from "../lib/parsers.js";
import { formatFmt, compactFmtMap, formatFmtCompact } from "../lib/formatters.js";
import { TerraformFmtResultSchema } from "../schemas/index.js";

/** Registers the `fmt` tool on the given MCP server. */
export function registerFmtTool(server: McpServer) {
  server.registerTool(
    "fmt",
    {
      title: "Terraform Fmt",
      description:
        "Checks Terraform configuration formatting. Lists files that need formatting and optionally shows diffs.",
      inputSchema: {
        path: projectPathInput,
        diff: z.boolean().optional().describe("Show formatting differences (-diff)"),
        recursive: z
          .boolean()
          .optional()
          .default(true)
          .describe("Process files in subdirectories (-recursive, default true)"),
        compact: compactInput,
      },
      outputSchema: TerraformFmtResultSchema,
    },
    async ({ path, diff, recursive, compact }) => {
      const cwd = path || process.cwd();
      const args: string[] = ["fmt", "-check"];

      if (diff) args.push("-diff");
      if (recursive === false) args.push("-recursive=false");

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseFmtOutput(result.stdout, result.stderr, result.exitCode, diff ?? false);

      return compactDualOutput(
        data,
        rawOutput,
        formatFmt,
        compactFmtMap,
        formatFmtCompact,
        compact === false,
      );
    },
  );
}
