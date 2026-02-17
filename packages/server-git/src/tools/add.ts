import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git, resolveFilePaths } from "../lib/git-runner.js";
import { parseAdd } from "../lib/parsers.js";
import { formatAdd } from "../lib/formatters.js";
import { GitAddSchema } from "../schemas/index.js";

export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "Git Add",
      description:
        "Stages files for commit. Returns structured data with count and list of staged files.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path"),
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("File paths to stage (required unless all is true)"),
        all: z.boolean().optional().default(false).describe("Stage all changes (git add -A)"),
      },
      outputSchema: GitAddSchema,
    },
    async ({ path, files, all }) => {
      const cwd = path || process.cwd();

      if (!all && (!files || files.length === 0)) {
        throw new Error("Either 'files' must be provided or 'all' must be true");
      }

      // Build args
      let args: string[];
      if (all) {
        args = ["add", "-A"];
      } else {
        // Validate each file path
        for (const file of files!) {
          assertNoFlagInjection(file, "file path");
        }
        // Resolve file path casing — git pathspecs are case-sensitive even on Windows
        const resolvedFiles = await resolveFilePaths(files!, cwd);
        args = ["add", "--", ...resolvedFiles];
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git add failed: ${result.stderr}`);
      }

      // Run git status to get the list of staged files
      const statusResult = await git(["status", "--porcelain=v1"], cwd);
      if (statusResult.exitCode !== 0) {
        throw new Error(`git status failed after add: ${statusResult.stderr}`);
      }

      const addResult = parseAdd(statusResult.stdout);
      return dualOutput(addResult, formatAdd);
    },
  );
}
