import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrMerge } from "../lib/parsers.js";
import { formatPrMerge } from "../lib/formatters.js";
import { PrMergeResultSchema } from "../schemas/index.js";

export function registerPrMergeTool(server: McpServer) {
  server.registerTool(
    "pr-merge",
    {
      title: "PR Merge",
      description:
        "Merges a pull request by number. Returns structured data with merge status, method, and URL. Use instead of running `gh pr merge` in the terminal.",
      inputSchema: {
        number: z.number().describe("Pull request number"),
        method: z
          .enum(["squash", "merge", "rebase"])
          .optional()
          .default("squash")
          .describe("Merge method (default: squash)"),
        deleteBranch: z.boolean().optional().default(false).describe("Delete branch after merge"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PrMergeResultSchema,
    },
    async ({ number, method, deleteBranch, path }) => {
      const cwd = path || process.cwd();

      const args = ["pr", "merge", String(number), `--${method}`];
      if (deleteBranch) args.push("--delete-branch");

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr merge failed: ${result.stderr}`);
      }

      const data = parsePrMerge(result.stdout, number, method);
      return dualOutput(data, formatPrMerge);
    },
  );
}
