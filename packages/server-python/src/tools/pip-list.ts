import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pip } from "../lib/python-runner.js";
import { parsePipListJson } from "../lib/parsers.js";
import { formatPipList, compactPipListMap, formatPipListCompact } from "../lib/formatters.js";
import { PipListSchema } from "../schemas/index.js";

/** Registers the `pip-list` tool on the given MCP server. */
export function registerPipListTool(server: McpServer) {
  server.registerTool(
    "pip-list",
    {
      title: "pip List",
      description:
        "Runs pip list and returns a structured list of installed packages. " +
        "Use instead of running `pip list` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        local: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only list packages in the local virtualenv (-l, --local)"),
        user: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only list packages installed in user-site (--user)"),
        notRequired: z
          .boolean()
          .optional()
          .default(false)
          .describe("List packages that are not dependencies of other packages (--not-required)"),
        editable: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only list editable packages (-e, --editable)"),
        excludeEditable: z
          .boolean()
          .optional()
          .default(false)
          .describe("Exclude editable packages from the list (--exclude-editable)"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Package names to exclude from output"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PipListSchema,
    },
    async ({ path, local, user, notRequired, editable, excludeEditable, exclude, compact }) => {
      const cwd = path || process.cwd();
      for (const e of exclude ?? []) {
        assertNoFlagInjection(e, "exclude");
      }

      const args = ["list", "--format", "json"];
      if (local) args.push("--local");
      if (user) args.push("--user");
      if (notRequired) args.push("--not-required");
      if (editable) args.push("--editable");
      if (excludeEditable) args.push("--exclude-editable");
      for (const e of exclude ?? []) {
        args.push("--exclude", e);
      }

      const result = await pip(args, cwd);
      const data = parsePipListJson(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatPipList,
        compactPipListMap,
        formatPipListCompact,
        compact === false,
      );
    },
  );
}
