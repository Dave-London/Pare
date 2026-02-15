import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseRemoteOutput } from "../lib/parsers.js";
import { formatRemote, compactRemoteMap, formatRemoteCompact } from "../lib/formatters.js";
import { GitRemoteSchema } from "../schemas/index.js";

/** Registers the `remote` tool on the given MCP server. */
export function registerRemoteTool(server: McpServer) {
  server.registerTool(
    "remote",
    {
      title: "Git Remote",
      description:
        "Lists remote repositories with fetch and push URLs. Returns structured remote data. Use instead of running `git remote -v` in the terminal.",
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
      outputSchema: GitRemoteSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();
      const args = ["remote", "-v"];

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git remote failed: ${result.stderr}`);
      }

      const remotes = parseRemoteOutput(result.stdout);
      return compactDualOutput(
        remotes,
        result.stdout,
        formatRemote,
        compactRemoteMap,
        formatRemoteCompact,
        compact === false,
      );
    },
  );
}
