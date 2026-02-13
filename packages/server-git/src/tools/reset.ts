import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseReset } from "../lib/parsers.js";
import { formatReset } from "../lib/formatters.js";
import { GitResetSchema } from "../schemas/index.js";

export function registerResetTool(server: McpServer) {
  server.registerTool(
    "reset",
    {
      title: "Git Reset",
      description:
        "Unstages files by resetting them to a ref (default: HEAD). Returns structured data with the ref and list of unstaged files. Use instead of running `git reset` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
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
      },
      outputSchema: GitResetSchema,
    },
    async ({ path, files, ref }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(ref, "ref");

      // Build args: git reset <ref> -- [files...]
      const args = ["reset", ref];

      if (files && files.length > 0) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        args.push("--", ...files);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git reset failed: ${result.stderr}`);
      }

      const resetResult = parseReset(result.stdout, result.stderr, ref);
      return dualOutput(resetResult, formatReset);
    },
  );
}
