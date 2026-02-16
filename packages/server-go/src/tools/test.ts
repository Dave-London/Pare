import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoTestJson } from "../lib/parsers.js";
import { formatGoTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { GoTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Go Test",
      description:
        "Runs go test and returns structured test results (name, status, package, elapsed). Use instead of running `go test` in the terminal.",
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
          .describe("Packages to test (default: ./...)"),
        run: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Test name filter regex"),
        failfast: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Stop running tests after the first failure (-failfast). Saves time and tokens.",
          ),
        short: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Tell long-running tests to shorten their run time (-short). Enables quick smoke tests.",
          ),
        race: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable data race detection during tests (-race)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoTestResultSchema,
    },
    async ({ path, packages, run: runFilter, failfast, short, race, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (runFilter) assertNoFlagInjection(runFilter, "run");

      const args = ["test", "-json"];
      if (failfast) args.push("-failfast");
      if (short) args.push("-short");
      if (race) args.push("-race");
      args.push(...(packages || ["./..."]));
      if (runFilter) args.push("-run", runFilter);

      const result = await goCmd(args, cwd);
      const data = parseGoTestJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatGoTest,
        compactTestMap,
        formatTestCompact,
        compact === false,
      );
    },
  );
}
