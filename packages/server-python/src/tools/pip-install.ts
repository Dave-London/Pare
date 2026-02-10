import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { pip } from "../lib/python-runner.js";
import { parsePipInstall } from "../lib/parsers.js";
import { formatPipInstall } from "../lib/formatters.js";
import { PipInstallSchema } from "../schemas/index.js";

export function registerPipInstallTool(server: McpServer) {
  server.registerTool(
    "pip-install",
    {
      title: "pip Install",
      description:
        "Runs pip install and returns a structured summary of installed packages. Use instead of running `pip install` in the terminal.",
      inputSchema: {
        packages: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Packages to install (empty for requirements.txt)"),
        requirements: z.string().optional().describe("Path to requirements file"),
        path: z.string().optional().describe("Working directory (default: cwd)"),
      },
      outputSchema: PipInstallSchema,
    },
    async ({ packages, requirements, path }) => {
      const cwd = path || process.cwd();
      const args = ["install"];
      if (requirements) {
        args.push("-r", requirements);
      } else if (packages && packages.length > 0) {
        args.push(...packages);
      } else {
        args.push("-r", "requirements.txt");
      }

      const result = await pip(args, cwd);
      const data = parsePipInstall(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatPipInstall);
    },
  );
}
