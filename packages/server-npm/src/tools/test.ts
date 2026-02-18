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
        "Shorthand for running the test script defined in package.json. " +
        "Automatically parses test framework output (jest, vitest, mocha, tap) to extract pass/fail/skip counts.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments passed after -- to the test script"),
        workspace: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            "Workspace target(s) — maps to npm --workspace or pnpm --filter for unified workspace targeting",
          ),
        ifPresent: z
          .boolean()
          .optional()
          .describe(
            "Don't error if the test script is missing — useful in heterogeneous monorepos (maps to --if-present)",
          ),
        recursive: z
          .boolean()
          .optional()
          .describe(
            "Run tests in all workspace packages (maps to --recursive for pnpm, --workspaces for npm)",
          ),
        ignoreScripts: z
          .boolean()
          .optional()
          .describe("Skip pretest/posttest lifecycle hooks (maps to --ignore-scripts)"),
        silent: z
          .boolean()
          .optional()
          .describe("Strip npm/pnpm log chrome for cleaner output (maps to --silent)"),
        parallel: z
          .boolean()
          .optional()
          .describe("Run workspace tests in parallel (maps to --parallel for pnpm)"),
        stream: z
          .boolean()
          .optional()
          .describe("Stream output with package name prefixes (maps to --stream for pnpm)"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmTestSchema,
    },
    async ({
      path,
      args,
      workspace,
      ifPresent,
      recursive,
      ignoreScripts,
      silent,
      parallel,
      stream,
      packageManager,
      filter,
    }) => {
      if (filter) assertNoFlagInjection(filter, "filter");

      // Validate workspace values
      const workspaces = workspace ? (Array.isArray(workspace) ? workspace : [workspace]) : [];
      for (const w of workspaces) {
        assertNoFlagInjection(w, "workspace");
      }

      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (pm === "pnpm" && filter) pmArgs.push(`--filter=${filter}`);
      if (recursive) {
        if (pm === "pnpm") pmArgs.push("--recursive");
        else if (pm === "npm") pmArgs.push("--workspaces");
      }
      if (parallel && pm === "pnpm") pmArgs.push("--parallel");
      if (stream && pm === "pnpm") pmArgs.push("--stream");

      // Add workspace targeting
      for (const w of workspaces) {
        if (pm === "npm") {
          pmArgs.push(`--workspace=${w}`);
        } else if (pm === "pnpm") {
          pmArgs.push(`--filter=${w}`);
        }
      }

      pmArgs.push("test");
      if (ifPresent) pmArgs.push("--if-present");
      if (ignoreScripts) pmArgs.push("--ignore-scripts");
      if (silent) pmArgs.push("--silent");
      if (args && args.length > 0) {
        pmArgs.push("--");
        pmArgs.push(...args);
      }

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await runPm(pm, pmArgs, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          timedOut = true;
          result = {
            exitCode: 124,
            stdout: "",
            stderr: errMsg,
          };
        } else {
          throw err;
        }
      }

      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const data = parseTestOutput(
        result.exitCode,
        result.stdout,
        result.stderr,
        duration,
        timedOut,
      );
      return dualOutput({ ...data, packageManager: pm }, formatTest);
    },
  );
}
