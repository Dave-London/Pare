import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseInitOutput } from "../lib/parsers.js";
import { formatInit } from "../lib/formatters.js";
import { NpmInitSchema } from "../schemas/index.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function registerInitTool(server: McpServer) {
  server.registerTool(
    "init",
    {
      title: "npm Init",
      description:
        "Initializes a new package.json in the target directory. Returns structured output with the package name, version, and path.",
      inputSchema: {
        path: z.string().optional().describe("Directory to initialize (default: cwd)"),
        yes: z
          .boolean()
          .optional()
          .default(true)
          .describe("Use -y flag for non-interactive init with defaults (default: true)"),
        scope: z.string().optional().describe("npm scope for the package (e.g., '@myorg')"),
      },
      outputSchema: NpmInitSchema,
    },
    async ({ path, yes, scope }) => {
      const cwd = path || process.cwd();
      if (scope) assertNoFlagInjection(scope, "scope");

      const npmArgs = ["init"];
      if (scope) {
        npmArgs.push(`--scope=${scope}`);
      }
      if (yes !== false) {
        npmArgs.push("-y");
      }

      const result = await npm(npmArgs, cwd);
      const packageJsonPath = join(cwd, "package.json");

      let packageName = "unknown";
      let version = "0.0.0";
      let success = result.exitCode === 0;

      if (success) {
        try {
          const raw = await readFile(packageJsonPath, "utf-8");
          const pkg = JSON.parse(raw);
          packageName = pkg.name ?? "unknown";
          version = pkg.version ?? "0.0.0";
        } catch {
          // package.json might not exist if init failed silently
          success = false;
        }
      }

      const data = parseInitOutput(success, packageName, version, packageJsonPath);
      return dualOutput(data, formatInit);
    },
  );
}
