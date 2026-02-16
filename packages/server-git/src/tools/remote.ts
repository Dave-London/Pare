import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
} from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseRemoteOutput } from "../lib/parsers.js";
import {
  formatRemote,
  compactRemoteMap,
  formatRemoteCompact,
  formatRemoteMutate,
} from "../lib/formatters.js";
import { GitRemoteSchema } from "../schemas/index.js";

/** Registers the `remote` tool on the given MCP server. */
export function registerRemoteTool(server: McpServer) {
  server.registerTool(
    "remote",
    {
      title: "Git Remote",
      description:
        "Manages remote repositories. Supports list (default), add, and remove actions. Returns structured remote data. Use instead of running `git remote` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["list", "add", "remove"])
          .optional()
          .default("list")
          .describe("Remote action to perform (default: list)"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Remote name (required for add and remove actions)"),
        url: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Remote URL (required for add action)"),
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
    async ({ path, action, name, url, compact }) => {
      const cwd = path || process.cwd();

      if (action === "add") {
        if (!name) {
          throw new Error("The 'name' parameter is required for remote add");
        }
        if (!url) {
          throw new Error("The 'url' parameter is required for remote add");
        }
        assertNoFlagInjection(name, "name");
        assertNoFlagInjection(url, "url");

        const result = await git(["remote", "add", name, url], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote add failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            success: true,
            action: "add" as const,
            name,
            url,
            message: `Remote '${name}' added with URL ${url}`,
          },
          formatRemoteMutate,
        );
      }

      if (action === "remove") {
        if (!name) {
          throw new Error("The 'name' parameter is required for remote remove");
        }
        assertNoFlagInjection(name, "name");

        const result = await git(["remote", "remove", name], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote remove failed: ${result.stderr}`);
        }

        return dualOutput(
          { success: true, action: "remove" as const, name, message: `Remote '${name}' removed` },
          formatRemoteMutate,
        );
      }

      // Default: list
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
