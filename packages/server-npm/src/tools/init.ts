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
        license: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set the license field at init time (maps to --init-license)"),
        authorName: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set author name (maps to --init-author-name)"),
        authorEmail: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set author email (maps to --init-author-email)"),
        authorUrl: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set author URL (maps to --init-author-url)"),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Override default version '1.0.0' (maps to --init-version)"),
        module: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Set default module entry point (maps to --init-module)"),
        workspace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Create a workspace package (maps to npm --workspace)"),
        packageManager: packageManagerInput,
      },
      outputSchema: NpmInitSchema,
    },
    async ({
      path,
      yes,
      scope,
      force,
      private: isPrivate,
      license,
      authorName,
      authorEmail,
      authorUrl,
      version,
      module: initModule,
      workspace,
      packageManager,
    }) => {
      const cwd = path || process.cwd();
      if (scope) assertNoFlagInjection(scope, "scope");
      if (license) assertNoFlagInjection(license, "license");
      if (authorName) assertNoFlagInjection(authorName, "authorName");
      if (authorEmail) assertNoFlagInjection(authorEmail, "authorEmail");
      if (authorUrl) assertNoFlagInjection(authorUrl, "authorUrl");
      if (version) assertNoFlagInjection(version, "version");
      if (initModule) assertNoFlagInjection(initModule, "module");
      if (workspace) assertNoFlagInjection(workspace, "workspace");
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
      if (license) pmArgs.push(`--init-license=${license}`);
      if (authorName) pmArgs.push(`--init-author-name=${authorName}`);
      if (authorEmail) pmArgs.push(`--init-author-email=${authorEmail}`);
      if (authorUrl) pmArgs.push(`--init-author-url=${authorUrl}`);
      if (version) pmArgs.push(`--init-version=${version}`);
      if (initModule) pmArgs.push(`--init-module=${initModule}`);
      if (workspace && pm === "npm") pmArgs.push(`--workspace=${workspace}`);

      const result = await runPm(pm, pmArgs, cwd);
      const packageJsonPath = join(cwd, "package.json");

      let packageName = "unknown";
      let pkgVersion = "0.0.0";
      let success = result.exitCode === 0;

      if (success) {
        try {
          const raw = await readFile(packageJsonPath, "utf-8");
          const pkg = JSON.parse(raw);
          packageName = pkg.name ?? "unknown";
          pkgVersion = pkg.version ?? "0.0.0";
        } catch {
          success = false;
        }
      }

      const data = parseInitOutput(
        success,
        packageName,
        pkgVersion,
        packageJsonPath,
        result.stderr,
      );
      return dualOutput({ ...data, packageManager: pm }, formatInit);
    },
  );
}
