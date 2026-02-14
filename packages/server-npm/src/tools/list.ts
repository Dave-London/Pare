import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseListJson } from "../lib/parsers.js";
import { formatList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { NpmListSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "List Packages",
      description:
        "Lists installed packages as structured dependency data. " +
        "Auto-detects pnpm via pnpm-lock.yaml. Use instead of running `npm list` or `pnpm list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        depth: z
          .number()
          .optional()
          .default(0)
          .describe("Dependency tree depth (default: 0, top-level only)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmListSchema,
    },
    async ({ path, depth, compact, packageManager, filter }) => {
      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (pm === "pnpm" && filter) pmArgs.push(`--filter=${filter}`);
      // pnpm uses "list" while npm uses "ls" — both accept "ls" too
      pmArgs.push(pm === "pnpm" ? "list" : "ls", "--json", `--depth=${depth ?? 0}`);

      const result = await runPm(pm, pmArgs, cwd);

      if (result.exitCode !== 0 && !result.stdout) {
        throw new Error(`${pm} list failed: ${result.stderr}`);
      }

      // pnpm list --json returns an array (one entry per matched project in a workspace)
      // while npm ls --json returns a single object. Normalize pnpm's array to a single object.
      let jsonStr = result.stdout;
      if (pm === "pnpm") {
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            jsonStr = JSON.stringify(
              parsed[0] ?? { name: "unknown", version: "0.0.0", dependencies: {} },
            );
          }
        } catch {
          // fall through, let parseListJson handle the error
        }
      }

      const list = parseListJson(jsonStr);
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
