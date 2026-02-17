import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrDiffNumstat } from "../lib/parsers.js";
import { formatPrDiff, compactPrDiffMap, formatPrDiffCompact } from "../lib/formatters.js";
import { PrDiffResultSchema } from "../schemas/index.js";

export function registerPrDiffTool(server: McpServer) {
  server.registerTool(
    "pr-diff",
    {
      title: "PR Diff",
      description:
        "Returns file-level diff statistics for a pull request. Use full=true for patch content. Use instead of running `gh pr diff` in the terminal.",
      inputSchema: {
        pr: z.number().describe("Pull request number"),
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: PrDiffResultSchema,
    },
    async ({ pr, repo, full, compact }) => {
      if (repo) {
        assertNoFlagInjection(repo, "repo");
      }

      // Get numstat for structured file-level stats
      const numstatArgs = ["pr", "diff", String(pr), "--patch=false"];
      if (repo) numstatArgs.push("--repo", repo);

      // We use a two-pass approach: first get numstat, then optionally get full patch
      const diffArgs = ["pr", "diff", String(pr)];
      if (repo) diffArgs.push("--repo", repo);

      const result = await ghCmd(diffArgs, { cwd: process.cwd() });

      if (result.exitCode !== 0) {
        throw new Error(`gh pr diff failed: ${result.stderr}`);
      }

      // Parse the unified diff output to extract numstat-like data
      const diff = parsePrDiffFromPatch(result.stdout);

      // If full patch requested, attach chunk data
      if (full && diff.files.length > 0) {
        const filePatches = result.stdout.split(/^diff --git /m).filter(Boolean);
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
function parsePrDiffFromPatch(patchOutput: string): ReturnType<typeof parsePrDiffNumstat> {
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
    };
  });

  return {
    files,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    totalFiles: files.length,
  };
}
