import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoRunOutput } from "../lib/parsers.js";
import { formatCargoRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { CargoRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Cargo Run",
      description: "Runs a cargo binary and returns structured output (exit code, stdout, stderr).",
      inputSchema: {
        path: projectPathInput,
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Arguments to pass to the binary (after --)"),
        release: z.boolean().optional().default(false).describe("Run in release mode"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to run in a workspace"),
        bin: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Name of the binary to run (--bin <NAME>) for multi-binary crates"),
        example: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Name of the example to run (--example <NAME>)"),
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
        timeout: z
          .number()
          .int()
          .min(1000)
          .max(600000)
          .optional()
          .describe(
            "Execution timeout in milliseconds. Overrides the default 300s. " +
              "Min: 1000 (1s), Max: 600000 (10m).",
          ),
        profile: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Build with a custom profile (--profile <NAME>)"),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Run for the target triple (--target <TRIPLE>)"),
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
        maxOutputSize: z
          .number()
          .int()
          .min(1024)
          .max(10485760)
          .optional()
          .default(1048576)
          .describe(
            "Maximum size in bytes for stdout/stderr before truncation. Default: 1048576 (1MB). Min: 1024, Max: 10485760 (10MB).",
          ),
        compact: compactInput,
      },
      outputSchema: CargoRunResultSchema,
    },
    async ({
      path,
      args,
      release,
      package: pkg,
      bin,
      example,
      features,
      allFeatures,
      noDefaultFeatures,
      timeout,
      profile,
      target,
      locked,
      frozen,
      offline,
      maxOutputSize,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (bin) assertNoFlagInjection(bin, "bin");
      if (example) assertNoFlagInjection(example, "example");
      if (profile) assertNoFlagInjection(profile, "profile");
      if (target) assertNoFlagInjection(target, "target");

      const cargoArgs = ["run"];
      if (release) cargoArgs.push("--release");
      if (pkg) cargoArgs.push("-p", pkg);
      if (bin) cargoArgs.push("--bin", bin);
      if (example) cargoArgs.push("--example", example);
      if (features && features.length > 0) {
        for (const f of features) {
          assertNoFlagInjection(f, "features");
        }
        cargoArgs.push("--features", features.join(","));
      }
      if (allFeatures) cargoArgs.push("--all-features");
      if (noDefaultFeatures) cargoArgs.push("--no-default-features");
      if (profile) cargoArgs.push("--profile", profile);
      if (target) cargoArgs.push("--target", target);
      if (locked) cargoArgs.push("--locked");
      if (frozen) cargoArgs.push("--frozen");
      if (offline) cargoArgs.push("--offline");
      if (args && args.length > 0) {
        cargoArgs.push("--");
        cargoArgs.push(...args);
      }

      const result = await cargo(cargoArgs, cwd, timeout);

      // Gap #94: Detect timeout from the runner result
      const timedOut = result.exitCode !== 0 && result.stderr?.includes("timed out");

      const data = parseCargoRunOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        maxOutputSize,
        timedOut,
      );
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
