import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  repoPathInput,
} from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRunList } from "../lib/parsers.js";
import { formatRunList, compactRunListMap, formatRunListCompact } from "../lib/formatters.js";
import { RunListResultSchema } from "../schemas/index.js";

// P1-gap #148: Expanded fields
const RUN_LIST_FIELDS =
  "databaseId,status,conclusion,name,workflowName,headBranch,url,createdAt,headSha,event,startedAt,attempt";

/** Registers the `run-list` tool on the given MCP server. */
export function registerRunListTool(server: McpServer) {
  server.registerTool(
    "run-list",
    {
      title: "Run List",
      description:
        "Lists workflow runs with optional filters. Returns structured list with run ID, status, conclusion, and workflow details.",
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
        // S-gap P0: Expand status enum to all 16 upstream values
        status: z
          .enum([
            "queued",
            "in_progress",
            "completed",
            "failure",
            "success",
            "cancelled",
            "timed_out",
            "waiting",
            "action_required",
            "neutral",
            "skipped",
            "stale",
            "startup_failure",
            "pending",
            "requested",
          ])
          .optional()
          .describe("Filter by run status"),
        all: z.boolean().optional().describe("Include runs from disabled workflows (-a/--all)"),
        // S-gap P0: Add workflow filter
        workflow: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by workflow file name or ID (-w/--workflow)"),
        // S-gap P0: Add commit filter
        commit: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by commit SHA (-c/--commit)"),
        // S-gap P0: Add repo for cross-repo listing
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (--repo). Default: current repo."),
        // S-gap P1: Add event filter
        event: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by trigger event type (-e/--event), e.g. push, pull_request"),
        // S-gap P1: Add user filter
        user: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by triggering user (-u/--user)"),
        // S-gap P1: Add created filter
        created: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by creation time (--created), e.g. '>2024-01-01'"),
        path: repoPathInput,
        compact: compactInput,
      },
      outputSchema: RunListResultSchema,
    },
    async ({
      limit,
      branch,
      status,
      all,
      workflow,
      commit,
      repo,
      event,
      user,
      created,
      path,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (branch) assertNoFlagInjection(branch, "branch");
      if (workflow) assertNoFlagInjection(workflow, "workflow");
      if (commit) assertNoFlagInjection(commit, "commit");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (event) assertNoFlagInjection(event, "event");
      if (user) assertNoFlagInjection(user, "user");
      if (created) assertNoFlagInjection(created, "created");

      const args = ["run", "list", "--json", RUN_LIST_FIELDS, "--limit", String(limit)];
      if (branch) args.push("--branch", branch);
      if (status) args.push("--status", status);
      if (all) args.push("--all");
      if (workflow) args.push("--workflow", workflow);
      if (commit) args.push("--commit", commit);
      if (repo) args.push("--repo", repo);
      if (event) args.push("--event", event);
      if (user) args.push("--user", user);
      if (created) args.push("--created", created);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh run list failed: ${result.stderr}`);
      }

      let totalAvailable: number | undefined;
      if (limit < 1000) {
        const countArgs = ["run", "list", "--json", RUN_LIST_FIELDS, "--limit", "1000"];
        if (branch) countArgs.push("--branch", branch);
        if (status) countArgs.push("--status", status);
        if (all) countArgs.push("--all");
        if (workflow) countArgs.push("--workflow", workflow);
        if (commit) countArgs.push("--commit", commit);
        if (repo) countArgs.push("--repo", repo);
        if (event) countArgs.push("--event", event);
        if (user) countArgs.push("--user", user);
        if (created) countArgs.push("--created", created);
        const countResult = await ghCmd(countArgs, cwd);
        if (countResult.exitCode === 0) {
          totalAvailable = parseRunList(countResult.stdout).total;
        }
      }

      const data = parseRunList(result.stdout, totalAvailable);
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
