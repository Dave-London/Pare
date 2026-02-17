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
        bench: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Benchmark name filter regex (-bench)"),
        benchtime: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Benchmark run duration or count (-benchtime), e.g. '3s' or '100x'"),
        benchmem: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print memory allocation stats for benchmarks (-benchmem)"),
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
        timeout: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Test execution timeout (-timeout <d>). Examples: '30s', '5m', '1h'. Default: 10m.",
          ),
        count: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe(
            "Run each test and benchmark N times (-count <n>). Useful for verifying flaky test fixes.",
          ),
        cover: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable test coverage analysis (-cover)"),
        coverprofile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe(
            "Write a coverage profile to the named file (-coverprofile <file>). Implies -cover.",
          ),
        tags: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Build tags required to run tests correctly (-tags)"),
        parallel: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe(
            "Maximum number of tests to run in parallel (-parallel <n>). Default: GOMAXPROCS.",
          ),
        shuffle: z
          .enum(["on", "off"])
          .optional()
          .describe(
            "Randomize test execution order (-shuffle). 'on' uses a random seed, 'off' is the default.",
          ),
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
    async ({
      path,
      packages,
      run: runFilter,
      bench,
      benchtime,
      benchmem,
      failfast,
      short,
      race,
      timeout,
      count,
      cover,
      coverprofile,
      tags,
      parallel,
      shuffle,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (runFilter) assertNoFlagInjection(runFilter, "run");
      if (bench) assertNoFlagInjection(bench, "bench");
      if (benchtime) assertNoFlagInjection(benchtime, "benchtime");
      if (timeout) assertNoFlagInjection(timeout, "timeout");
      if (coverprofile) assertNoFlagInjection(coverprofile, "coverprofile");

      const args = ["test", "-json"];
      if (failfast) args.push("-failfast");
      if (short) args.push("-short");
      if (race) args.push("-race");
      if (timeout) args.push("-timeout", timeout);
      if (count !== undefined) args.push("-count", String(count));
      if (bench) args.push("-bench", bench);
      if (benchtime) args.push("-benchtime", benchtime);
      if (benchmem) args.push("-benchmem");
      if (coverprofile) {
        args.push("-coverprofile", coverprofile);
      } else if (cover) {
        args.push("-cover");
      }
      if (tags && tags.length > 0) {
        for (const t of tags) {
          assertNoFlagInjection(t, "tags");
        }
        args.push("-tags", tags.join(","));
      }
      if (parallel !== undefined) args.push("-parallel", String(parallel));
      if (shuffle === "on") args.push("-shuffle=on");
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
