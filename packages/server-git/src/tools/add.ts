import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  repoPathInput,
  coerceJsonArray,
} from "@paretools/shared";
import { git, resolveFilePaths } from "../lib/git-runner.js";
import { parseAdd } from "../lib/parsers.js";
import { formatAdd } from "../lib/formatters.js";
import { GitAddSchema } from "../schemas/index.js";

export interface BuildAddArgsOptions {
  files?: string[];
  all?: boolean;
  dryRun?: boolean;
  update?: boolean;
  force?: boolean;
  intentToAdd?: boolean;
  ignoreRemoval?: boolean;
  renormalize?: boolean;
  ignoreErrors?: boolean;
  pathspecFromFile?: string;
  chmod?: "+x" | "-x";
}

/** Builds the command line argument list for `git add`, ensuring modifier flags precede the `--` pathspec separator (#1216). */
export function buildAddArgs(options: BuildAddArgsOptions, resolvedFiles?: string[]): string[] {
  const {
    all,
    update,
    files,
    pathspecFromFile,
    dryRun,
    force,
    intentToAdd,
    ignoreRemoval,
    renormalize,
    ignoreErrors,
    chmod,
  } = options;

  const flags: string[] = [];
  if (dryRun) flags.push("--dry-run");
  if (force) flags.push("--force");
  if (intentToAdd) flags.push("--intent-to-add");
  if (ignoreRemoval) flags.push("--ignore-removal");
  if (renormalize) flags.push("--renormalize");
  if (ignoreErrors) flags.push("--ignore-errors");
  if (chmod) flags.push(`--chmod=${chmod}`);

  if (all) {
    return ["add", "-A", ...flags];
  } else if (update && (!files || files.length === 0) && !pathspecFromFile) {
    return ["add", "-u", ...flags];
  } else if (pathspecFromFile) {
    const args = ["add"];
    if (update) args.push("-u");
    args.push(...flags, `--pathspec-from-file=${pathspecFromFile}`);
    return args;
  } else {
    const args = ["add"];
    if (update) args.push("-u");
    args.push(...flags);
    const targetFiles = resolvedFiles ?? files ?? [];
    if (targetFiles.length > 0) {
      args.push("--", ...targetFiles);
    }
    return args;
  }
}

/** Registers the `add` tool on the given MCP server. */
export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "Git Add",
      description:
        "Stages files for commit. Returns structured data with count and list of staged files, including how many were newly staged. Pass `path` to target a specific repo or worktree — when omitted, operates on the server's own working directory, not the caller's (see #876).",
      annotations: { readOnlyHint: false },
      inputSchema: {
        path: repoPathInput,
        files: z.preprocess(
          coerceJsonArray,
          z
            .array(z.string().max(INPUT_LIMITS.PATH_MAX))
            .max(INPUT_LIMITS.ARRAY_MAX)
            .optional()
            .describe("File paths to stage (required unless all is true)"),
        ),
        all: z.coerce
          .boolean()
          .optional()
          .default(false)
          .describe("Stage all changes (git add -A)"),
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

      if (pathspecFromFile) {
        assertNoFlagInjection(pathspecFromFile, "pathspecFromFile");
      }

      let resolvedFiles: string[] | undefined;
      if (
        !all &&
        !(update && (!files || files.length === 0) && !pathspecFromFile) &&
        !pathspecFromFile
      ) {
        // Validate each file path
        for (const file of files!) {
          assertNoFlagInjection(file, "file path");
        }
        // Resolve file path casing — git pathspecs are case-sensitive even on Windows
        resolvedFiles = await resolveFilePaths(files!, cwd);
      }

      const args = buildAddArgs(
        {
          all,
          update,
          files,
          pathspecFromFile,
          dryRun,
          force,
          intentToAdd,
          ignoreRemoval,
          renormalize,
          ignoreErrors,
          chmod,
        },
        resolvedFiles,
      );

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
