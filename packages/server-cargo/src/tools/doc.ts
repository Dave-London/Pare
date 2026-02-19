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
import { parseCargoDocOutput } from "../lib/parsers.js";
import { formatCargoDoc, compactDocMap, formatDocCompact } from "../lib/formatters.js";
import { CargoDocResultSchema } from "../schemas/index.js";

/** Registers the `doc` tool on the given MCP server. */
export function registerDocTool(server: McpServer) {
  server.registerTool(
    "doc",
    {
      title: "Cargo Doc",
      description: "Generates Rust documentation and returns structured output with warning count.",
      inputSchema: {
        path: projectPathInput,
        open: z
          .boolean()
          .optional()
          .default(false)
          .describe("Open docs in browser after generating"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip building documentation for dependencies (--no-deps)"),
        documentPrivateItems: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Include private items in the generated documentation (--document-private-items)",
          ),
        workspace: z
          .boolean()
          .optional()
          .default(false)
          .describe("Generate documentation for all packages in the workspace (--workspace)"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to document in a workspace (-p <SPEC>)"),
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
          .describe("Generate docs for the target triple (--target <TRIPLE>)"),
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
        compact: compactInput,
      },
      outputSchema: CargoDocResultSchema,
    },
    async ({
      path,
      open,
      noDeps,
      documentPrivateItems,
      workspace,
      package: pkg,
      features,
      allFeatures,
      noDefaultFeatures,
      target,
      locked,
      frozen,
      offline,
      compact,
    }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");
      if (target) assertNoFlagInjection(target, "target");

      const args = ["doc", "--message-format=json"];
      if (noDeps) args.push("--no-deps");
      if (open) args.push("--open");
      if (documentPrivateItems) args.push("--document-private-items");
      if (workspace) args.push("--workspace");
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
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");

      const result = await cargo(args, cwd);
      const data = parseCargoDocOutput(result.stdout, result.stderr, result.exitCode, cwd);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoDoc,
        compactDocMap,
        formatDocCompact,
        compact === false,
      );
    },
  );
}
