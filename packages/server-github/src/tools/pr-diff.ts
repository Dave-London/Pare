import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import type { parsePrDiffNumstat } from "../lib/parsers.js";
import { formatPrDiff, compactPrDiffMap, formatPrDiffCompact } from "../lib/formatters.js";
import { PrDiffResultSchema } from "../schemas/index.js";
import type { PrDiffResult } from "../schemas/index.js";

/** Maximum diff output size before marking as truncated (256 KB). */
const MAX_DIFF_SIZE = 256 * 1024;

/** Registers the `pr-diff` tool on the given MCP server. */
export function registerPrDiffTool(server: McpServer) {
  server.registerTool(
    "pr-diff",
    {
      title: "PR Diff",
      description:
        "Returns file-level diff statistics for a pull request. Use full=true for patch content. Use instead of running `gh pr diff` in the terminal.",
      inputSchema: {
        // S-gap P1: Accept PR by number, URL, or branch via union
        pr: z
          .union([z.number(), z.string().max(INPUT_LIMITS.STRING_MAX)])
          .describe("Pull request number, URL, or branch name"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        full: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include full patch content in chunks"),
        nameOnly: z.boolean().optional().describe("List only changed file names (--name-only)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PrDiffResultSchema,
    },
    async ({ pr, repo, full, nameOnly, compact }) => {
      if (repo) {
        assertNoFlagInjection(repo, "repo");
      }
      if (typeof pr === "string") {
        assertNoFlagInjection(pr, "pr");
      }

      const selector = String(pr);

      // Get numstat for structured file-level stats
      const numstatArgs = ["pr", "diff", selector, "--patch=false"];
      if (repo) numstatArgs.push("--repo", repo);

      // We use a two-pass approach: first get numstat, then optionally get full patch
      const diffArgs = ["pr", "diff", selector];
      if (repo) diffArgs.push("--repo", repo);
      if (nameOnly) diffArgs.push("--name-only");

      const result = await ghCmd(diffArgs, { cwd: process.cwd() });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr diff failed: ${result.stderr}`);
      }

      // S-gap: Detect truncation
      const truncated = result.stdout.length >= MAX_DIFF_SIZE;

      // Parse the unified diff output to extract numstat-like data
      const diff = parsePrDiffFromPatch(result.stdout);
      // S-gap: Set truncation flag
      if (truncated) {
        diff.truncated = true;
      }

      // If full patch requested, attach chunk data
      if (full && diff.files.length > 0) {
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

      return compactDualOutput(
        diff,
        result.stdout,
        formatPrDiff,
        compactPrDiffMap,
        formatPrDiffCompact,
        compact === false,
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
    // Extract file path from "a/path b/path" header
    const headerMatch = patch.match(/^a\/(.+?) b\/(.+?)\n/);
    const oldFile = headerMatch?.[1] ?? "";
    const newFile = headerMatch?.[2] ?? "";

    // Detect status from diff headers
    const isNew = /^new file mode/m.test(patch);
    const isDeleted = /^deleted file mode/m.test(patch);
    const isRenamed = /^rename from /m.test(patch) || /^similarity index/m.test(patch);

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
      file: newFile,
      status,
      additions,
      deletions,
      ...(isRenamed && oldFile !== newFile ? { oldFile } : {}),
      ...(mode ? { mode } : {}),
    };
  });

  return {
    files,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    totalFiles: files.length,
  };
}
