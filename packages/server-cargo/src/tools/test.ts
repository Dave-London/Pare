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
        doc: z.boolean().optional().default(false).describe("Run only documentation tests (--doc)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to test in a workspace (-p <SPEC>)"),
        features: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Space or comma separated list of features to activate (--features)"),
        allFeatures: z
          .boolean()
          .optional()
          .default(false)
          .describe("Activate all available features (--all-features)"),
        noDefaultFeatures: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not activate the default feature (--no-default-features)"),
        testArgs: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Arguments to pass to the test harness (after --). " +
              "Example: ['--test-threads=1', '--nocapture', '--ignored', '--include-ignored', '--exact']",
          ),
        locked: z
          .boolean()
          .optional()
          .default(false)
          .describe("Require Cargo.lock is up to date (--locked)"),
        frozen: z
          .boolean()
          .optional()
          .default(false)
          .describe("Require Cargo.lock and cache are up to date (--frozen)"),
        offline: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run without accessing the network (--offline)"),
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
      doc,
      package: pkg,
      features,
      allFeatures,
      noDefaultFeatures,
      testArgs,
      locked,
      frozen,
      offline,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (filter) assertNoFlagInjection(filter, "filter");
      if (pkg) assertNoFlagInjection(pkg, "package");

      // Gap #95: Run with --message-format=json to capture compilation diagnostics
      const args = ["test", "--message-format=json"];
      if (pkg) args.push("-p", pkg);
      if (noFailFast) args.push("--no-fail-fast");
      if (noRun) args.push("--no-run");
      if (release) args.push("--release");
      if (doc) args.push("--doc");
      if (features && features.length > 0) {
        for (const f of features) {
          assertNoFlagInjection(f, "features");
        }
        args.push("--features", features.join(","));
      }
      if (allFeatures) args.push("--all-features");
      if (noDefaultFeatures) args.push("--no-default-features");
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");
      if (filter) args.push(filter);
      if (testArgs && testArgs.length > 0) {
        args.push("--", ...testArgs);
      }

      const result = await cargo(args, cwd);

      // Gap #95: The stdout contains both JSON messages and human-readable test output.
      // JSON lines are those starting with '{', human output is everything else.
      // We separate them to parse diagnostics from JSON and tests from human output.
      const lines = result.stdout.split("\n");
      const jsonLines: string[] = [];
      const humanLines: string[] = [];
      for (const line of lines) {
        if (line.trim().startsWith("{")) {
          jsonLines.push(line);
        } else {
          humanLines.push(line);
        }
      }

      const humanOutput = humanLines.join("\n");
      const jsonOutput = jsonLines.length > 0 ? jsonLines.join("\n") : undefined;

      const data = parseCargoTestOutput(humanOutput, result.exitCode, jsonOutput);
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
