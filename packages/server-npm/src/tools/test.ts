import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseTestOutput } from "../lib/parsers.js";
import { formatTest } from "../lib/formatters.js";
import { NpmTestSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Run Tests",
      description:
        "Runs `npm test`, `pnpm test`, or `yarn test` and returns structured output with exit code, stdout, stderr, and duration. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm). " +
        "Shorthand for running the test script defined in package.json.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments passed after -- to the test script"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmTestSchema,
    },
    async ({ path, args, packageManager, filter }) => {
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      if (filter) assertNoFlagInjection(filter, "filter");

      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (pm === "pnpm" && filter) pmArgs.push(`--filter=${filter}`);
      pmArgs.push("test");
      if (args && args.length > 0) {
        pmArgs.push("--");
        pmArgs.push(...args);
      }

      const start = Date.now();
      const result = await runPm(pm, pmArgs, cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const data = parseTestOutput(result.exitCode, result.stdout, result.stderr, duration);
      return dualOutput({ ...data, packageManager: pm }, formatTest);
    },
  );
}
