import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { formatArchive } from "../lib/formatters.js";
import { GitArchiveSchema } from "../schemas/index.js";

/** Registers the `archive` tool on the given MCP server. */
export function registerArchiveTool(server: McpServer) {
  server.registerTool(
    "archive",
    {
      title: "Git Archive",
      description:
        "Creates an archive of files from a git repository. Supports tar, tar.gz, and zip formats. Returns structured data with success status, format, output file, and treeish.",
      inputSchema: {
        path: repoPathInput,
        treeish: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("HEAD")
          .describe("Tree-ish to archive (default: HEAD)"),
        format: z
          .enum(["tar", "tar.gz", "zip"])
          .optional()
          .describe("Archive format (default: inferred from output file, or tar)"),
        output: z.string().max(INPUT_LIMITS.PATH_MAX).describe("Output file path (required)"),
        prefix: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Prepend prefix to each filename in the archive (--prefix)"),
        paths: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific paths to include in the archive"),
      },
      outputSchema: GitArchiveSchema,
    },
    async ({ path, treeish, format, output, prefix, paths }) => {
      const cwd = path || process.cwd();

      if (!output) {
        throw new Error("The 'output' parameter is required for git archive");
      }

      assertNoFlagInjection(treeish, "treeish");
      assertNoFlagInjection(output, "output");
      if (prefix) assertNoFlagInjection(prefix, "prefix");
      if (paths) {
        for (const p of paths) {
          assertNoFlagInjection(p, "paths");
        }
      }

      // Determine format
      let resolvedFormat = format;
      if (!resolvedFormat) {
        if (output.endsWith(".tar.gz") || output.endsWith(".tgz")) {
          resolvedFormat = "tar.gz";
        } else if (output.endsWith(".zip")) {
          resolvedFormat = "zip";
        } else {
          resolvedFormat = "tar";
        }
      }

      const args = ["archive"];
      args.push(`--format=${resolvedFormat}`);
      args.push("-o", output);
      if (prefix) args.push(`--prefix=${prefix}`);
      args.push(treeish);
      if (paths && paths.length > 0) {
        args.push("--", ...paths);
      }

      const result = await git(args, cwd);
      if (result.exitCode !== 0) {
        throw new Error(`git archive failed: ${result.stderr}`);
      }

      return dualOutput(
        {
          success: true,
          message: `Archive created: ${output} (${resolvedFormat}) from ${treeish}`,
        },
        formatArchive,
      );
    },
  );
}
