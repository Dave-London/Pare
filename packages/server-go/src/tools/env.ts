import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoEnvOutput } from "../lib/parsers.js";
import { formatGoEnv, compactEnvMap, formatEnvCompact } from "../lib/formatters.js";
import { GoEnvResultSchema } from "../schemas/index.js";

/** Registers the `env` tool on the given MCP server. */
export function registerEnvTool(server: McpServer) {
  server.registerTool(
    "env",
    {
      title: "Go Env",
      description:
        "Returns Go environment variables as structured JSON. Optionally request specific variables. Use instead of running `go env` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        vars: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific environment variables to query (e.g., ['GOROOT', 'GOPATH'])"),
        changed: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Show only variables whose effective value differs from the default (-changed)",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoEnvResultSchema,
    },
    async ({ path, vars, changed, compact }) => {
      for (const v of vars || []) {
        assertNoFlagInjection(v, "vars");
      }
      const cwd = path || process.cwd();
      const args = ["env", "-json"];
      if (changed) args.push("-changed");
      args.push(...(vars || []));
      const result = await goCmd(args, cwd);
      const data = parseGoEnvOutput(result.stdout);
      const rawOutput = result.stdout.trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoEnv,
        compactEnvMap,
        formatEnvCompact,
        compact === false,
      );
    },
  );
}
