import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, repoPathInput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { formatPrDiff, compactPrDiffMap, formatPrDiffCompact } from "../lib/formatters.js";
import { PrDiffResultSchema, type PrDiffResult } from "../schemas/index.js";

/** Maximum diff output size before marking as truncated (256 KB). */
const MAX_DIFF_SIZE = 256 * 1024;

/** Registers the `pr-diff` tool on the given MCP server. */
export function registerPrDiffTool(server: McpServer) {
  server.registerTool(
    "pr-diff",
    {
      title: "PR Diff",
      description:
        "Returns file-level diff statistics for a pull request. Use full=true for patch/hunk content, or nameOnly=true for just the changed file paths.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
        full: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include full patch content in chunks"),
        nameOnly: z.coerce
          .boolean()
          .optional()
          .describe("List only changed file names (--name-only)"),
        compact: compactInput,
      },
      outputSchema: PrDiffResultSchema,
    },
    async ({ number, repo, path, full, nameOnly, compact }) => {
      const cwd = path || process.cwd();

      if (repo) {
        assertNoFlagInjection(repo, "repo");
      }
      if (typeof number === "string") {
        assertNoFlagInjection(number, "number");
      }

      const selector = String(number);

      // Build the gh invocation. `--name-only` emits a bare filename list;
      // otherwise gh emits a unified patch that we parse for stats (and, when
      // full=true, hunk content).
      const diffArgs = ["pr", "diff", selector];
      if (repo) diffArgs.push("--repo", repo);
      if (nameOnly) diffArgs.push("--name-only");

      const result = await ghCmd(diffArgs, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr diff failed: ${result.stderr}`);
      }

      // S-gap: Detect truncation
      const truncated = result.stdout.length >= MAX_DIFF_SIZE;

      // `--name-only` returns one path per line, not a unified diff, so it must
      // be parsed differently (the patch parser would yield a single empty entry).
      const diff = nameOnly
        ? parsePrDiffNameOnly(result.stdout)
        : parsePrDiffFromPatch(result.stdout);
      // S-gap: Set truncation flag
      if (truncated) {
        diff.truncated = true;
      }

      // If full patch requested, attach chunk data
      if (full && !nameOnly && diff.files.length > 0) {
        const filePatches = result.stdout.split(/^diff --git /m).filter(Boolean);
        for (const patch of filePatches) {
          const fileMatch = patch.match(/b\/(.+)\n/);
          if (fileMatch) {
            const matchedFile = diff.files.find((f) => f.file === fileMatch[1]);
            if (matchedFile) {
              // S-gap: Extract file mode if present
              const modeMatch = patch.match(/(?:new|old|index|diff) (?:file )?mode (\d+)/);
              if (modeMatch) {
                matchedFile.mode = modeMatch[1];
              }

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

      // When full patch content is requested, force the full (non-compact) schema
      // so the parsed chunks survive — the compact projection drops chunks, which
      // would otherwise make full=true a no-op (issue #907).
      const forceFullSchema = compact === false || full === true;

      return compactDualOutput(
        diff,
        result.stdout,
        formatPrDiff,
        compactPrDiffMap,
        formatPrDiffCompact,
        forceFullSchema,
      );
    },
  );
}

/**
 * Parses unified diff output from `gh pr diff` into structured file stats.
 * Counts additions (+) and deletions (-) from diff hunks.
 */
function parsePrDiffFromPatch(patchOutput: string): PrDiffResult {
  const filePatches = patchOutput.split(/^diff --git /m).filter(Boolean);
  const files = filePatches.map((patch) => {
    // Extract file paths from the diff header, handling quoted paths with spaces.
    const headerLine = patch.split("\n", 1)[0] ?? "";
    let oldFile = "";
    let newFile = "";
    const quotedHeader = headerLine.match(/^"a\/(.+)" "b\/(.+)"$/);
    if (quotedHeader) {
      oldFile = quotedHeader[1];
      newFile = quotedHeader[2];
    } else {
      const plainHeader = headerLine.match(/^a\/(.+?) b\/(.+)$/);
      if (plainHeader) {
        oldFile = plainHeader[1];
        newFile = plainHeader[2];
      }
    }

    // Rename metadata is more reliable than the header for rename edge-cases.
    const renameFromMatch = patch.match(/^rename from (.+)$/m);
    const renameToMatch = patch.match(/^rename to (.+)$/m);
    if (renameFromMatch) oldFile = renameFromMatch[1];
    if (renameToMatch) newFile = renameToMatch[1];

    // Detect status from diff headers
    const isNew = /^new file mode/m.test(patch);
    const isDeleted = /^deleted file mode/m.test(patch);
    const isRenamed = !!renameFromMatch || !!renameToMatch || /^similarity index/m.test(patch);

    // Detect binary files from diff markers
    const isBinary =
      /^Binary files .* differ$/m.test(patch) ||
      /^GIT binary patch$/m.test(patch) ||
      /^Binary file .* has changed$/m.test(patch);

    // S-gap: Extract file mode
    const modeMatch = patch.match(/(?:new|old) file mode (\d+)/);
    const mode = modeMatch ? modeMatch[1] : undefined;

    // Count additions and deletions from diff lines
    let additions = 0;
    let deletions = 0;
    const lines = patch.split("\n");
    let inHunk = false;
    for (const line of lines) {
      if (line.startsWith("@@")) {
        inHunk = true;
        continue;
      }
      if (!inHunk) continue;
      // Stop at next diff header or file boundary
      if (line.startsWith("diff --git ")) break;
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    const status: "added" | "modified" | "deleted" | "renamed" | "copied" = isNew
      ? "added"
      : isDeleted
        ? "deleted"
        : isRenamed
          ? "renamed"
          : "modified";

    return {
      file: newFile || oldFile,
      status,
      additions,
      deletions,
      ...(isRenamed && oldFile !== newFile ? { oldFile } : {}),
      ...(mode ? { mode } : {}),
      ...(isBinary ? { binary: true } : {}),
    };
  });

  return {
    files,
  };
}

/**
 * Parses `gh pr diff --name-only` output into structured PR diff data.
 * The `--name-only` format is a bare list of changed file paths, one per line,
 * with no status or line-count information available. Each file is reported with
 * zeroed stats and a "modified" status since gh does not distinguish add/delete
 * in name-only mode.
 */
function parsePrDiffNameOnly(stdout: string): PrDiffResult {
  const files = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((file) => ({
      file,
      status: "modified" as const,
      additions: 0,
      deletions: 0,
    }));

  return { files };
}
