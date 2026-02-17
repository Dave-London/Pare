import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pyenv } from "../lib/python-runner.js";
import { parsePyenvOutput } from "../lib/parsers.js";
import { formatPyenv, compactPyenvMap, formatPyenvCompact } from "../lib/formatters.js";
import { PyenvResultSchema } from "../schemas/index.js";

const ACTIONS = [
  "versions",
  "version",
  "install",
  "installList",
  "local",
  "global",
  "uninstall",
] as const;

/** Registers the `pyenv` tool on the given MCP server. */
export function registerPyenvTool(server: McpServer) {
  server.registerTool(
    "pyenv",
    {
      title: "pyenv",
      description: "Manages Python versions via pyenv.",
      inputSchema: {
        action: z.enum(ACTIONS).describe("The pyenv action to perform"),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Python version string (required for install/uninstall/local/global, e.g. '3.12.0')",
          ),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Working directory"),
        skipExisting: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip installation if version is already installed (--skip-existing)"),
        force: z
          .boolean()
          .optional()
          .default(false)
          .describe("Force reinstallation of an already installed version (--force)"),
        unset: z
          .boolean()
          .optional()
          .default(false)
          .describe("Clear local/global version setting (--unset)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: PyenvResultSchema,
    },
    async ({ action, version, path, skipExisting, force, unset, compact }) => {
      const cwd = path || process.cwd();
      if (version) assertNoFlagInjection(version, "version");

      const args: string[] = [];

      switch (action) {
        case "versions":
          // Do NOT use --bare: it strips the * marker needed for current version detection
          args.push("versions");
          break;
        case "version":
          args.push("version");
          break;
        case "install":
          if (!version) {
            return {
              content: [
                { type: "text" as const, text: "Error: version is required for install action" },
              ],
              isError: true,
            };
          }
          args.push("install");
          if (skipExisting) args.push("--skip-existing");
          if (force) args.push("--force");
          args.push(version);
          break;
        case "uninstall":
          if (!version) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: version is required for uninstall action",
                },
              ],
              isError: true,
            };
          }
          // -f for non-interactive uninstall
          args.push("uninstall", "-f", version);
          break;
        case "installList":
          args.push("install", "--list");
          break;
        case "local":
          if (unset) {
            args.push("local", "--unset");
          } else if (!version) {
            // Without a version argument, pyenv local shows the current local version
            args.push("local");
          } else {
            args.push("local", version);
          }
          break;
        case "global":
          if (unset) {
            args.push("global", "--unset");
          } else if (!version) {
            // Without a version argument, pyenv global shows the current global version
            args.push("global");
          } else {
            args.push("global", version);
          }
          break;
      }

      const result = await pyenv(args, cwd);
      const data = parsePyenvOutput(result.stdout, result.stderr, result.exitCode, action);
      return compactDualOutput(
        data,
        result.stdout,
        formatPyenv,
        compactPyenvMap,
        formatPyenvCompact,
        compact === false,
      );
    },
  );
}
