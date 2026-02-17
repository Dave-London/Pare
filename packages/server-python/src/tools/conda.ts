import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { conda } from "../lib/python-runner.js";
import {
  parseCondaListJson,
  parseCondaInfoJson,
  parseCondaEnvListJson,
  parseCondaMutationJson,
} from "../lib/parsers.js";
import {
  formatCondaResult,
  compactCondaResultMap,
  formatCondaResultCompact,
} from "../lib/formatters.js";

/** Registers the `conda` tool on the given MCP server. */
export function registerCondaTool(server: McpServer) {
  server.registerTool(
    "conda",
    {
      title: "Conda",
      description:
        "Runs conda commands (list, info, env-list, create, remove, update) and returns structured JSON output. " +
        "Use instead of running `conda` in the terminal.",
      inputSchema: {
        action: z
          .enum(["list", "info", "env-list", "create", "remove", "update"])
          .describe(
            "Conda action to perform: list packages, show info, list environments, create/remove/update environments",
          ),
        name: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Environment name (used with 'list' action to list packages in a specific env)",
          ),
        prefix: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Environment prefix path as alternative to name (--prefix DIR)"),
        packageFilter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Regex filter for conda list to show only matching packages"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Packages used by create/remove/update actions"),
        all: z
          .boolean()
          .optional()
          .default(false)
          .describe("For update action, update all installed packages (--all)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      // MCP listTools expects an object-shaped schema; discriminated unions can be omitted.
      outputSchema: z.object({ action: z.string() }).passthrough(),
    },
    async ({ action, name, prefix, packageFilter, packages, all, path, compact }) => {
      const cwd = path || process.cwd();
      if (name) assertNoFlagInjection(name, "name");
      if (prefix) assertNoFlagInjection(prefix, "prefix");
      if (packageFilter) assertNoFlagInjection(packageFilter, "packageFilter");
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }

      switch (action) {
        case "list": {
          const args = ["list", "--json"];
          if (name) args.push("--name", name);
          else if (prefix) args.push("--prefix", prefix);
          if (packageFilter) args.push(packageFilter);
          const result = await conda(args, cwd);
          const data = parseCondaListJson(result.stdout, name);
          return compactDualOutput(
            data,
            result.stdout,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "info": {
          const result = await conda(["info", "--json"], cwd);
          const data = parseCondaInfoJson(result.stdout);
          return compactDualOutput(
            data,
            result.stdout,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "env-list": {
          // Get env list and info (for active prefix) in parallel
          const [envResult, infoResult] = await Promise.all([
            conda(["env", "list", "--json"], cwd),
            conda(["info", "--json"], cwd),
          ]);
          let activePrefix: string | undefined;
          try {
            const infoData = JSON.parse(infoResult.stdout);
            activePrefix = infoData.active_prefix || undefined;
          } catch {
            // ignore parse errors for active prefix detection
          }
          const data = parseCondaEnvListJson(envResult.stdout, activePrefix);
          return compactDualOutput(
            data,
            envResult.stdout,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "create": {
          const args = ["create", "--json", "-y"];
          if (name) args.push("--name", name);
          else if (prefix) args.push("--prefix", prefix);
          args.push(...(packages ?? []));
          const result = await conda(args, cwd);
          const data = parseCondaMutationJson(result.stdout, result.stderr, "create", name, prefix);
          return compactDualOutput(
            data,
            `${result.stdout}\n${result.stderr}`,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "remove": {
          const args = ["remove", "--json", "-y"];
          if (name) args.push("--name", name);
          else if (prefix) args.push("--prefix", prefix);
          args.push(...(packages ?? []));
          const result = await conda(args, cwd);
          const data = parseCondaMutationJson(result.stdout, result.stderr, "remove", name, prefix);
          return compactDualOutput(
            data,
            `${result.stdout}\n${result.stderr}`,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
        case "update": {
          const args = ["update", "--json", "-y"];
          if (name) args.push("--name", name);
          else if (prefix) args.push("--prefix", prefix);
          if (all) args.push("--all");
          args.push(...(packages ?? []));
          const result = await conda(args, cwd);
          const data = parseCondaMutationJson(result.stdout, result.stderr, "update", name, prefix);
          return compactDualOutput(
            data,
            `${result.stdout}\n${result.stderr}`,
            formatCondaResult,
            compactCondaResultMap,
            formatCondaResultCompact,
            compact === false,
          );
        }
      }
    },
  );
}
