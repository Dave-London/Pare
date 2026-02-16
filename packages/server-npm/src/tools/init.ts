import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseInitOutput } from "../lib/parsers.js";
import { formatInit } from "../lib/formatters.js";
import { NpmInitSchema } from "../schemas/index.js";
import { packageManagerInput } from "../lib/pm-input.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Registers the `init` tool on the given MCP server. */
export function registerInitTool(server: McpServer) {
  server.registerTool(
    "init",
    {
      title: "Init Package",
      description:
        "Initializes a new package.json in the target directory. " +
        "Works with npm, pnpm, and yarn. Returns structured output with the package name, version, and path.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory to initialize (default: cwd)"),
        yes: z
          .boolean()
          .optional()
          .default(true)
          .describe("Use -y flag for non-interactive init with defaults (default: true)"),
        scope: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("npm scope for the package (e.g., '@myorg')"),
        force: z.boolean().optional().describe("Overwrite existing package.json (maps to --force)"),
        private: z
          .boolean()
          .optional()
          .describe("Set private: true in package.json (maps to yarn --private)"),
        packageManager: packageManagerInput,
      },
      outputSchema: NpmInitSchema,
    },
    async ({ path, yes, scope, force, private: isPrivate, packageManager }) => {
      const cwd = path || process.cwd();
      if (scope) assertNoFlagInjection(scope, "scope");
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs = ["init"];
      if (scope) {
        pmArgs.push(`--scope=${scope}`);
      }
      if (yes !== false) {
        pmArgs.push("-y");
      }
      if (force) {
        pmArgs.push("--force");
      }
      if (isPrivate && pm === "yarn") {
        pmArgs.push("--private");
      }

      const result = await runPm(pm, pmArgs, cwd);
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
          success = false;
        }
      }

      const data = parseInitOutput(success, packageName, version, packageJsonPath);
      return dualOutput({ ...data, packageManager: pm }, formatInit);
    },
  );
}
