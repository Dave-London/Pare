import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseListJson, parsePnpmListJson, parseYarnListJson } from "../lib/parsers.js";
import { formatList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { NpmListSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

/** Registers the `list` tool on the given MCP server. */
export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "List Packages",
      description:
        "Lists installed packages as structured dependency data. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm).",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        depth: z
          .number()
          .optional()
          .default(0)
          .describe("Dependency tree depth (default: 0, top-level only)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific package names to check if installed and at what version"),
        workspace: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Workspace to list packages for (maps to --workspace for npm)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Escape-hatch for PM-specific flags not modeled in the schema"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
        production: z
          .boolean()
          .optional()
          .describe(
            "Show only production dependencies (maps to --omit=dev for npm, --prod for pnpm)",
          ),
        all: z
          .boolean()
          .optional()
          .describe("Show complete dependency tree (maps to --all for npm)"),
        long: z
          .boolean()
          .optional()
          .describe("Show extended info such as description and homepage (maps to --long)"),
        global: z
          .boolean()
          .optional()
          .describe("List globally installed packages (maps to --global)"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmListSchema,
    },
    async ({
      path,
      depth,
      packages,
      workspace,
      args,
      compact,
      production,
      all,
      long: showLong,
      global: isGlobal,
      packageManager,
      filter,
    }) => {
      if (filter) assertNoFlagInjection(filter, "filter");
      if (workspace) assertNoFlagInjection(workspace, "workspace");
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (pm === "pnpm" && filter) pmArgs.push(`--filter=${filter}`);

      if (pm === "yarn") {
        // yarn list --json --depth=N
        pmArgs.push("list", "--json", `--depth=${depth ?? 0}`);
      } else {
        // pnpm uses "list" while npm uses "ls" — both accept "ls" too
        pmArgs.push(pm === "pnpm" ? "list" : "ls", "--json", `--depth=${depth ?? 0}`);
      }

      if (production) {
        if (pm === "npm") pmArgs.push("--omit=dev");
        else if (pm === "pnpm") pmArgs.push("--prod");
      }
      if (all && pm !== "yarn") pmArgs.push("--all");
      if (showLong && pm !== "yarn") pmArgs.push("--long");
      if (isGlobal) pmArgs.push("--global");
      if (workspace && pm === "npm") pmArgs.push(`--workspace=${workspace}`);
      if (packages && packages.length > 0) pmArgs.push(...packages);
      if (args && args.length > 0) pmArgs.push(...args);

      const result = await runPm(pm, pmArgs, cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`${pm} list failed: ${result.stderr}`);
      }

      // Gap #176: pnpm list --json returns an array of workspace projects.
      // Use parsePnpmListJson which properly handles all array elements
      // instead of discarding everything except the first.
      let list;
      if (pm === "pnpm") {
        list = parsePnpmListJson(result.stdout);
      } else if (pm === "yarn") {
        list = parseYarnListJson(result.stdout);
      } else {
        list = parseListJson(result.stdout);
      }

      const listWithPm = { ...list, packageManager: pm };
      return compactDualOutput(
        listWithPm,
        result.stdout,
        formatList,
        compactListMap,
        formatListCompact,
        compact === false,
      );
    },
  );
}
