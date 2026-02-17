import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git, resolveFilePaths } from "../lib/git-runner.js";
import { parseReset, validateResetArgs } from "../lib/parsers.js";
import { formatReset } from "../lib/formatters.js";
import { GitResetSchema } from "../schemas/index.js";

/** Registers the `reset` tool on the given MCP server. */
export function registerResetTool(server: McpServer) {
  server.registerTool(
    "reset",
    {
      title: "Git Reset",
      description:
        "Resets the current HEAD to a specified state. Supports soft, mixed, hard, merge, and keep modes. The 'hard' mode requires confirm=true as a safety guard since it permanently discards changes. Returns structured data with the ref, mode, and list of affected files.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("File paths to unstage (omit to unstage all)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("HEAD")
          .describe("Ref to reset to (default: HEAD)"),
        mode: z
          .enum(["soft", "mixed", "hard", "merge", "keep"])
          .optional()
          .describe(
            "Reset mode: soft (keep staged), mixed (default, unstage), hard (discard all), merge, keep",
          ),
        confirm: z
          .boolean()
          .optional()
          .describe(
            "Safety confirmation required when mode is 'hard'. Must be set to true to proceed with --hard reset, which permanently discards uncommitted changes.",
          ),
        intentToAdd: z.boolean().optional().describe("Keep paths in index as intent-to-add (-N)"),
        recurseSubmodules: z
          .boolean()
          .optional()
          .describe("Recurse into submodules (--recurse-submodules)"),
      },
      outputSchema: GitResetSchema,
    },
    async ({ path, files, ref, mode, confirm, intentToAdd, recurseSubmodules }) => {
      const cwd = path || process.cwd();

      // Safety guard: require explicit confirmation for --hard reset
      if (mode === "hard" && confirm !== true) {
        throw new Error(
          "Safety guard: git reset --hard permanently discards all uncommitted changes (staged and unstaged). " +
            "This action cannot be undone. Set confirm=true to proceed.",
        );
      }

      // Gap #137: Validate files+mode combination before executing
      const validationError = validateResetArgs(mode, files);
      if (validationError) {
        throw new Error(validationError);
      }

      assertNoFlagInjection(ref, "ref");

      // Capture HEAD before reset for previousRef
      const headBefore = await git(["rev-parse", "HEAD"], cwd);
      const previousRef = headBefore.exitCode === 0 ? headBefore.stdout.trim() : undefined;

      // Build args: git reset [--mode] <ref> -- [files...]
      const args = ["reset"];
      if (mode) args.push(`--${mode}`);
      if (intentToAdd) args.push("-N");
      if (recurseSubmodules) args.push("--recurse-submodules");
      args.push(ref);

      if (files && files.length > 0) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        // Resolve file path casing — git pathspecs are case-sensitive even on Windows
        const resolvedFiles = await resolveFilePaths(files, cwd);
        args.push("--", ...resolvedFiles);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git reset failed: ${result.stderr}`);
      }

      // Capture HEAD after reset for newRef
      const headAfter = await git(["rev-parse", "HEAD"], cwd);
      const newRef = headAfter.exitCode === 0 ? headAfter.stdout.trim() : undefined;

      const resetResult = parseReset(result.stdout, result.stderr, ref, mode, previousRef, newRef);
      return dualOutput(resetResult, formatReset);
    },
  );
}
