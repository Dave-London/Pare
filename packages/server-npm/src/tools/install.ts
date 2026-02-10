import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
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
        "Runs npm install and returns a structured summary of added/removed packages and vulnerabilities",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional arguments (e.g., package names to install)"),
      },
      outputSchema: NpmInstallSchema,
    },
    async ({ path, args }) => {
      const cwd = path || process.cwd();
      const start = Date.now();
      const result = await npm(["install", ...(args || [])], cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const output = result.stdout + "\n" + result.stderr;
      const install = parseInstallOutput(output, duration);
      return dualOutput(install, formatInstall);
    },
  );
}
