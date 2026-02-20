import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCleanOutput } from "../lib/parsers.js";
import { formatClean } from "../lib/formatters.js";
import { GitCleanSchema } from "../schemas/index.js";

/** Registers the `clean` tool on the given MCP server. */
export function registerCleanTool(server: McpServer) {
  server.registerTool(
    "clean",
    {
      title: "Git Clean",
      description:
        "Removes untracked files from the working tree. DEFAULTS TO DRY-RUN MODE for safety — shows what would be removed without actually deleting. Set force=true AND dryRun=false to actually remove files.",
      inputSchema: {
        path: repoPathInput,
        dryRun: z
          .boolean()
          .optional()
          .default(true)
          .describe("Dry-run mode — list files without removing (default: true for safety)"),
        force: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Force removal (-f). Must be true and dryRun must be false to actually remove files.",
          ),
        directories: z.boolean().optional().describe("Also remove untracked directories (-d)"),
        ignored: z.boolean().optional().describe("Also remove ignored files (-x)"),
        onlyIgnored: z.boolean().optional().describe("Only remove ignored files (-X)"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Exclude patterns (-e)"),
        paths: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Limit to specific paths"),
      },
      outputSchema: GitCleanSchema,
    },
    async ({ path, dryRun, force, directories, ignored, onlyIgnored, exclude, paths }) => {
      const cwd = path || process.cwd();

      // Safety: default to dry-run. Only actually clean when force=true AND dryRun=false.
      const isDryRun = dryRun !== false || !force;

      if (exclude) {
        for (const e of exclude) {
          assertNoFlagInjection(e, "exclude");
        }
      }
      if (paths) {
        for (const p of paths) {
          assertNoFlagInjection(p, "paths");
        }
      }

      const args = ["clean"];

      if (isDryRun) {
        args.push("--dry-run");
      } else {
        args.push("-f");
      }

      if (directories) args.push("-d");
      if (ignored) args.push("-x");
      if (onlyIgnored) args.push("-X");

      if (exclude) {
        for (const pattern of exclude) {
          args.push("-e", pattern);
        }
      }

      if (paths && paths.length > 0) {
        args.push("--", ...paths);
      }

      const result = await git(args, cwd);
      if (result.exitCode !== 0) {
        throw new Error(`git clean failed: ${result.stderr}`);
      }

      const cleanResult = parseCleanOutput(result.stdout, isDryRun);
      return dualOutput(cleanResult, formatClean);
    },
  );
}
