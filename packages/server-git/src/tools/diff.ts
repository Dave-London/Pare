import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseDiffStat } from "../lib/parsers.js";
import { formatDiff } from "../lib/formatters.js";
import { GitDiffSchema } from "../schemas/index.js";

export function registerDiffTool(server: McpServer) {
  server.registerTool(
    "diff",
    {
      title: "Git Diff",
      description:
        "Returns file-level diff statistics as structured data. Use full=true for patch content. Use instead of running `git diff` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Repository path (default: cwd)"),
        staged: z.boolean().optional().default(false).describe("Show staged changes (--cached)"),
        ref: z.string().optional().describe("Compare against a specific ref (branch, tag, commit)"),
        file: z.string().optional().describe("Limit diff to a specific file"),
        full: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include full patch content in chunks"),
      },
      outputSchema: GitDiffSchema,
    },
    async ({ path, staged, ref, file, full }) => {
      const cwd = path || process.cwd();
      const args = ["diff", "--numstat"];

      if (staged) args.push("--cached");
      if (ref) {
        assertNoFlagInjection(ref, "ref");
        args.push(ref);
      }
      if (file) args.push("--", file);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git diff failed: ${result.stderr}`);
      }

      const diff = parseDiffStat(result.stdout);

      // If full patch requested, get the actual diff content per file
      if (full && diff.files.length > 0) {
        const patchArgs = ["diff"];
        if (staged) patchArgs.push("--cached");
        if (ref) patchArgs.push(ref); // Already validated above
        if (file) patchArgs.push("--", file);

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

      return dualOutput(diff, formatDiff);
    },
  );
}
