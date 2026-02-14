import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun } from "../lib/formatters.js";
import { NpmRunSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Run Script",
      description:
        "Runs a package.json script via `npm run <script>`, `pnpm run <script>`, or `yarn run <script>` and returns structured output with exit code, stdout, stderr, and duration. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm). " +
        "Use instead of running `npm run`, `pnpm run`, or `yarn run` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        script: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("The package.json script name to run"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments passed after -- to the script"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmRunSchema,
    },
    async ({ path, script, args, packageManager, filter }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(script, "script");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      if (filter) assertNoFlagInjection(filter, "filter");

      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs = ["run", script];
      if (pm === "pnpm" && filter) pmArgs.splice(0, 0, `--filter=${filter}`);
      if (args && args.length > 0) {
        pmArgs.push("--");
        pmArgs.push(...args);
      }

      const start = Date.now();
      const result = await runPm(pm, pmArgs, cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const data = parseRunOutput(script, result.exitCode, result.stdout, result.stderr, duration);
      return dualOutput({ ...data, packageManager: pm }, formatRun);
    },
  );
}
