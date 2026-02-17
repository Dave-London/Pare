import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoEnvOutput } from "../lib/parsers.js";
import { formatGoEnv, compactEnvMap, formatEnvCompact } from "../lib/formatters.js";
import { GoEnvResultSchema } from "../schemas/index.js";

export function registerEnvTool(server: McpServer) {
  server.registerTool(
    "env",
    {
      title: "Go Env",
      description:
        "Returns Go environment variables as structured JSON. Optionally request specific variables.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: GoEnvResultSchema,
    },
    async ({ path, vars, compact }) => {
      for (const v of vars || []) {
        assertNoFlagInjection(v, "vars");
      }
      const cwd = path || process.cwd();
      const args = ["env", "-json", ...(vars || [])];
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
