import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoClippyJson } from "../lib/parsers.js";
import { formatCargoClippy, compactClippyMap, formatClippyCompact } from "../lib/formatters.js";
import { CargoClippyResultSchema } from "../schemas/index.js";

/** Registers the `clippy` tool on the given MCP server. */
export function registerClippyTool(server: McpServer) {
  server.registerTool(
    "clippy",
    {
      title: "Cargo Clippy",
      description:
        "Runs cargo clippy and returns structured lint diagnostics. Use instead of running `cargo clippy` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run clippy only on the specified package, not its dependencies (--no-deps)"),
        allTargets: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check all targets (lib, bins, tests, benches, examples) (--all-targets)"),
        release: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run clippy in release mode with optimizations (--release)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to lint in a workspace (-p <SPEC>)"),
        fix: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Automatically apply clippy suggestions (--fix --allow-dirty). " +
              "Implies --allow-dirty to work with uncommitted changes.",
          ),
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
        warn: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Lint names to set to warn level (-- -W <lint>). " +
              'Example: ["clippy::unwrap_used", "clippy::expect_used"]',
          ),
        allow: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Lint names to allow/suppress (-- -A <lint>). " +
              'Example: ["clippy::needless_return"]',
          ),
        deny: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Lint names to set to deny level (-- -D <lint>). " + 'Example: ["clippy::unwrap_used"]',
          ),
        forbid: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Lint names to forbid (-- -F <lint>). Cannot be overridden. " +
              'Example: ["unsafe_code"]',
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
      outputSchema: CargoClippyResultSchema,
    },
    async ({
      path,
      noDeps,
      allTargets,
      release,
      package: pkg,
      fix,
      features,
      allFeatures,
      noDefaultFeatures,
      warn,
      allow,
      deny,
      forbid,
      locked,
      frozen,
      offline,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");

      const args = ["clippy", "--message-format=json"];
      if (noDeps) args.push("--no-deps");
      if (allTargets) args.push("--all-targets");
      if (release) args.push("--release");
      if (pkg) args.push("-p", pkg);
      if (fix) args.push("--fix", "--allow-dirty");
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

      // Gap #91: Add lint level configuration flags after "--"
      const lintArgs: string[] = [];
      if (warn && warn.length > 0) {
        for (const lint of warn) {
          assertNoFlagInjection(lint, "warn");
          lintArgs.push("-W", lint);
        }
      }
      if (allow && allow.length > 0) {
        for (const lint of allow) {
          assertNoFlagInjection(lint, "allow");
          lintArgs.push("-A", lint);
        }
      }
      if (deny && deny.length > 0) {
        for (const lint of deny) {
          assertNoFlagInjection(lint, "deny");
          lintArgs.push("-D", lint);
        }
      }
      if (forbid && forbid.length > 0) {
        for (const lint of forbid) {
          assertNoFlagInjection(lint, "forbid");
          lintArgs.push("-F", lint);
        }
      }
      if (lintArgs.length > 0) {
        args.push("--", ...lintArgs);
      }

      const result = await cargo(args, cwd);
      const data = parseCargoClippyJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatCargoClippy,
        compactClippyMap,
        formatClippyCompact,
        compact === false,
      );
    },
  );
}
