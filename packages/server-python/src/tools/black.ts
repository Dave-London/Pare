import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { black } from "../lib/python-runner.js";
import { parseBlackOutput } from "../lib/parsers.js";
import { formatBlack, compactBlackMap, formatBlackCompact } from "../lib/formatters.js";
import { BlackResultSchema } from "../schemas/index.js";

/** Registers the `black` tool on the given MCP server. */
export function registerBlackTool(server: McpServer) {
  server.registerTool(
    "black",
    {
      title: "Black Formatter",
      description:
        "Runs Black code formatter and returns structured results (files changed, unchanged, would reformat). Use instead of running `black` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe('Files or directories to format (default: ["."])'),
        check: z
          .boolean()
          .optional()
          .default(false)
          .describe("Check mode (report without modifying files)"),
        lineLength: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override the configured line length (--line-length)"),
        targetVersion: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Python version to target, e.g. 'py310', 'py311', 'py312' (--target-version)"),
        diff: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show diff of changes without applying (--diff)"),
        skipStringNormalization: z
          .boolean()
          .optional()
          .default(false)
          .describe("Skip string quote normalization (-S)"),
        preview: z.boolean().optional().default(false).describe("Enable preview style (--preview)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: BlackResultSchema,
    },
    async ({
      path,
      targets,
      check,
      lineLength,
      targetVersion,
      diff,
      skipStringNormalization,
      preview,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) {
        assertNoFlagInjection(t, "targets");
      }
      if (targetVersion) assertNoFlagInjection(targetVersion, "targetVersion");
      const args = [...(targets || ["."])];
      if (check) args.push("--check");
      if (lineLength !== undefined) args.push("--line-length", String(lineLength));
      if (targetVersion) args.push("--target-version", targetVersion);
      if (diff) args.push("--diff");
      if (skipStringNormalization) args.push("-S");
      if (preview) args.push("--preview");

      const result = await black(args, cwd);
      const data = parseBlackOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stderr,
        formatBlack,
        compactBlackMap,
        formatBlackCompact,
        compact === false,
      );
    },
  );
}
