import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pyenv } from "../lib/python-runner.js";
import { parsePyenvOutput } from "../lib/parsers.js";
import { formatPyenv, compactPyenvMap, formatPyenvCompact } from "../lib/formatters.js";
import { PyenvResultSchema } from "../schemas/index.js";

const ACTIONS = ["versions", "version", "install", "local", "global"] as const;

export function registerPyenvTool(server: McpServer) {
  server.registerTool(
    "pyenv",
    {
      title: "pyenv",
      description:
        "Manages Python versions via pyenv. " +
        "Actions: `versions` (list installed), `version` (show current), " +
        "`install` (install a version), `local` (set local version), `global` (set global version). ",
      inputSchema: {
        action: z.enum(ACTIONS).describe("The pyenv action to perform"),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Python version string (required for install/local/global, e.g. '3.12.0')"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: PyenvResultSchema,
    },
    async ({ action, version, path, compact }) => {
      const cwd = path || process.cwd();
      if (version) assertNoFlagInjection(version, "version");

      const args: string[] = [];

      switch (action) {
        case "versions":
          args.push("versions", "--bare");
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
          args.push("install", version);
          break;
        case "local":
          if (!version) {
            // Without a version argument, pyenv local shows the current local version
            args.push("local");
          } else {
            args.push("local", version);
          }
          break;
        case "global":
          if (!version) {
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
