import { z } from "zod";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parsePlaywrightJson } from "../lib/parsers/playwright.js";
import {
  formatPlaywrightResult,
  compactPlaywrightResultMap,
  formatPlaywrightResultCompact,
} from "../lib/formatters.js";
import { PlaywrightResultSchema } from "../schemas/index.js";

/** Registers the `playwright` tool on the given MCP server. */
export function registerPlaywrightTool(server: McpServer) {
  server.registerTool(
    "playwright",
    {
      title: "Playwright Tests",
      description:
        "Runs Playwright tests with JSON reporter and returns structured results with pass/fail status, duration, and error messages. Use instead of running `npx playwright test` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Test filter pattern (file path or test name grep pattern)"),
        project: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Playwright project name (e.g., 'chromium', 'firefox', 'webkit')"),
        headed: z.boolean().optional().default(false).describe("Run tests in headed browser mode"),
        updateSnapshots: z
          .boolean()
          .optional()
          .default(false)
          .describe("Update snapshots (adds --update-snapshots flag)"),
        workers: z
          .number()
          .optional()
          .describe("Number of parallel workers for test execution (maps to --workers)"),
        retries: z
          .number()
          .optional()
          .describe("Number of retries for failed tests (maps to --retries)"),
        maxFailures: z
          .number()
          .optional()
          .describe("Stop after this many test failures (maps to --max-failures)"),
        timeout: z
          .number()
          .optional()
          .describe("Per-test timeout in milliseconds (maps to --timeout)"),
        lastFailed: z
          .boolean()
          .optional()
          .describe("Re-run only previously failed tests (maps to --last-failed)"),
        onlyChanged: z
          .boolean()
          .optional()
          .describe("Run only tests affected by recent changes (maps to --only-changed)"),
        forbidOnly: z
          .boolean()
          .optional()
          .describe("Fail if test.only is found — CI safety check (maps to --forbid-only)"),
        passWithNoTests: z
          .boolean()
          .optional()
          .describe("Exit successfully when no tests are found (maps to --pass-with-no-tests)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to Playwright test runner"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PlaywrightResultSchema,
    },
    async ({
      path,
      filter,
      project,
      headed,
      updateSnapshots,
      workers,
      retries,
      maxFailures,
      timeout,
      lastFailed,
      onlyChanged,
      forbidOnly,
      passWithNoTests,
      args,
      compact,
    }) => {
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cwd = path || process.cwd();
      const extraArgs: string[] = [...(args || [])];

      if (filter) {
        assertNoFlagInjection(filter, "filter");
        extraArgs.push(filter);
      }

      if (project) {
        assertNoFlagInjection(project, "project");
        extraArgs.push("--project", project);
      }

      if (headed) {
        extraArgs.push("--headed");
      }

      if (updateSnapshots) {
        extraArgs.push("--update-snapshots");
      }

      if (workers !== undefined) {
        extraArgs.push(`--workers=${workers}`);
      }
      if (retries !== undefined) {
        extraArgs.push(`--retries=${retries}`);
      }
      if (maxFailures !== undefined) {
        extraArgs.push(`--max-failures=${maxFailures}`);
      }
      if (timeout !== undefined) {
        extraArgs.push(`--timeout=${timeout}`);
      }
      if (lastFailed) {
        extraArgs.push("--last-failed");
      }
      if (onlyChanged) {
        extraArgs.push("--only-changed");
      }
      if (forbidOnly) {
        extraArgs.push("--forbid-only");
      }
      if (passWithNoTests) {
        extraArgs.push("--pass-with-no-tests");
      }

      // Write JSON output to a temp file to avoid stdout parsing issues on Windows
      const tempPath = join(tmpdir(), `pare-playwright-${randomUUID()}.json`);

      const cmdArgs = ["playwright", "test", `--reporter=json`, ...extraArgs];

      // Set PLAYWRIGHT_JSON_OUTPUT_NAME env var to direct JSON to temp file
      const result = await run("npx", cmdArgs, {
        cwd,
        timeout: 180_000,
        env: { PLAYWRIGHT_JSON_OUTPUT_NAME: tempPath },
      });

      let jsonStr: string;
      try {
        jsonStr = await readFile(tempPath, "utf-8");
      } catch {
        // Temp file wasn't created — fall back to stdout extraction
        const output = result.stdout + "\n" + result.stderr;
        const start = output.indexOf("{");
        const end = output.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
          throw new Error(
            "No JSON output found from Playwright. Ensure Playwright is installed and configured in the project.",
          );
        }
        jsonStr = output.slice(start, end + 1);
      } finally {
        try {
          await unlink(tempPath);
        } catch {
          /* ignore cleanup errors */
        }
      }

      const playwrightResult = parsePlaywrightJson(jsonStr);

      return compactDualOutput(
        playwrightResult,
        result.stdout,
        formatPlaywrightResult,
        compactPlaywrightResultMap,
        formatPlaywrightResultCompact,
        compact === false,
      );
    },
  );
}
