import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoTestOutput } from "../lib/parsers.js";
import { formatCargoTest, compactTestMap, formatTestCompact } from "../lib/formatters.js";
import { CargoTestResultSchema } from "../schemas/index.js";

/** Registers the `test` tool on the given MCP server. */
export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Cargo Test",
      description:
        "Runs cargo test and returns structured test results (name, status, pass/fail counts). Use instead of running `cargo test` in the terminal.",
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
          .describe("Test name filter pattern"),
        noFailFast: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run all tests regardless of failures (--no-fail-fast)"),
        noRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Compile tests but do not run them (--no-run)"),
        release: z
          .boolean()
          .optional()
          .default(false)
          .describe("Test in release mode with optimizations (--release)"),
        ignored: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run only ignored tests (-- --ignored)"),
        includeIgnored: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run both ignored and non-ignored tests (-- --include-ignored)"),
        doc: z.boolean().optional().default(false).describe("Run only documentation tests (--doc)"),
        exact: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Exactly match the test name filter instead of substring matching (-- --exact)",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoTestResultSchema,
    },
    async ({
      path,
      filter,
      noFailFast,
      noRun,
      release,
      ignored,
      includeIgnored,
      doc,
      exact,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");

      const args = ["test"];
      if (noFailFast) args.push("--no-fail-fast");
      if (noRun) args.push("--no-run");
      if (release) args.push("--release");
      if (doc) args.push("--doc");
      if (filter) args.push(filter);

      // Flags that go after `--` (test binary args)
      const testArgs: string[] = [];
      if (ignored) testArgs.push("--ignored");
      if (includeIgnored) testArgs.push("--include-ignored");
      if (exact) testArgs.push("--exact");
      if (testArgs.length > 0) args.push("--", ...testArgs);

      const result = await cargo(args, cwd);
      const data = parseCargoTestOutput(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoTest,
        compactTestMap,
        formatTestCompact,
        compact === false,
      );
    },
  );
}
