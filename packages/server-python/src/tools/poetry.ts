import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
import { poetry } from "../lib/python-runner.js";
import { parsePoetryOutput } from "../lib/parsers.js";
import { formatPoetry, compactPoetryMap, formatPoetryCompact } from "../lib/formatters.js";
import { PoetryResultSchema } from "../schemas/index.js";

/** Registers the `poetry` tool on the given MCP server. */
export function registerPoetryTool(server: McpServer) {
  server.registerTool(
    "poetry",
    {
      title: "Poetry",
      description:
        "Runs Poetry commands and returns structured output. " +
        "Supports install, add, remove, show, build, update, lock, check, and export actions.",
      inputSchema: {
        action: z
          .enum(["install", "add", "remove", "show", "build", "update", "lock", "check", "export"])
          .describe("Poetry action to perform"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Packages for add/remove actions"),
        group: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Dependency group for install/add/remove (e.g. 'dev')"),
        format: z
          .enum(["sdist", "wheel"])
          .optional()
          .describe("Build output format for build action"),
        exportFormat: z
          .enum(["requirements.txt"])
          .optional()
          .default("requirements.txt")
          .describe("Export format for export action"),
        output: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output file for export action (-o FILE)"),
        withoutHashes: z
          .boolean()
          .optional()
          .default(false)
          .describe("Exclude hashes in exported requirements (--without-hashes)"),
        path: cwdPathInput,
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Preview changes without applying, for install/add/remove (--dry-run)"),
        outdated: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show only outdated packages, for show action (--outdated)"),
        latest: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show latest available version, for show action (--latest)"),
        tree: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show dependency tree, for show action (--tree)"),
        compact: compactInput,
      },
      outputSchema: PoetryResultSchema,
    },
    async ({
      action,
      packages,
      group,
      format,
      exportFormat,
      output,
      withoutHashes,
      path,
      dryRun,
      outdated,
      latest,
      tree,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }
      if (group) assertNoFlagInjection(group, "group");
      if (output) assertNoFlagInjection(output, "output");

      const args: string[] = [action, "--no-interaction", "--no-ansi"];

      if ((action === "install" || action === "add" || action === "remove") && dryRun) {
        args.push("--dry-run");
      }

      if (action === "show") {
        if (outdated) args.push("--outdated");
        if (latest) args.push("--latest");
        if (tree) args.push("--tree");
      }

      if (group && (action === "install" || action === "add" || action === "remove")) {
        args.push("--group", group);
      }

      if (action === "build" && format) {
        args.push("--format", format);
      }

      if (action === "export") {
        args.push("--format", exportFormat ?? "requirements.txt");
        if (output) args.push("--output", output);
        if (withoutHashes) args.push("--without-hashes");
      }

      if (
        (action === "add" || action === "remove" || action === "update") &&
        packages &&
        packages.length > 0
      ) {
        args.push(...packages);
      }

      const result = await poetry(args, cwd);
      const data = parsePoetryOutput(result.stdout, result.stderr, result.exitCode, action);
      return compactDualOutput(
        data,
        result.stdout,
        formatPoetry,
        compactPoetryMap,
        formatPoetryCompact,
        compact === false,
      );
    },
  );
}
