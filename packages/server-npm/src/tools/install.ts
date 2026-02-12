import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseInstallOutput } from "../lib/parsers.js";
import { formatInstall } from "../lib/formatters.js";
import { NpmInstallSchema } from "../schemas/index.js";

export function registerInstallTool(server: McpServer) {
  server.registerTool(
    "install",
    {
      title: "npm Install",
      description:
        "Runs npm install and returns a structured summary of added/removed packages and vulnerabilities. " +
        "Use instead of running `npm install` in the terminal. " +
        "Lifecycle scripts (preinstall/postinstall) are skipped by default for safety. " +
        "Set ignoreScripts to false if packages need postinstall scripts to work (e.g., esbuild, sharp).",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments (e.g., package names to install)"),
        ignoreScripts: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Skip lifecycle scripts (preinstall/postinstall). Defaults to true for safety. Set to false if packages need postinstall scripts to run (e.g., esbuild, sharp).",
          ),
      },
      outputSchema: NpmInstallSchema,
    },
    async ({ path, args, ignoreScripts }) => {
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cwd = path || process.cwd();
      const flags: string[] = [];
      if (ignoreScripts) flags.push("--ignore-scripts");
      const start = Date.now();
      const result = await npm(["install", ...flags, ...(args || [])], cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const output = result.stdout + "\n" + result.stderr;
      const install = parseInstallOutput(output, duration);
      return dualOutput(install, formatInstall);
    },
  );
}
