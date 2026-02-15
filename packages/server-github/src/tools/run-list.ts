import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunList } from "../lib/parsers.js";
import { formatRunList, compactRunListMap, formatRunListCompact } from "../lib/formatters.js";
import { RunListResultSchema } from "../schemas/index.js";

const RUN_LIST_FIELDS = "databaseId,status,conclusion,name,workflowName,headBranch,url,createdAt";

/** Registers the `run-list` tool on the given MCP server. */
export function registerRunListTool(server: McpServer) {
  server.registerTool(
    "run-list",
    {
      title: "Run List",
      description:
        "Lists workflow runs with optional filters. Returns structured list with run ID, status, conclusion, and workflow details. Use instead of running `gh run list` in the terminal.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of runs to return (default: 20)"),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by branch name"),
        status: z
          .enum(["queued", "in_progress", "completed", "failure", "success"])
          .optional()
          .describe("Filter by run status"),
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
      outputSchema: RunListResultSchema,
    },
    async ({ limit, branch, status, path, compact }) => {
      const cwd = path || process.cwd();

      if (branch) assertNoFlagInjection(branch, "branch");

      const args = ["run", "list", "--json", RUN_LIST_FIELDS, "--limit", String(limit)];
      if (branch) args.push("--branch", branch);
      if (status) args.push("--status", status);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh run list failed: ${result.stderr}`);
      }

      const data = parseRunList(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatRunList,
        compactRunListMap,
        formatRunListCompact,
        compact === false,
      );
    },
  );
}
