import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoGetOutput } from "../lib/parsers.js";
import { formatGoGet, compactGetMap, formatGetCompact } from "../lib/formatters.js";
import { GoGetResultSchema } from "../schemas/index.js";

/** Registers the `get` tool on the given MCP server. */
export function registerGetTool(server: McpServer) {
  server.registerTool(
    "get",
    {
      title: "Go Get",
      description:
        "Downloads and installs Go packages and their dependencies. Use instead of running `go get` in the terminal.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Packages to install (e.g., ['github.com/pkg/errors@latest'])"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoGetResultSchema,
    },
    async ({ packages, path, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages) {
        assertNoFlagInjection(p, "packages");
      }
      const args = ["get", ...packages];
      const result = await goCmd(args, cwd);
      const data = parseGoGetOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoGet,
        compactGetMap,
        formatGetCompact,
        compact === false,
      );
    },
  );
}
