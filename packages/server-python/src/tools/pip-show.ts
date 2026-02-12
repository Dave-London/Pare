import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { pip } from "../lib/python-runner.js";
import { parsePipShowOutput } from "../lib/parsers.js";
import { formatPipShow, compactPipShowMap, formatPipShowCompact } from "../lib/formatters.js";
import { PipShowSchema } from "../schemas/index.js";

export function registerPipShowTool(server: McpServer) {
  server.registerTool(
    "pip-show",
    {
      title: "pip Show",
      description:
        "Runs pip show and returns structured package metadata (name, version, summary, dependencies). " +
        "Use instead of running `pip show` in the terminal.",
      inputSchema: {
        package: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Package name to show"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PipShowSchema,
    },
    async (input) => {
      const pkg = input["package"];
      const path = input["path"] as string | undefined;
      const compact = input["compact"] as boolean | undefined;
      const cwd = path || process.cwd();
      assertNoFlagInjection(pkg as string, "package");

      const result = await pip(["show", pkg as string], cwd);
      const data = parsePipShowOutput(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatPipShow,
        compactPipShowMap,
        formatPipShowCompact,
        compact === false,
      );
    },
  );
}
