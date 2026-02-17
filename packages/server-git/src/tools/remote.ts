import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  dualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
} from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseRemoteOutput, parseRemoteShow, parseRemotePrune } from "../lib/parsers.js";
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
        "Manages remote repositories. Supports list (default), add, remove, rename, set-url, prune, and show actions. Returns structured remote data. Use instead of running `git remote` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["list", "add", "remove", "rename", "set-url", "prune", "show", "update"])
          .optional()
          .default("list")
          .describe("Remote action to perform (default: list)"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Remote name (required for add, remove, set-url, prune, show)"),
        url: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Remote URL (required for add and set-url actions)"),
        oldName: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Old remote name (required for rename action)"),
        newName: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("New remote name (required for rename action)"),
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
    async ({ path, action, name, url, oldName, newName, compact }) => {
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

      // Gap #133: rename
      if (action === "rename") {
        if (!oldName) {
          throw new Error("The 'oldName' parameter is required for remote rename");
        }
        if (!newName) {
          throw new Error("The 'newName' parameter is required for remote rename");
        }
        assertNoFlagInjection(oldName, "oldName");
        assertNoFlagInjection(newName, "newName");

        const result = await git(["remote", "rename", oldName, newName], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote rename failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            success: true,
            action: "rename" as const,
            name: newName,
            oldName,
            newName,
            message: `Remote '${oldName}' renamed to '${newName}'`,
          },
          formatRemoteMutate,
        );
      }

      // Gap #134: set-url
      if (action === "set-url") {
        if (!name) {
          throw new Error("The 'name' parameter is required for remote set-url");
        }
        if (!url) {
          throw new Error("The 'url' parameter is required for remote set-url");
        }
        assertNoFlagInjection(name, "name");
        assertNoFlagInjection(url, "url");

        const result = await git(["remote", "set-url", name, url], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote set-url failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            success: true,
            action: "set-url" as const,
            name,
            url,
            message: `Remote '${name}' URL set to ${url}`,
          },
          formatRemoteMutate,
        );
      }

      // Gap #135: prune
      if (action === "prune") {
        if (!name) {
          throw new Error("The 'name' parameter is required for remote prune");
        }
        assertNoFlagInjection(name, "name");

        const result = await git(["remote", "prune", name], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote prune failed: ${result.stderr}`);
        }

        const prunedBranches = parseRemotePrune(result.stdout, result.stderr);

        return dualOutput(
          {
            success: true,
            action: "prune" as const,
            name,
            prunedBranches,
            message:
              prunedBranches.length > 0
                ? `Pruned ${prunedBranches.length} stale branch(es) from '${name}'`
                : `Nothing to prune from '${name}'`,
          },
          formatRemoteMutate,
        );
      }

      // Gap #136: show
      if (action === "show") {
        if (!name) {
          throw new Error("The 'name' parameter is required for remote show");
        }
        assertNoFlagInjection(name, "name");

        const result = await git(["remote", "show", name], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote show failed: ${result.stderr}`);
        }

        const showDetails = parseRemoteShow(result.stdout);

        return dualOutput(
          {
            success: true,
            action: "show" as const,
            name,
            showDetails,
            message: `Remote '${name}' details`,
          },
          formatRemoteMutate,
        );
      }

      if (action === "update") {
        const args = ["remote", "update"];
        if (name) {
          assertNoFlagInjection(name, "name");
          args.push(name);
        }
        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git remote update failed: ${result.stderr}`);
        }
        return dualOutput(
          {
            success: true,
            action: "update" as const,
            name: name || "all",
            message: name ? `Remote '${name}' updated` : "All remotes updated",
          },
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
      for (const remote of remotes.remotes) {
        const showResult = await git(["remote", "show", remote.name], cwd);
        if (showResult.exitCode !== 0) continue;
        const showDetails = parseRemoteShow(showResult.stdout);
        if (showDetails.localBranches && showDetails.localBranches.length > 0) {
          remote.trackedBranches = showDetails.localBranches;
        }
      }
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
