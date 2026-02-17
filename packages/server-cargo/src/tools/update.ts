import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoUpdateOutput } from "../lib/parsers.js";
import { formatCargoUpdate, compactUpdateMap, formatUpdateCompact } from "../lib/formatters.js";
import { CargoUpdateResultSchema } from "../schemas/index.js";

/** Registers the `update` tool on the given MCP server. */
export function registerUpdateTool(server: McpServer) {
  server.registerTool(
    "update",
    {
      title: "Cargo Update",
      description: "Updates dependencies in the lock file. Optionally updates a single package.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific package to update (e.g. 'serde'). Omit to update all."),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview what would be updated without modifying the lock file (--dry-run)"),
        aggressive: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Force updating all dependencies of the specified package as well (--aggressive)",
          ),
        workspace: z
          .boolean()
          .optional()
          .default(false)
          .describe("Update all packages in the workspace (--workspace)"),
        precise: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Update to exactly this version (--precise <VERSION>). " +
              "Requires a package to be specified.",
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
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: CargoUpdateResultSchema,
    },
    async ({
      path,
      package: pkg,
      dryRun,
      aggressive,
      workspace,
      precise,
      locked,
      frozen,
      offline,
      manifestPath,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (pkg) assertNoFlagInjection(pkg, "package");
      if (precise) assertNoFlagInjection(precise, "precise");
      if (manifestPath) assertNoFlagInjection(manifestPath, "manifestPath");

      const args = ["update"];
      if (pkg) args.push("-p", pkg);
      if (dryRun) args.push("--dry-run");
      if (aggressive) args.push("--aggressive");
      if (workspace) args.push("--workspace");
      if (precise) args.push("--precise", precise);
      if (locked) args.push("--locked");
      if (frozen) args.push("--frozen");
      if (offline) args.push("--offline");
      if (manifestPath) args.push("--manifest-path", manifestPath);

      const result = await cargo(args, cwd);
      const data = parseCargoUpdateOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoUpdate,
        compactUpdateMap,
        formatUpdateCompact,
        compact === false,
      );
    },
  );
}
