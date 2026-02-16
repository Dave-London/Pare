import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git, resolveFilePath } from "../lib/git-runner.js";
import { parseDiffStat } from "../lib/parsers.js";
import { formatDiff, compactDiffMap, formatDiffCompact } from "../lib/formatters.js";
import { GitDiffSchema } from "../schemas/index.js";

/** Registers the `diff` tool on the given MCP server. */
export function registerDiffTool(server: McpServer) {
  server.registerTool(
    "diff",
    {
      title: "Git Diff",
      description:
        "Returns file-level diff statistics as structured data. Use full=true for patch content. Use instead of running `git diff` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        staged: z.boolean().optional().default(false).describe("Show staged changes (--cached)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Compare against a specific ref (branch, tag, commit)"),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Limit diff to a specific file"),
        full: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include full patch content in chunks"),
        ignoreWhitespace: z.boolean().optional().describe("Ignore all whitespace changes (-w)"),
        contextLines: z.number().optional().describe("Number of context lines (-U<n>)"),
        nameStatus: z.boolean().optional().describe("Show file status with name (--name-status)"),
        ignoreSpaceChange: z.boolean().optional().describe("Ignore space amount changes (-b)"),
        reverse: z.boolean().optional().describe("Reverse diff direction (-R)"),
        wordDiff: z.boolean().optional().describe("Word-level diff (--word-diff)"),
        relative: z.boolean().optional().describe("Show relative paths (--relative)"),
        ignoreBlankLines: z
          .boolean()
          .optional()
          .describe("Ignore blank line changes (--ignore-blank-lines)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitDiffSchema,
    },
    async ({
      path,
      staged,
      ref,
      file,
      full,
      ignoreWhitespace,
      contextLines,
      nameStatus,
      ignoreSpaceChange,
      reverse,
      wordDiff,
      relative,
      ignoreBlankLines,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const args = ["diff", "--numstat"];

      // Resolve file path casing — git pathspecs are case-sensitive even on Windows
      let resolvedFile: string | undefined;
      if (file) {
        assertNoFlagInjection(file, "file");
        resolvedFile = await resolveFilePath(file, cwd);
      }

      if (staged) args.push("--cached");
      if (ignoreWhitespace) args.push("-w");
      if (contextLines !== undefined) args.push(`-U${contextLines}`);
      if (nameStatus) args.push("--name-status");
      if (ignoreSpaceChange) args.push("-b");
      if (reverse) args.push("-R");
      if (wordDiff) args.push("--word-diff");
      if (relative) args.push("--relative");
      if (ignoreBlankLines) args.push("--ignore-blank-lines");
      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }
      if (resolvedFile) {
        args.push("--", resolvedFile);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git diff failed: ${result.stderr}`);
      }

      const diff = parseDiffStat(result.stdout);

      // If full patch requested, get the actual diff content per file
      if (full && diff.files.length > 0) {
        const patchArgs = ["diff"];
        if (staged) patchArgs.push("--cached");
        if (ignoreWhitespace) patchArgs.push("-w");
        if (contextLines !== undefined) patchArgs.push(`-U${contextLines}`);
        if (ignoreSpaceChange) patchArgs.push("-b");
        if (reverse) patchArgs.push("-R");
        if (wordDiff) patchArgs.push("--word-diff");
        if (relative) patchArgs.push("--relative");
        if (ignoreBlankLines) patchArgs.push("--ignore-blank-lines");
        if (ref) patchArgs.push(ref); // Already validated above
        if (resolvedFile) {
          patchArgs.push("--", resolvedFile);
        }

        const patchResult = await git(patchArgs, cwd);
        if (patchResult.exitCode === 0) {
          // Split patch into per-file chunks
          const filePatches = patchResult.stdout.split(/^diff --git /m).filter(Boolean);
          for (const patch of filePatches) {
            const fileMatch = patch.match(/b\/(.+)\n/);
            if (fileMatch) {
              const matchedFile = diff.files.find((f) => f.file === fileMatch[1]);
              if (matchedFile) {
                const chunks = patch.split(/^@@/m).slice(1);
                matchedFile.chunks = chunks.map((chunk) => {
                  const headerEnd = chunk.indexOf("\n");
                  return {
                    header: `@@${chunk.slice(0, headerEnd)}`,
                    lines: chunk.slice(headerEnd + 1),
                  };
                });
              }
            }
          }
        }
      }

      return compactDualOutput(
        diff,
        result.stdout,
        formatDiff,
        compactDiffMap,
        formatDiffCompact,
        compact === false,
      );
    },
  );
}
