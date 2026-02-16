import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseLog } from "../lib/parsers.js";
import { formatLog, compactLogMap, formatLogCompact } from "../lib/formatters.js";
import { GitLogSchema } from "../schemas/index.js";

const DELIMITER = "@@";
const LOG_FORMAT = `%H${DELIMITER}%h${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;

/** Registers the `log` tool on the given MCP server. */
export function registerLogTool(server: McpServer) {
  server.registerTool(
    "log",
    {
      title: "Git Log",
      description:
        "Returns commit history as structured data. Use instead of running `git log` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitLogSchema,
    },
    async ({
      path,
      maxCount,
      ref,
      author,
      noMerges,
      skip,
      follow,
      firstParent,
      all,
      pickaxe,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const args = ["log", `--format=${LOG_FORMAT}`, `--max-count=${maxCount ?? 10}`];

      if (author) {
        assertNoFlagInjection(author, "author");
        args.push(`--author=${author}`);
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
