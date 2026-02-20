import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  assertAllowedByPolicy,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { bazelCmd } from "../lib/bazel-runner.js";
import {
  parseBazelBuildOutput,
  parseBazelTestOutput,
  parseBazelQueryOutput,
  parseBazelInfoOutput,
  parseBazelRunOutput,
  parseBazelCleanOutput,
  parseBazelFetchOutput,
} from "../lib/parsers.js";
import {
  formatBazelResult,
  compactBazelResultMap,
  formatBazelResultCompact,
} from "../lib/formatters.js";

// MCP listTools requires an object-shaped outputSchema; discriminated unions are not supported.
const BazelOutputSchema = z.object({ action: z.string() }).passthrough();

/** Registers the `bazel` tool on the given MCP server. */
export function registerBazelTool(server: McpServer) {
  server.registerTool(
    "bazel",
    {
      title: "Bazel",
      description: "Bazel build system operations: build, test, query, info, run, clean, fetch.",
      inputSchema: {
        action: z
          .enum(["build", "test", "query", "info", "run", "clean", "fetch"])
          .describe("Bazel action"),
        targets: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(50)
          .optional()
          .describe("Target patterns (e.g. //src:app, //...)"),
        workDir: projectPathInput,
        queryExpr: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Query expression for query action"),
        queryOutput: z
          .enum(["label", "label_kind", "minrank", "maxrank", "package", "location", "build"])
          .optional()
          .default("label")
          .describe("Query output format"),
        keepGoing: z.boolean().optional().describe("Continue after errors (-k)"),
        testOutput: z
          .enum(["summary", "errors", "all", "streamed"])
          .optional()
          .default("errors")
          .describe("Test output mode"),
        verboseFailures: z.boolean().optional().default(true).describe("Verbose failure messages"),
        infoKey: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific info key"),
        expunge: z.boolean().optional().describe("Full clean with --expunge"),
        compact: compactInput,
      },
      outputSchema: BazelOutputSchema,
    },
    async ({
      action,
      targets,
      workDir,
      queryExpr,
      queryOutput,
      keepGoing,
      testOutput,
      verboseFailures,
      infoKey,
      expunge,
      compact,
    }) => {
      const cwd = workDir || process.cwd();

      // Validate targets
      if (targets) {
        for (const t of targets) {
          assertNoFlagInjection(t, "targets");
          // Validate target pattern: must start with //, @, or be ...
          if (!t.startsWith("//") && !t.startsWith("@") && t !== "...") {
            throw new Error(
              `Invalid Bazel target pattern: "${t}". Must start with //, @, or be "..."`,
            );
          }
        }
      }
      if (queryExpr) assertNoFlagInjection(queryExpr, "queryExpr");
      if (infoKey) assertNoFlagInjection(infoKey, "infoKey");

      // Policy gates
      if (action === "run") assertAllowedByPolicy("bazel", "bazel");
      if (action === "clean" && expunge) assertAllowedByPolicy("bazel", "bazel");

      // Common flags
      const baseFlags = ["--nocolor", "--curses=no"];

      switch (action) {
        case "build": {
          if (!targets?.length) throw new Error("targets required for build");
          const args = ["build", ...baseFlags];
          if (keepGoing) args.push("-k");
          if (verboseFailures) args.push("--verbose_failures");
          args.push(...targets);
          const result = await bazelCmd(args, cwd);
          const data = parseBazelBuildOutput(result.stdout, result.stderr, result.exitCode);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
        case "test": {
          if (!targets?.length) throw new Error("targets required for test");
          const args = ["test", ...baseFlags];
          if (keepGoing) args.push("-k");
          if (verboseFailures) args.push("--verbose_failures");
          if (testOutput) args.push(`--test_output=${testOutput}`);
          args.push(...targets);
          const result = await bazelCmd(args, cwd);
          const data = parseBazelTestOutput(result.stdout, result.stderr, result.exitCode);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
        case "query": {
          if (!queryExpr) throw new Error("queryExpr required for query");
          const args = ["query", ...baseFlags];
          if (queryOutput) args.push(`--output=${queryOutput}`);
          if (keepGoing) args.push("-k");
          args.push(queryExpr);
          const result = await bazelCmd(args, cwd);
          const data = parseBazelQueryOutput(result.stdout, result.stderr, result.exitCode);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
        case "info": {
          const args = ["info", ...baseFlags];
          if (infoKey) args.push(infoKey);
          const result = await bazelCmd(args, cwd);
          const data = parseBazelInfoOutput(result.stdout, result.stderr, result.exitCode, infoKey);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
        case "run": {
          if (!targets?.length || targets.length !== 1)
            throw new Error("exactly one target required for run");
          const args = ["run", ...baseFlags, ...targets];
          const result = await bazelCmd(args, cwd);
          const data = parseBazelRunOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            targets[0],
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
        case "clean": {
          const args = ["clean", ...baseFlags];
          if (expunge) args.push("--expunge");
          const result = await bazelCmd(args, cwd);
          const data = parseBazelCleanOutput(
            result.stdout,
            result.stderr,
            result.exitCode,
            !!expunge,
          );
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
        case "fetch": {
          if (!targets?.length) throw new Error("targets required for fetch");
          const args = ["fetch", ...baseFlags, ...targets];
          const result = await bazelCmd(args, cwd);
          const data = parseBazelFetchOutput(result.stdout, result.stderr, result.exitCode);
          const rawOutput = (result.stdout + "\n" + result.stderr).trim();
          return compactDualOutput(
            data,
            rawOutput,
            formatBazelResult,
            compactBazelResultMap,
            formatBazelResultCompact,
            compact === false,
          );
        }
      }
    },
  );
}
