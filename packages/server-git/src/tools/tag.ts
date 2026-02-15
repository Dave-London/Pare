import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseTagOutput } from "../lib/parsers.js";
import { formatTag, compactTagMap, formatTagCompact } from "../lib/formatters.js";
import { GitTagSchema } from "../schemas/index.js";

/** Registers the `tag` tool on the given MCP server. */
export function registerTagTool(server: McpServer) {
  server.registerTool(
    "tag",
    {
      title: "Git Tag",
      description:
        "Lists tags sorted by creation date. Returns structured tag data with name, date, and message. Use instead of running `git tag` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitTagSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const args = [
        "tag",
        "-l",
        "--sort=-creatordate",
        "--format=%(refname:short)\t%(creatordate:iso-strict)\t%(subject)",
      ];

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git tag failed: ${result.stderr}`);
      }

      const tags = parseTagOutput(result.stdout);
      return compactDualOutput(
        tags,
        result.stdout,
        formatTag,
        compactTagMap,
        formatTagCompact,
        compact === false,
      );
    },
  );
}
