import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseInfoJson } from "../lib/parsers.js";
import { formatInfo, compactInfoMap, formatInfoCompact } from "../lib/formatters.js";
import { NpmInfoSchema } from "../schemas/index.js";
import { packageManagerInput } from "../lib/pm-input.js";

/** Registers the `info` tool on the given MCP server. */
export function registerInfoTool(server: McpServer) {
  server.registerTool(
    "info",
    {
      title: "Package Info",
      description:
        "Shows detailed package metadata from the npm registry. " +
        "Works with npm, pnpm, and yarn (all query the same registry).",
      inputSchema: {
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Package name to look up (e.g. 'express', 'lodash@4.17.21')"),
        path: projectPathInput,
        registry: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Registry URL to query (maps to --registry, e.g., 'https://npm.pkg.github.com')",
          ),
        field: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Query a single field (e.g., 'engines', 'peerDependencies', 'versions')"),
        workspace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Workspace for scoped queries (maps to --workspace for npm)"),
        compact: compactInput,
        packageManager: packageManagerInput,
      },
      outputSchema: NpmInfoSchema,
    },
    async ({ package: pkg, path, registry, field, workspace, compact, packageManager }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(pkg, "package");
      if (registry) assertNoFlagInjection(registry, "registry");
      if (field) assertNoFlagInjection(field, "field");
      if (workspace) assertNoFlagInjection(workspace, "workspace");
      const pm = await detectPackageManager(cwd, packageManager);

      // All package managers query the npm registry; yarn uses "info" as well
      const pmArgs = ["info", pkg, "--json"];
      if (registry) pmArgs.push(`--registry=${registry}`);
      if (field) pmArgs.push(field);
      if (workspace && pm === "npm") pmArgs.push(`--workspace=${workspace}`);

      const result = await runPm(pm, pmArgs, cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`${pm} info failed: ${result.stderr}`);
      }

      // Yarn Classic wraps the result in { type: "inspect", data: { ... } }
      let jsonStr = result.stdout;
      if (pm === "yarn") {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === "inspect" && parsed.data) {
            jsonStr = JSON.stringify(parsed.data);
          }
        } catch {
          // fall through, let parseInfoJson handle it
        }
      }

      const info = parseInfoJson(jsonStr);
      const infoWithPm = { ...info, packageManager: pm };
      return compactDualOutput(
        infoWithPm,
        result.stdout,
        formatInfo,
        compactInfoMap,
        formatInfoCompact,
        compact === false,
      );
    },
  );
}
