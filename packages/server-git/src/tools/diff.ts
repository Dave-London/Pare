import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, repoPathInput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git, resolveFilePath, resolveFilePaths } from "../lib/git-runner.js";
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
        "Returns file-level diff statistics as structured data. Use full=true for patch content.",
      inputSchema: {
        path: repoPathInput,
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
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Limit diff to multiple file paths"),
        full: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include full patch content in chunks"),
        atomicFull: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "When full=true, use a single git invocation to fetch stats+patch together (reduced drift between calls)",
          ),
        diffFilter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Filter by change type (--diff-filter), e.g. A (added), M (modified), D (deleted), R (renamed)",
          ),
        algorithm: z
          .enum(["myers", "minimal", "patience", "histogram"])
          .optional()
          .describe("Select diff algorithm (--diff-algorithm)"),
        findRenames: z
          .number()
          .optional()
          .describe("Rename detection threshold percentage (-M<n>), e.g. 50 for 50%"),
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
        compact: compactInput,
      },
      outputSchema: GitDiffSchema,
    },
    async ({
      path,
      staged,
      ref,
      file,
      files,
      full,
      atomicFull,
      diffFilter,
      algorithm,
      findRenames,
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

      // Resolve file paths casing — git pathspecs are case-sensitive even on Windows
      let resolvedFile: string | undefined;
      let resolvedFiles: string[] | undefined;
      if (file) {
        assertNoFlagInjection(file, "file");
        resolvedFile = await resolveFilePath(file, cwd);
      }
      if (files && files.length > 0) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        resolvedFiles = await resolveFilePaths(files, cwd);
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
      if (diffFilter) {
        assertNoFlagInjection(diffFilter, "diffFilter");
        args.push(`--diff-filter=${diffFilter}`);
      }
      if (algorithm) args.push(`--diff-algorithm=${algorithm}`);
      if (findRenames !== undefined) args.push(`-M${findRenames}%`);
      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }
      // Append file paths after --
      const pathArgs: string[] = [];
      if (resolvedFile) pathArgs.push(resolvedFile);
      if (resolvedFiles) pathArgs.push(...resolvedFiles);
      if (pathArgs.length > 0) {
        args.push("--", ...pathArgs);
      }

      if (full && atomicFull) {
        const atomicArgs = [...args, "--patch"];
        const atomicResult = await git(atomicArgs, cwd);
        if (atomicResult.exitCode !== 0) {
          throw new Error(`git diff failed: ${atomicResult.stderr}`);
        }

        const numstatOnly = atomicResult.stdout
          .split("\n")
          .filter((line) => /^(-|\d+)\t(-|\d+)\t/.test(line))
          .join("\n");
        const diff = parseDiffStat(numstatOnly);

        const filePatches = atomicResult.stdout.split(/^diff --git /m).filter(Boolean);
        for (const patch of filePatches) {
          const fileMatch = patch.match(/b\/(.+)\n/);
          if (!fileMatch) continue;
          const matchedFile = diff.files.find((f) => f.file === fileMatch[1]);
          if (!matchedFile) continue;
          if (/Binary files .* differ/.test(patch)) {
            matchedFile.binary = true;
          } else {
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

        return compactDualOutput(
          diff,
          atomicResult.stdout,
          formatDiff,
          compactDiffMap,
          formatDiffCompact,
          compact === false || full,
        );
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git diff failed: ${result.stderr}`);
      }

      let diff = parseDiffStat(result.stdout);

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
        if (diffFilter) patchArgs.push(`--diff-filter=${diffFilter}`);
        if (algorithm) patchArgs.push(`--diff-algorithm=${algorithm}`);
        if (findRenames !== undefined) patchArgs.push(`-M${findRenames}%`);
        if (ref) patchArgs.push(ref); // Already validated above
        if (pathArgs.length > 0) {
          patchArgs.push("--", ...pathArgs);
        }

        if (atomicFull) patchArgs.push("--numstat");
        const patchResult = await git(patchArgs, cwd);
        if (patchResult.exitCode === 0) {
          if (atomicFull) {
            const numstatOnly = patchResult.stdout
              .split("\n")
              .filter((line) => /^(-|\d+)\t(-|\d+)\t/.test(line))
              .join("\n");
            if (numstatOnly.trim()) {
              diff = parseDiffStat(numstatOnly);
            }
          }
          // Split patch into per-file chunks
          const filePatches = patchResult.stdout.split(/^diff --git /m).filter(Boolean);
          for (const patch of filePatches) {
            const fileMatch = patch.match(/b\/(.+)\n/);
            if (fileMatch) {
              const matchedFile = diff.files.find((f) => f.file === fileMatch[1]);
              if (matchedFile) {
                // Detect binary files from full patch output
                if (/Binary files .* differ/.test(patch)) {
                  matchedFile.binary = true;
                } else {
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
      }

      return compactDualOutput(
        diff,
        result.stdout,
        formatDiff,
        compactDiffMap,
        formatDiffCompact,
        compact === false || full,
      );
    },
  );
}
