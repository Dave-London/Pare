import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun } from "../lib/formatters.js";
import { NpmRunSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Run Script",
      description:
        "Runs a package.json script via `npm run <script>`, `pnpm run <script>`, or `yarn run <script>` and returns structured output with exit code, stdout, stderr, and duration. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm).",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
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
        workspace: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            "Workspace target(s) — maps to npm --workspace or pnpm --filter for unified workspace targeting",
          ),
        scriptShell: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Override the shell used to run scripts (maps to --script-shell)"),
        ifPresent: z
          .boolean()
          .optional()
          .describe(
            "Don't error if the script is missing — useful in heterogeneous monorepos (maps to --if-present)",
          ),
        recursive: z
          .boolean()
          .optional()
          .describe(
            "Run script in all workspace packages (maps to --recursive for pnpm, --workspaces for npm)",
          ),
        ignoreScripts: z
          .boolean()
          .optional()
          .describe("Skip pre/post lifecycle hooks (maps to --ignore-scripts)"),
        silent: z
          .boolean()
          .optional()
          .describe("Strip npm/pnpm log chrome from output (maps to --silent)"),
        parallel: z
          .boolean()
          .optional()
          .describe("Run workspace scripts in parallel (maps to --parallel for pnpm)"),
        stream: z
          .boolean()
          .optional()
          .describe("Stream output with package name prefixes (maps to --stream for pnpm)"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmRunSchema,
    },
    async ({
      path,
      script,
      args,
      workspace,
      scriptShell,
      ifPresent,
      recursive,
      ignoreScripts,
      silent,
      parallel,
      stream,
      packageManager,
      filter,
    }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(script, "script");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }
      if (filter) assertNoFlagInjection(filter, "filter");
      if (scriptShell) assertNoFlagInjection(scriptShell, "scriptShell");

      // Validate workspace values
      const workspaces = workspace ? (Array.isArray(workspace) ? workspace : [workspace]) : [];
      for (const w of workspaces) {
        assertNoFlagInjection(w, "workspace");
      }

      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs = ["run", script];
      if (pm === "pnpm" && filter) pmArgs.splice(0, 0, `--filter=${filter}`);
      if (ifPresent) pmArgs.push("--if-present");
      if (recursive) {
        if (pm === "pnpm") pmArgs.splice(0, 0, "--recursive");
        else if (pm === "npm") pmArgs.splice(0, 0, "--workspaces");
      }
      if (ignoreScripts) pmArgs.push("--ignore-scripts");
      if (silent) pmArgs.push("--silent");
      if (parallel && pm === "pnpm") pmArgs.splice(0, 0, "--parallel");
      if (stream && pm === "pnpm") pmArgs.splice(0, 0, "--stream");
      if (scriptShell) pmArgs.push(`--script-shell=${scriptShell}`);

      // Add workspace targeting
      for (const w of workspaces) {
        if (pm === "npm") {
          pmArgs.splice(0, 0, `--workspace=${w}`);
        } else if (pm === "pnpm") {
          pmArgs.splice(0, 0, `--filter=${w}`);
        }
      }

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

        // Gap #181: detect timeout from the shared runner
        if (errMsg.includes("timed out")) {
          timedOut = true;
          result = {
            exitCode: 124, // Standard timeout exit code
            stdout: "",
            stderr: errMsg,
          };
        } else {
          throw err;
        }
      }

      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const data = parseRunOutput(
        script,
        result.exitCode,
        result.stdout,
        result.stderr,
        duration,
        timedOut,
      );
      return dualOutput({ ...data, packageManager: pm }, formatRun);
    },
  );
}
