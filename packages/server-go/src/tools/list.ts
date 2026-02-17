import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoListOutput } from "../lib/parsers.js";
import { formatGoList, compactListMap, formatListCompact } from "../lib/formatters.js";
import { GoListResultSchema } from "../schemas/index.js";

export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "Go List",
      description:
        "Lists Go packages and returns structured package information (dir, importPath, name, goFiles).",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: GoListResultSchema,
    },
    async ({ path, packages, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      const args = ["list", "-json", ...(packages || ["./..."])];
      const result = await goCmd(args, cwd);
      const data = parseGoListOutput(result.stdout);
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
