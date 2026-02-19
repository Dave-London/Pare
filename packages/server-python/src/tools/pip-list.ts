import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
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
      description: "Runs pip list and returns a structured list of installed packages.",
      inputSchema: {
        path: cwdPathInput,
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
        outdated: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Only list outdated packages with their latest available versions (--outdated)",
          ),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Package names to exclude from output"),
        compact: compactInput,
      },
      outputSchema: PipListSchema,
    },
    async ({
      path,
      local,
      user,
      notRequired,
      editable,
      excludeEditable,
      outdated,
      exclude,
      compact,
    }) => {
      const cwd = path || process.cwd();
      for (const e of exclude ?? []) {
        assertNoFlagInjection(e, "exclude");
      }

      const args = ["list", "--format", "json"];
      if (outdated) args.push("--outdated");
      if (local) args.push("--local");
      if (user) args.push("--user");
      if (notRequired) args.push("--not-required");
      if (editable) args.push("--editable");
      if (excludeEditable) args.push("--exclude-editable");
      for (const e of exclude ?? []) {
        args.push("--exclude", e);
      }

      const result = await pip(args, cwd);
      const data = parsePipListJson(result.stdout, result.exitCode, outdated);
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
