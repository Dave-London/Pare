import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrView } from "../lib/parsers.js";
import { formatPrView, compactPrViewMap, formatPrViewCompact } from "../lib/formatters.js";
import { PrViewResultSchema } from "../schemas/index.js";

const PR_VIEW_FIELDS =
  "number,state,title,body,mergeable,reviewDecision,statusCheckRollup,url,headRefName,baseRefName,additions,deletions,changedFiles";

export function registerPrViewTool(server: McpServer) {
  server.registerTool(
    "pr-view",
    {
      title: "PR View",
      description:
        "Views a pull request by number. Returns structured data with state, checks, review decision, and diff stats. Use instead of running `gh pr view` in the terminal.",
      inputSchema: {
        number: z.number().describe("Pull request number"),
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
            "Prefer compact output",
          ),
      },
      outputSchema: PrViewResultSchema,
    },
    async ({ number, path, compact }) => {
      const cwd = path || process.cwd();

      const args = ["pr", "view", String(number), "--json", PR_VIEW_FIELDS];
      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr view failed: ${result.stderr}`);
      }

      const data = parsePrView(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPrView,
        compactPrViewMap,
        formatPrViewCompact,
        compact === false,
      );
    },
  );
}
