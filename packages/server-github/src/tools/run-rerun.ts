import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunRerun } from "../lib/parsers.js";
import { formatRunRerun } from "../lib/formatters.js";
import { RunRerunResultSchema } from "../schemas/index.js";

function classifyRunRerunError(
  text: string,
): "not-found" | "permission-denied" | "in-progress" | "unknown" {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|no workflow run/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/in progress|already running|cannot rerun while/.test(lower)) return "in-progress";
  return "unknown";
}

/** Registers the `run-rerun` tool on the given MCP server. */
export function registerRunRerunTool(server: McpServer) {
  server.registerTool(
    "run-rerun",
    {
      title: "Run Rerun",
      description:
        "Re-runs a workflow run by ID. Optionally re-runs only failed jobs or a specific job. Returns structured result with run ID, status, and URL.",
      inputSchema: {
        runId: z.number().describe("Workflow run ID to re-run"),
        failedOnly: z
          .boolean()
          .optional()
          .default(false)
          .describe("Re-run only failed jobs (default: false)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: detected from git remote)"),
        debug: z.boolean().optional().describe("Enable runner diagnostic logging (-d/--debug)"),
        // S-gap P1: Add job for rerunning a specific job
        job: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Rerun a specific job by its databaseId (-j/--job). Note: requires the job's databaseId, not the job name.",
          ),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
      },
      outputSchema: RunRerunResultSchema,
    },
    async ({ runId, failedOnly, repo, debug, job, path }) => {
      const cwd = path || process.cwd();

      if (repo) assertNoFlagInjection(repo, "repo");
      if (job) assertNoFlagInjection(job, "job");

      const args = ["run", "rerun", String(runId)];
      if (failedOnly) args.push("--failed");
      if (repo) args.push("--repo", repo);
      if (debug) args.push("--debug");
      if (job) args.push("--job", job);

      const result = await ghCmd(args, cwd);
      const rerun = parseRunRerun(result.stdout, result.stderr, runId, failedOnly ?? false, job);
      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        const data = {
          ...rerun,
          status: "error" as const,
          errorType: classifyRunRerunError(combined),
          errorMessage: combined || "gh run rerun failed",
        };
        return dualOutput(data, formatRunRerun);
      }

      // S-gap: Pass job for echo in output
      const data = rerun;
      return dualOutput(data, formatRunRerun);
    },
  );
}
