import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseReflogOutput } from "../lib/parsers.js";
import { formatReflog, compactReflogMap, formatReflogCompact } from "../lib/formatters.js";
import { GitReflogSchema } from "../schemas/index.js";

const REFLOG_FORMAT = "%H\t%h\t%gd\t%gs\t%ci";

/** Registers the `reflog` tool on the given MCP server. */
export function registerReflogTool(server: McpServer) {
  server.registerTool(
    "reflog",
    {
      title: "Git Reflog",
      description:
        "Returns reference log entries as structured data, useful for recovery operations. Also supports checking if a reflog exists. Use instead of running `git reflog` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["show", "exists"])
          .optional()
          .default("show")
          .describe("Reflog action: show (list entries) or exists (check if reflog exists)"),
        maxCount: z
          .number()
          .optional()
          .default(20)
          .describe("Number of entries to return (default: 20)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Which ref to show (default: HEAD)"),
        grepReflog: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter reflog by message pattern (--grep-reflog)"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter entries after this date (--since)"),
        until: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter entries before this date (--until)"),
        skip: z.number().optional().describe("Skip N entries for pagination (--skip)"),
        all: z.boolean().optional().describe("Show all refs' reflogs (--all)"),
        reverse: z.boolean().optional().describe("Show entries in reverse order (--reverse)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitReflogSchema,
    },
    async ({
      path,
      action,
      maxCount,
      ref,
      grepReflog,
      since,
      until,
      skip,
      all,
      reverse,
      compact,
    }) => {
      const cwd = path || process.cwd();

      // Handle exists action
      if (action === "exists") {
        const existsRef = ref || "HEAD";
        assertNoFlagInjection(existsRef, "ref");
        const result = await git(["reflog", "exists", existsRef], cwd);
        // Exit code 0 = exists, non-zero = doesn't exist
        const exists = result.exitCode === 0;
        return {
          content: [
            {
              type: "text" as const,
              text: exists
                ? `Reflog for '${existsRef}' exists`
                : `Reflog for '${existsRef}' does not exist`,
            },
          ],
          structuredContent: { entries: [], total: exists ? 1 : 0 },
        };
      }

      const args = ["reflog", "show", `--format=${REFLOG_FORMAT}`, `--max-count=${maxCount ?? 20}`];

      if (skip !== undefined) args.push(`--skip=${skip}`);
      if (all) args.push("--all");
      if (reverse) args.push("--reverse");
      if (grepReflog) {
        assertNoFlagInjection(grepReflog, "grepReflog");
        args.push(`--grep-reflog=${grepReflog}`);
      }
      if (since) {
        assertNoFlagInjection(since, "since");
        args.push(`--since=${since}`);
      }
      if (until) {
        assertNoFlagInjection(until, "until");
        args.push(`--until=${until}`);
      }

      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git reflog failed: ${result.stderr}`);
      }

      const reflog = parseReflogOutput(result.stdout);

      // Count total available entries (without limit) to populate totalAvailable
      const countArgs = ["reflog", "show", `--format=%H`];
      if (all) countArgs.push("--all");
      if (grepReflog) countArgs.push(`--grep-reflog=${grepReflog}`);
      if (since) countArgs.push(`--since=${since}`);
      if (until) countArgs.push(`--until=${until}`);
      if (ref) countArgs.push(ref);
      const countResult = await git(countArgs, cwd);
      if (countResult.exitCode === 0) {
        const totalAvailable = countResult.stdout.trim().split("\n").filter(Boolean).length;
        reflog.totalAvailable = totalAvailable;
      }

      return compactDualOutput(
        reflog,
        result.stdout,
        formatReflog,
        compactReflogMap,
        formatReflogCompact,
        compact === false,
      );
    },
  );
}
