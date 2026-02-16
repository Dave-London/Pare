import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
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
    async ({ path, local, user, notRequired, editable, excludeEditable, compact }) => {
      const cwd = path || process.cwd();

      const args = ["list", "--format", "json"];
      if (local) args.push("--local");
      if (user) args.push("--user");
      if (notRequired) args.push("--not-required");
      if (editable) args.push("--editable");
      if (excludeEditable) args.push("--exclude-editable");
      const result = await pip(args, cwd);
      const data = parsePipListJson(result.stdout);
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
