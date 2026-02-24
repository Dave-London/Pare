import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git, resolveFilePaths } from "../lib/git-runner.js";
import { parseAdd } from "../lib/parsers.js";
import { formatAdd } from "../lib/formatters.js";
import { GitAddSchema } from "../schemas/index.js";

/** Registers the `add` tool on the given MCP server. */
export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "Git Add",
      description:
        "Stages files for commit. Returns structured data with count and list of staged files, including how many were newly staged.",
      inputSchema: {
        path: repoPathInput,
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("File paths to stage (required unless all is true)"),
        all: z.boolean().optional().default(false).describe("Stage all changes (git add -A)"),
        dryRun: z
          .boolean()
          .optional()
          .describe("Preview staging without making changes (-n/--dry-run)"),
        update: z
          .boolean()
          .optional()
          .describe("Stage only modifications to tracked files, excluding untracked files (-u)"),
        force: z.boolean().optional().describe("Allow staging of ignored files (-f)"),
        intentToAdd: z
          .boolean()
          .optional()
          .describe("Record intent to add files (-N/--intent-to-add)"),
        ignoreRemoval: z
          .boolean()
          .optional()
          .describe("Add new and modified files but do not stage deletions (--ignore-removal)"),
        renormalize: z
          .boolean()
          .optional()
          .describe("Re-apply clean filters to all tracked files (--renormalize)"),
        ignoreErrors: z
          .boolean()
          .optional()
          .describe("Continue staging past individual file failures (--ignore-errors)"),
        pathspecFromFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Read pathspec from file (--pathspec-from-file)"),
        chmod: z
          .enum(["+x", "-x"])
          .optional()
          .describe("Override file permission bits (--chmod=+x or --chmod=-x)"),
      },
      outputSchema: GitAddSchema,
    },
    async ({
      path,
      files,
      all,
      dryRun,
      update,
      force,
      intentToAdd,
      ignoreRemoval,
      renormalize,
      ignoreErrors,
      pathspecFromFile,
      chmod,
    }) => {
      const cwd = path || process.cwd();

      if (!all && !update && (!files || files.length === 0) && !pathspecFromFile) {
        throw new Error(
          "Either 'files' must be provided, 'all'/'update' must be true, or 'pathspecFromFile' must be set",
        );
      }

      // Build args
      let args: string[];
      if (all) {
        args = ["add", "-A"];
      } else if (update && (!files || files.length === 0) && !pathspecFromFile) {
        args = ["add", "-u"];
      } else if (pathspecFromFile) {
        assertNoFlagInjection(pathspecFromFile, "pathspecFromFile");
        args = ["add"];
        if (update) args.push("-u");
        args.push(`--pathspec-from-file=${pathspecFromFile}`);
      } else {
        // Validate each file path
        for (const file of files!) {
          assertNoFlagInjection(file, "file path");
        }
        // Resolve file path casing — git pathspecs are case-sensitive even on Windows
        const resolvedFiles = await resolveFilePaths(files!, cwd);
        args = ["add"];
        if (update) args.push("-u");
        args.push("--", ...resolvedFiles);
      }

      if (dryRun) args.push("--dry-run");
      if (force) args.push("--force");
      if (intentToAdd) args.push("--intent-to-add");
      if (ignoreRemoval) args.push("--ignore-removal");
      if (renormalize) args.push("--renormalize");
      if (ignoreErrors) args.push("--ignore-errors");
      if (chmod) args.push(`--chmod=${chmod}`);

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
