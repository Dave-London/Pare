import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git, resolveFilePaths } from "../lib/git-runner.js";
import { parseRestore } from "../lib/parsers.js";
import { formatRestore } from "../lib/formatters.js";
import { GitRestoreSchema } from "../schemas/index.js";

/** Registers the `restore` tool on the given MCP server. */
export function registerRestoreTool(server: McpServer) {
  server.registerTool(
    "restore",
    {
      title: "Git Restore",
      description:
        "Discards working tree changes or restores files from a specific commit. Returns structured data with restored files, source ref, and staged flag. Use instead of running `git restore` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("File paths to restore"),
        staged: z.boolean().optional().default(false).describe("Restore staged changes (--staged)"),
        source: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Restore from specific ref (--source)"),
      },
      outputSchema: GitRestoreSchema,
    },
    async ({ path, files, staged, source }) => {
      const cwd = path || process.cwd();

      if (!files || files.length === 0) {
        throw new Error("'files' must be provided with at least one file path");
      }

      // Validate source ref
      if (source) {
        assertNoFlagInjection(source, "source");
      }

      // Validate each file path
      for (const f of files) {
        assertNoFlagInjection(f, "files");
      }

      // Resolve file path casing — git pathspecs are case-sensitive even on Windows
      const resolvedFiles = await resolveFilePaths(files, cwd);

      // Build args
      const args = ["restore"];
      if (staged) args.push("--staged");
      if (source) args.push("--source", source);
      args.push("--", ...resolvedFiles);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git restore failed: ${result.stderr}`);
      }

      const resolvedSource = source || "HEAD";
      const restoreResult = parseRestore(files, resolvedSource, staged);
      return dualOutput(restoreResult, formatRestore);
    },
  );
}
