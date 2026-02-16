import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoListOutput, parseGoListModulesOutput } from "../lib/parsers.js";
import { formatGoList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { GoListResultSchema } from "../schemas/index.js";

/** Registers the `list` tool on the given MCP server. */
export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "Go List",
      description:
        "Lists Go packages or modules and returns structured information. When `modules` is true, lists modules (with path, version, dir); otherwise lists packages (with dir, importPath, name, goFiles, testGoFiles). Use instead of running `go list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["./..."])
          .describe("Package patterns to list (default: ['./...'])"),
        modules: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "List modules instead of packages (-m). When true, output uses the modules field " +
              "with path, version, dir, goMod, goVersion, main, indirect.",
          ),
        updates: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Show available module updates (-u). Requires module mode (-m) which will be auto-enabled.",
          ),
        deps: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "List not just the named packages but also all their transitive dependencies (-deps)",
          ),
        tolerateErrors: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Tolerate errors in packages -- useful for listing packages in partially broken projects (-e)",
          ),
        versions: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Show all known versions of each module (-versions). Requires module mode (-m) which will be auto-enabled.",
          ),
        find: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Find packages matching the patterns without resolving dependencies (-find). Faster for simple listing.",
          ),
        tags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Build tags that may affect which packages are listed (-tags)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoListResultSchema,
    },
    async ({
      path,
      packages,
      modules,
      updates,
      deps,
      tolerateErrors,
      versions,
      find,
      tags,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      const args = ["list", "-json"];
      if (tags && tags.length > 0) {
        for (const t of tags) {
          assertNoFlagInjection(t, "tags");
        }
        args.push("-tags", tags.join(","));
      }

      // Determine if module mode should be enabled
      const useModuleMode = modules || updates || versions;

      if (useModuleMode) {
        args.push("-m");
        if (updates) args.push("-u");
        if (versions) args.push("-versions");
      }
      if (deps) args.push("-deps");
      if (tolerateErrors) args.push("-e");
      if (find) args.push("-find");
      args.push(...(packages || ["./..."]));
      const result = await goCmd(args, cwd);

      // Parse based on mode
      const data = useModuleMode
        ? parseGoListModulesOutput(result.stdout, result.exitCode)
        : parseGoListOutput(result.stdout, result.exitCode);

      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoList,
        compactListMap,
        formatListCompact,
        compact === false,
      );
    },
  );
}
