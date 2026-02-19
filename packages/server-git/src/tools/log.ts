import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, repoPathInput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseLog } from "../lib/parsers.js";
import { formatLog, compactLogMap, formatLogCompact } from "../lib/formatters.js";
import { GitLogSchema } from "../schemas/index.js";

// Use NUL byte as field delimiter to avoid corruption from @@ in commit messages.
// %x00 is the NUL byte format specifier in git.
const NUL = "%x00";
const RECORD_END = "%x01";
const LOG_FORMAT = `%H${NUL}%h${NUL}%an <%ae>${NUL}%ar${NUL}%D${NUL}%s${NUL}%b${RECORD_END}`;

/** Registers the `log` tool on the given MCP server. */
export function registerLogTool(server: McpServer) {
  server.registerTool(
    "log",
    {
      title: "Git Log",
      description: "Returns commit history as structured data.",
      inputSchema: {
        path: repoPathInput,
        maxCount: z
          .number()
          .optional()
          .default(10)
          .describe("Number of commits to return (default: 10)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch, tag, or commit to start from"),
        author: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by author name or email"),
        committer: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by committer name or email (--committer)"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter commits after this date (--since), e.g. '2024-01-01' or '2 weeks ago'"),
        until: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter commits before this date (--until)"),
        grep: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by commit message pattern (--grep)"),
        filePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Filter commits affecting a specific file (-- <path>)"),
        dateFormat: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Control date format (--date), e.g. short, iso, relative, format:%Y-%m-%d"),
        diffFilter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by change type (--diff-filter), e.g. A, M, D"),
        noMerges: z.boolean().optional().describe("Exclude merge commits (--no-merges)"),
        skip: z.number().optional().describe("Skip N commits for pagination (--skip)"),
        follow: z.boolean().optional().describe("Follow file renames (--follow)"),
        firstParent: z.boolean().optional().describe("Follow only first parent (--first-parent)"),
        all: z.boolean().optional().describe("Show all refs (--all)"),
        pickaxe: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Search for code changes (-S)"),
        compact: compactInput,
      },
      outputSchema: GitLogSchema,
    },
    async ({
      path,
      maxCount,
      ref,
      author,
      committer,
      since,
      until,
      grep,
      filePath,
      dateFormat,
      diffFilter,
      noMerges,
      skip,
      follow,
      firstParent,
      all,
      pickaxe,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const logFormat = dateFormat
        ? `%H${NUL}%h${NUL}%an <%ae>${NUL}%ad${NUL}%D${NUL}%s${NUL}%b${RECORD_END}`
        : LOG_FORMAT;
      const args = ["log", `--format=${logFormat}`, `--max-count=${maxCount ?? 10}`];

      if (author) {
        assertNoFlagInjection(author, "author");
        args.push(`--author=${author}`);
      }
      if (committer) {
        assertNoFlagInjection(committer, "committer");
        args.push(`--committer=${committer}`);
      }
      if (since) {
        assertNoFlagInjection(since, "since");
        args.push(`--since=${since}`);
      }
      if (until) {
        assertNoFlagInjection(until, "until");
        args.push(`--until=${until}`);
      }
      if (grep) {
        assertNoFlagInjection(grep, "grep");
        args.push(`--grep=${grep}`);
      }
      if (dateFormat) {
        assertNoFlagInjection(dateFormat, "dateFormat");
        args.push(`--date=${dateFormat}`);
      }
      if (diffFilter) {
        assertNoFlagInjection(diffFilter, "diffFilter");
        args.push(`--diff-filter=${diffFilter}`);
      }
      if (noMerges) args.push("--no-merges");
      if (skip !== undefined) args.push(`--skip=${skip}`);
      if (follow) args.push("--follow");
      if (firstParent) args.push("--first-parent");
      if (all) args.push("--all");
      if (pickaxe) {
        assertNoFlagInjection(pickaxe, "pickaxe");
        args.push(`-S${pickaxe}`);
      }
      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }
      if (filePath) {
        assertNoFlagInjection(filePath, "filePath");
        args.push("--", filePath);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git log failed: ${result.stderr}`);
      }

      const log = parseLog(result.stdout);
      return compactDualOutput(
        log,
        result.stdout,
        formatLog,
        compactLogMap,
        formatLogCompact,
        compact === false,
      );
    },
  );
}
