import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunView } from "../lib/parsers.js";
import { formatRunView, compactRunViewMap, formatRunViewCompact } from "../lib/formatters.js";
import { RunViewResultSchema } from "../schemas/index.js";

// S-gap: Request steps in jobs for step-level detail
// P0: Added headSha, event, startedAt, attempt for richer run metadata
const RUN_VIEW_FIELDS =
  "databaseId,status,conclusion,name,workflowName,headBranch,jobs,url,createdAt,headSha,event,startedAt,attempt";

/** Registers the `run-view` tool on the given MCP server. */
export function registerRunViewTool(server: McpServer) {
  server.registerTool(
    "run-view",
    {
      title: "Run View",
      description:
        "Views a workflow run by ID. Returns structured data with status, conclusion, jobs (with steps), and workflow details.",
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
        // S-gap P0: Add job filter for focused single-job inspection
        job: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("View a specific job by ID (-j/--job)"),
        // S-gap P0: Add repo for cross-repo inspection
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: RunViewResultSchema,
    },
    async ({ id, logFailed, log, attempt, exitStatus, job, repo, path, compact }) => {
      const cwd = path || process.cwd();

      if (job) assertNoFlagInjection(job, "job");
      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["run", "view", String(id), "--json", RUN_VIEW_FIELDS];
      if (logFailed) args.push("--log-failed");
      if (log) args.push("--log");
      if (attempt !== undefined) args.push("--attempt", String(attempt));
      if (exitStatus) args.push("--exit-status");
      if (job) args.push("--job", job);
      if (repo) args.push("--repo", repo);
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
