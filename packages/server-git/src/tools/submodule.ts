import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseSubmoduleStatus } from "../lib/parsers.js";
import { formatSubmodule } from "../lib/formatters.js";
import { GitSubmoduleSchema } from "../schemas/index.js";

/** Registers the `submodule` tool on the given MCP server. */
export function registerSubmoduleTool(server: McpServer) {
  server.registerTool(
    "submodule",
    {
      title: "Git Submodule",
      description:
        "Manages git submodules. Supports list (default), add, update, sync, and deinit actions. List returns structured submodule data with path, SHA, branch, and status.",
      inputSchema: {
        path: repoPathInput,
        action: z
          .enum(["list", "add", "update", "sync", "deinit"])
          .optional()
          .default("list")
          .describe("Submodule action to perform (default: list)"),
        url: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository URL (required for add action)"),
        submodulePath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Submodule path (optional for add, required for deinit)"),
        init: z
          .boolean()
          .optional()
          .describe("Initialize submodules (--init, used with update action)"),
        recursive: z.boolean().optional().describe("Recurse into submodules (--recursive)"),
        remote: z
          .boolean()
          .optional()
          .describe("Fetch from remote (--remote, used with update action)"),
        force: z.boolean().optional().describe("Force operation (-f, used with deinit action)"),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch to track (-b, used with add action)"),
      },
      outputSchema: GitSubmoduleSchema,
    },
    async ({ path, action, url, submodulePath, init, recursive, remote, force, branch }) => {
      const cwd = path || process.cwd();

      if (action === "add") {
        if (!url) {
          throw new Error("The 'url' parameter is required for submodule add");
        }
        assertNoFlagInjection(url, "url");
        if (submodulePath) assertNoFlagInjection(submodulePath, "submodulePath");
        if (branch) assertNoFlagInjection(branch, "branch");

        const args = ["submodule", "add"];
        if (branch) args.push("-b", branch);
        args.push(url);
        if (submodulePath) args.push(submodulePath);

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git submodule add failed: ${result.stderr}`);
        }

        const targetPath =
          submodulePath ||
          url
            .split("/")
            .pop()
            ?.replace(/\.git$/, "") ||
          url;
        return dualOutput(
          {
            action: "add" as const,
            success: true,
            message: `Submodule '${targetPath}' added from ${url}`,
          },
          formatSubmodule,
        );
      }

      if (action === "update") {
        const args = ["submodule", "update"];
        if (init) args.push("--init");
        if (recursive) args.push("--recursive");
        if (remote) args.push("--remote");

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git submodule update failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            action: "update" as const,
            success: true,
            message: "Submodules updated successfully",
          },
          formatSubmodule,
        );
      }

      if (action === "sync") {
        const args = ["submodule", "sync"];
        if (recursive) args.push("--recursive");

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git submodule sync failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            action: "sync" as const,
            success: true,
            message: "Submodule URLs synced successfully",
          },
          formatSubmodule,
        );
      }

      if (action === "deinit") {
        if (!submodulePath) {
          throw new Error("The 'submodulePath' parameter is required for submodule deinit");
        }
        assertNoFlagInjection(submodulePath, "submodulePath");

        const args = ["submodule", "deinit"];
        if (force) args.push("-f");
        args.push(submodulePath);

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git submodule deinit failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            action: "deinit" as const,
            success: true,
            message: `Submodule '${submodulePath}' deinitialized`,
          },
          formatSubmodule,
        );
      }

      // Default: list
      const result = await git(["submodule", "status"], cwd);
      if (result.exitCode !== 0) {
        throw new Error(`git submodule status failed: ${result.stderr}`);
      }

      const submodules = parseSubmoduleStatus(result.stdout);
      return dualOutput(
        {
          action: "list" as const,
          submodules,
          success: true,
          message:
            submodules.length > 0
              ? `${submodules.length} submodule(s) found`
              : "No submodules found",
        },
        formatSubmodule,
      );
    },
  );
}
