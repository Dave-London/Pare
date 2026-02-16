import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrList } from "../lib/parsers.js";
import { formatPrList, compactPrListMap, formatPrListCompact } from "../lib/formatters.js";
import { PrListResultSchema } from "../schemas/index.js";

const PR_LIST_FIELDS = "number,state,title,url,headRefName,author";

/** Registers the `pr-list` tool on the given MCP server. */
export function registerPrListTool(server: McpServer) {
  server.registerTool(
    "pr-list",
    {
      title: "PR List",
      description:
        "Lists pull requests with optional filters. Returns structured list with PR number, state, title, author, and branch. Use instead of running `gh pr list` in the terminal.",
      inputSchema: {
        state: z
          .enum(["open", "closed", "merged", "all"])
          .optional()
          .default("open")
          .describe("Filter by PR state (default: open)"),
        limit: z
          .number()
          .optional()
          .default(30)
          .describe("Maximum number of PRs to return (default: 30)"),
        author: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by author username"),
        label: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Filter by label"),
        draft: z.boolean().optional().describe("Filter by draft status (-d/--draft)"),
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
      outputSchema: PrListResultSchema,
    },
    async ({ state, limit, author, label, draft, path, compact }) => {
      const cwd = path || process.cwd();

      if (author) assertNoFlagInjection(author, "author");
      if (label) assertNoFlagInjection(label, "label");

      const args = ["pr", "list", "--json", PR_LIST_FIELDS, "--limit", String(limit)];
      if (state) args.push("--state", state);
      if (author) args.push("--author", author);
      if (label) args.push("--label", label);
      if (draft) args.push("--draft");

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr list failed: ${result.stderr}`);
      }

      const data = parsePrList(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPrList,
        compactPrListMap,
        formatPrListCompact,
        compact === false,
      );
    },
  );
}
