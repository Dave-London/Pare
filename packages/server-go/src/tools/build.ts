import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoBuildOutput } from "../lib/parsers.js";
import { formatGoBuild } from "../lib/formatters.js";
import { GoBuildResultSchema } from "../schemas/index.js";

export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Go Build",
      description:
        "Runs go build and returns structured error list (file, line, column, message). Use instead of running `go build` in the terminal.",
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
          .describe("Packages to build (default: ./...)"),
      },
      outputSchema: GoBuildResultSchema,
    },
    async ({ path, packages }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      const result = await goCmd(["build", ...(packages || ["./..."])], cwd);
      const data = parseGoBuildOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatGoBuild);
    },
  );
}
