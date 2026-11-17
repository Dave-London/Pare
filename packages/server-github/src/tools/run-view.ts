import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  repoPathInput,
} from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunView } from "../lib/parsers.js";
import { windowLog, DEFAULT_LOG_TAIL_LINES, DEFAULT_LOG_MAX_CHARS } from "../lib/log-window.js";
import {
  formatRunView,
  formatRunViewLog,
  compactRunViewMap,
  formatRunViewCompact,
} from "../lib/formatters.js";
import { RunViewResultSchema } from "../schemas/index.js";

// S-gap: Request steps in jobs for step-level detail
// P0: Added headSha, event, startedAt, attempt for richer run metadata
const RUN_VIEW_FIELDS =
  "databaseId,status,conclusion,name,workflowName,headBranch,jobs,url,createdAt,headSha,event,startedAt,updatedAt,attempt";

/** Registers the `run-view` tool on the given MCP server. */
export function registerRunViewTool(server: McpServer) {
  server.registerTool(
    "run-view",
    {
      title: "Run View",
      description:
        "Views a workflow run by ID. Returns structured data with status, conclusion, jobs (with steps), and workflow details.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        id: z.coerce.number().describe("Workflow run ID"),
        logFailed: z
          .boolean()
          .optional()
          .describe("Retrieve logs for failed steps only (--log-failed)"),
        log: z.boolean().optional().describe("Retrieve full run logs (--log)"),
        tailLines: z.coerce
          .number()
          .int()
          .min(1)
          .max(100_000)
          .optional()
          .describe(
            `With log/logFailed: return exactly the last N log lines, where test runners print failures and tracebacks. Without it, logs are cut to the last ${DEFAULT_LOG_TAIL_LINES} lines and ${DEFAULT_LOG_MAX_CHARS} characters; logsTruncated and logsTotalLines say when`,
          ),
        grep: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "With log/logFailed: keep only log lines matching this case-insensitive regular expression (e.g. '##\\[error\\]|FAIL') before the tail is taken. logsMatchedLines gives the match count",
          ),
        attempt: z.coerce
          .number()
          .optional()
          .describe("View a specific rerun attempt (-a/--attempt)"),
        exitStatus: z
          .boolean()
          .optional()
          .describe("Exit with non-zero status if run failed (--exit-status)"),
        // S-gap P0: Add job filter for focused single-job inspection
        job: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("View a specific job by ID (-j/--job); ids are in jobs[].id"),
        // S-gap P0: Add repo for cross-repo inspection
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        path: repoPathInput,
        compact: compactInput,
      },
      outputSchema: RunViewResultSchema,
    },
    async ({
      id,
      logFailed,
      log,
      tailLines,
      grep,
      attempt,
      exitStatus,
      job,
      repo,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (job) assertNoFlagInjection(job, "job");
      if (repo) assertNoFlagInjection(repo, "repo");

      const wantsLogs = logFailed || log;
      if (grep !== undefined && !wantsLogs) {
        throw new Error("grep filters log output: set log or logFailed with it.");
      }

      // --log and --log-failed are mutually exclusive with --json in gh CLI.
      // When requesting logs, skip --json and return raw log text.
      const args = ["run", "view", String(id)];
      if (!wantsLogs) {
        args.push("--json", RUN_VIEW_FIELDS);
      }
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

      // Log mode: return raw logs as text in the logs field
      if (wantsLogs) {
        // #1257: never hand back an unbounded log. A full run log overflows the
        // client's tool-result limit and the agent sees an unmarked fragment.
        const win = windowLog(result.stdout, { tailLines, grep });
        const data: import("../schemas/index.js").RunViewResult = {
          id,
          status: "completed",
          conclusion: null,
          workflowName: "",
          headBranch: "",
          url: "",
          logs: win.logs,
          logsTotalLines: win.totalLines,
          logsReturnedLines: win.returnedLines,
          ...(win.matchedLines !== undefined ? { logsMatchedLines: win.matchedLines } : {}),
          logsTruncated: win.truncated,
        };
        return dualOutput(data, formatRunViewLog);
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
