import { z } from "zod";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";

const DANGEROUS_CONFIG_KEYS = new Set([
  "core.fsmonitor",
  "core.pager",
  "core.editor",
  "core.sshcommand",
  "core.hookspath",
  "core.askpass",
  "diff.external",
  "merge.tool",
  "credential.helper",
  "filter.lfs.clean",
  "filter.lfs.smudge",
  "filter.lfs.process",
]);

function assertSafeConfigKey(key: string): void {
  const lower = key.toLowerCase();
  if (DANGEROUS_CONFIG_KEYS.has(lower)) {
    throw new Error(
      `Setting "${key}" is blocked because it can execute arbitrary commands. ` +
        `Blocked keys: ${[...DANGEROUS_CONFIG_KEYS].sort().join(", ")}`,
    );
  }
}
import { git } from "../lib/git-runner.js";

/**
 * Returns true when `core.hooksPath` may be set to `value` (#1094): local or
 * worktree scope only, a relative path that resolves (symlinks included) to a
 * directory inside the working tree, and that directory holds tracked files.
 * The hooks are then repo-tracked code the user already runs, e.g. `.githooks`.
 * Git resolves a relative hooksPath against the working-tree root, so we do too.
 */
async function isInRepoHooksPath(value: string, scope: string | undefined, cwd: string) {
  if (scope === "global" || scope === "system") return false;
  if (!value || isAbsolute(value) || /^[a-zA-Z]:/.test(value) || value.startsWith("~")) {
    return false;
  }

  const top = await git(["rev-parse", "--show-toplevel"], cwd);
  if (top.exitCode !== 0) return false;
  const root = top.stdout.trim();

  let realRoot: string;
  let realTarget: string;
  try {
    realRoot = realpathSync.native(root);
    realTarget = realpathSync.native(resolve(root, value));
    if (!statSync(realTarget).isDirectory()) return false;
  } catch {
    return false;
  }
  const rel = relative(realRoot, realTarget);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return false;

  const tracked = await git(
    ["--literal-pathspecs", "ls-files", "--", rel.replace(/\\/g, "/")],
    realRoot,
  );
  return tracked.exitCode === 0 && tracked.stdout.trim() !== "";
}
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
      annotations: { readOnlyHint: true },
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
        if (key.toLowerCase() === "core.hookspath") {
          if (!(await isInRepoHooksPath(value, scope, cwd))) {
            throw new Error(
              `Setting "${key}" is blocked unless the value is a relative path to a directory of ` +
                `tracked files inside this working tree (e.g. ".githooks"), set at local or worktree scope.`,
            );
          }
        } else {
          assertSafeConfigKey(key);
        }

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
