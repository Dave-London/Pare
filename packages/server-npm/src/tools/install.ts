import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
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
        "WARNING: Installing npm packages may execute lifecycle scripts (preinstall/postinstall). " +
        "Only install trusted packages. Set ignoreScripts to true to skip lifecycle scripts.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional arguments (e.g., package names to install)"),
        ignoreScripts: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Skip lifecycle scripts (preinstall/postinstall) via --ignore-scripts. Recommended for untrusted packages.",
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
