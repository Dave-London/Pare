import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoEnvOutput } from "../lib/parsers.js";
import { formatGoEnv, compactEnvMap, formatEnvCompact } from "../lib/formatters.js";
import { GoEnvResultSchema } from "../schemas/index.js";
import type { GoEnvResult } from "../schemas/index.js";

/** Registers the `env` tool on the given MCP server. */
export function registerEnvTool(server: McpServer) {
  server.registerTool(
    "env",
    {
      title: "Go Env",
      description:
        "Returns Go environment variables as structured JSON. Optionally request specific variables.",
      inputSchema: {
        path: projectPathInput,
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
        compact: compactInput,
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
      const data = parseGoEnvOutput(result.stdout, vars);
      const rawOutput = result.stdout.trim();

      // Pass queriedVars to compactEnvMap so compact mode includes queried variables (Gap #150)
      const queriedVars = vars;
      return compactDualOutput(
        data,
        rawOutput,
        formatGoEnv,
        (d: GoEnvResult) => compactEnvMap(d, queriedVars),
        formatEnvCompact,
        compact === false,
      );
    },
  );
}
