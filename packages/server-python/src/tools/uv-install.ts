import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { uv } from "../lib/python-runner.js";
import { parseUvInstall } from "../lib/parsers.js";
import { formatUvInstall } from "../lib/formatters.js";
import { UvInstallSchema } from "../schemas/index.js";

export function registerUvInstallTool(server: McpServer) {
  server.registerTool(
    "uv-install",
    {
      title: "uv Install",
      description:
        "Runs uv pip install and returns a structured summary of installed packages. Use instead of running `uv pip install` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Working directory (default: cwd)"),
        packages: z
          .array(z.string())
          .optional()
          .describe("Packages to install"),
        requirements: z
          .string()
          .optional()
          .describe("Path to requirements file"),
      },
      outputSchema: UvInstallSchema,
    },
    async ({ path, packages, requirements }) => {
      const cwd = path || process.cwd();
      const args = ["pip", "install"];

      if (requirements) {
        args.push("-r", requirements);
      } else if (packages && packages.length > 0) {
        args.push(...packages);
      } else {
        args.push("-r", "requirements.txt");
      }

      const result = await uv(args, cwd);
      const data = parseUvInstall(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatUvInstall);
    },
  );
}
