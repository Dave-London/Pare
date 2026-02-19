import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseConfigList } from "../lib/parsers.js";
import { formatConfig } from "../lib/formatters.js";
import { GitConfigSchema } from "../schemas/index.js";

/** Registers the `config` tool on the given MCP server. */
export function registerConfigTool(server: McpServer) {
  server.registerTool(
    "config",
    {
      title: "Git Config",
      description:
        "Manages git configuration values. Supports get, set, list, and unset actions. Operates at local, global, system, or worktree scope.",
      inputSchema: {
        path: repoPathInput,
        action: z
          .enum(["get", "set", "list", "unset"])
          .optional()
          .default("get")
          .describe("Config action to perform (default: get)"),
        key: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Config key (required for get, set, unset)"),
        value: z
          .string()
          .max(INPUT_LIMITS.MESSAGE_MAX)
          .optional()
          .describe("Config value (required for set action)"),
        scope: z
          .enum(["local", "global", "system", "worktree"])
          .optional()
          .describe("Config scope (default: effective scope for get/list, local for set)"),
      },
      outputSchema: GitConfigSchema,
    },
    async ({ path, action, key, value, scope }) => {
      const cwd = path || process.cwd();

      const scopeFlag = scope ? `--${scope}` : undefined;

      if (action === "set") {
        if (!key) {
          throw new Error("The 'key' parameter is required for config set");
        }
        if (value === undefined || value === null) {
          throw new Error("The 'value' parameter is required for config set");
        }
        assertNoFlagInjection(key, "key");
        assertNoFlagInjection(value, "value");

        const args = ["config"];
        if (scopeFlag) args.push(scopeFlag);
        args.push(key, value);

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git config set failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            action: "set" as const,
            entries: [{ key, value, ...(scope ? { scope } : {}) }],
            success: true,
            message: `Config '${key}' set to '${value}'${scope ? ` [${scope}]` : ""}`,
          },
          formatConfig,
        );
      }

      if (action === "unset") {
        if (!key) {
          throw new Error("The 'key' parameter is required for config unset");
        }
        assertNoFlagInjection(key, "key");

        const args = ["config"];
        if (scopeFlag) args.push(scopeFlag);
        args.push("--unset", key);

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git config unset failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            action: "unset" as const,
            success: true,
            message: `Config '${key}' unset${scope ? ` [${scope}]` : ""}`,
          },
          formatConfig,
        );
      }

      if (action === "list") {
        const args = ["config"];
        if (scopeFlag) args.push(scopeFlag);
        args.push("--list");

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git config list failed: ${result.stderr}`);
        }

        const entries = parseConfigList(result.stdout, scope);
        return dualOutput(
          {
            action: "list" as const,
            entries,
            success: true,
            message: `${entries.length} config entries`,
          },
          formatConfig,
        );
      }

      // Default: get
      if (!key) {
        throw new Error("The 'key' parameter is required for config get");
      }
      assertNoFlagInjection(key, "key");

      const args = ["config"];
      if (scopeFlag) args.push(scopeFlag);
      args.push(key);

      const result = await git(args, cwd);
      if (result.exitCode !== 0) {
        throw new Error(`git config get failed: ${result.stderr}`);
      }

      const configValue = result.stdout.trim();
      return dualOutput(
        {
          action: "get" as const,
          entries: [{ key, value: configValue, ...(scope ? { scope } : {}) }],
          success: true,
          message: `${key}=${configValue}`,
        },
        formatConfig,
      );
    },
  );
}
