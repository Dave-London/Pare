import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunView } from "../lib/parsers.js";
import { formatRunView, compactRunViewMap, formatRunViewCompact } from "../lib/formatters.js";
import { RunViewResultSchema } from "../schemas/index.js";

const RUN_VIEW_FIELDS =
  "databaseId,status,conclusion,name,workflowName,headBranch,jobs,url,createdAt";

/** Registers the `run-view` tool on the given MCP server. */
export function registerRunViewTool(server: McpServer) {
  server.registerTool(
    "run-view",
    {
      title: "Run View",
      description:
        "Views a workflow run by ID. Returns structured data with status, conclusion, jobs, and workflow details. Use instead of running `gh run view` in the terminal.",
      inputSchema: {
        id: z.number().describe("Workflow run ID"),
        logFailed: z
          .boolean()
          .optional()
          .describe("Retrieve logs for failed steps only (--log-failed)"),
        log: z.boolean().optional().describe("Retrieve full run logs (--log)"),
        attempt: z.number().optional().describe("View a specific rerun attempt (-a/--attempt)"),
        exitStatus: z
          .boolean()
          .optional()
          .describe("Exit with non-zero status if run failed (--exit-status)"),
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
      outputSchema: RunViewResultSchema,
    },
    async ({ id, logFailed, log, attempt, exitStatus, path, compact }) => {
      const cwd = path || process.cwd();

      const args = ["run", "view", String(id), "--json", RUN_VIEW_FIELDS];
      if (logFailed) args.push("--log-failed");
      if (log) args.push("--log");
      if (attempt !== undefined) args.push("--attempt", String(attempt));
      if (exitStatus) args.push("--exit-status");
      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh run view failed: ${result.stderr}`);
      }

      const data = parseRunView(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatRunView,
        compactRunViewMap,
        formatRunViewCompact,
        compact === false,
      );
    },
  );
}
