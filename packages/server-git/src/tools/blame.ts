import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git, resolveFilePath } from "../lib/git-runner.js";
import { parseBlameOutput } from "../lib/parsers.js";
import { formatBlame, compactBlameMap, formatBlameCompact } from "../lib/formatters.js";
import { GitBlameSchema } from "../schemas/index.js";

/** Registers the `blame` tool on the given MCP server. */
export function registerBlameTool(server: McpServer) {
  server.registerTool(
    "blame",
    {
      title: "Git Blame",
      description:
        "Shows commit annotations for a file, grouped by commit. Returns structured blame data with deduplicated commit metadata (hash, author, email, date) and their attributed lines. Use instead of running `git blame` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        file: z.string().max(INPUT_LIMITS.PATH_MAX).describe("File path to blame"),
        startLine: z.number().optional().describe("Start line number for blame range"),
        endLine: z.number().optional().describe("End line number for blame range"),
        funcname: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Blame by function name (-L :<funcname>)"),
        rev: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Blame from a specific commit/tag (<rev>)"),
        ignoreRevsFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe(
            "Path to file listing revisions to ignore (--ignore-revs-file), e.g. .git-blame-ignore-revs",
          ),
        ignoreRev: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific commit(s) to ignore (--ignore-rev, repeated)"),
        since: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Limit blame history to a date range (--since)"),
        detectMoves: z.boolean().optional().describe("Detect moved lines within a file (-M)"),
        detectCopies: z.boolean().optional().describe("Detect lines copied from other files (-C)"),
        ignoreWhitespace: z.boolean().optional().describe("Ignore whitespace changes (-w)"),
        reverse: z.boolean().optional().describe("Find when lines were removed (--reverse)"),
        showStats: z.boolean().optional().describe("Include work-amount statistics (--show-stats)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitBlameSchema,
    },
    async ({
      path,
      file,
      startLine,
      endLine,
      funcname,
      rev,
      ignoreRevsFile,
      ignoreRev,
      since,
      detectMoves,
      detectCopies,
      ignoreWhitespace,
      reverse,
      showStats,
      compact,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(file, "file");
      if (rev) assertNoFlagInjection(rev, "rev");
      if (ignoreRevsFile) assertNoFlagInjection(ignoreRevsFile, "ignoreRevsFile");
      if (ignoreRev) {
        for (const r of ignoreRev) {
          assertNoFlagInjection(r, "ignoreRev");
        }
      }
      if (since) assertNoFlagInjection(since, "since");
      if (funcname) assertNoFlagInjection(funcname, "funcname");

      // Resolve file path casing — git pathspecs are case-sensitive even on Windows
      const resolvedFile = await resolveFilePath(file, cwd);

      const args = ["blame", "--porcelain"];
      if (detectMoves) args.push("-M");
      if (detectCopies) args.push("-C");
      if (ignoreWhitespace) args.push("-w");
      if (reverse) args.push("--reverse");
      if (showStats) args.push("--show-stats");
      if (since) args.push(`--since=${since}`);
      if (ignoreRevsFile) args.push(`--ignore-revs-file=${ignoreRevsFile}`);
      if (ignoreRev) {
        for (const r of ignoreRev) {
          args.push(`--ignore-rev=${r}`);
        }
      }
      if (funcname) {
        args.push(`-L:${funcname}`);
      } else if (startLine !== undefined && endLine !== undefined) {
        args.push(`-L${startLine},${endLine}`);
      } else if (startLine !== undefined) {
        args.push(`-L${startLine},`);
      }
      if (rev) args.push(rev);
      args.push("--", resolvedFile);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git blame failed: ${result.stderr}`);
      }

      const blame = parseBlameOutput(result.stdout, resolvedFile);
      return compactDualOutput(
        blame,
        result.stdout,
        formatBlame,
        compactBlameMap,
        formatBlameCompact,
        compact === false,
      );
    },
  );
}
