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
import { parseCargoBuildJson } from "../lib/parsers.js";
import { formatCargoBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { CargoBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Cargo Build",
      description:
        "Runs cargo build and returns structured diagnostics (file, line, code, severity, message).",
      inputSchema: {
        path: projectPathInput,
        release: z.boolean().optional().default(false).describe("Build in release mode"),
        keepGoing: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Continue as much as possible after encountering errors (--keep-going). Collects maximum diagnostics in a single run.",
          ),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to build in a workspace (-p <SPEC>)"),
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
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Build for the target triple (--target <TRIPLE>). Example: 'x86_64-unknown-linux-gnu'",
          ),
        profile: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Build with a custom profile (--profile <NAME>)"),
        timings: z
          .union([z.boolean(), z.enum(["html", "json"])])
          .optional()
          .describe(
            "Enable cargo timing report generation (--timings[=html|json]) and expose timing metadata in output.",
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
        manifestPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Cargo.toml (--manifest-path <PATH>)"),
        compact: compactInput,
      },
      outputSchema: CargoBuildResultSchema,
    },
    async ({
      path,
      release,
      keepGoing,
      package: pkg,
      features,
      allFeatures,
      noDefaultFeatures,
      target,
      profile,
      timings,
      locked,
      frozen,
      offline,
      manifestPath,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (target) assertNoFlagInjection(target, "target");
      if (profile) assertNoFlagInjection(profile, "profile");
      if (manifestPath) assertNoFlagInjection(manifestPath, "manifestPath");

      const args = ["build", "--message-format=json"];
      if (release) args.push("--release");
      if (keepGoing) args.push("--keep-going");
      if (pkg) args.push("-p", pkg);
      if (features && features.length > 0) {
        for (const f of features) {
          assertNoFlagInjection(f, "features");
        }
        args.push("--features", features.join(","));
      }
      if (allFeatures) args.push("--all-features");
      if (noDefaultFeatures) args.push("--no-default-features");
      if (target) args.push("--target", target);
      if (profile) args.push("--profile", profile);
      if (timings === true) args.push("--timings");
      if (timings === "html" || timings === "json") args.push(`--timings=${timings}`);
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");
      if (manifestPath) args.push("--manifest-path", manifestPath);

      const result = await cargo(args, cwd);
      const data = parseCargoBuildJson(result.stdout, result.exitCode, result.stderr);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
