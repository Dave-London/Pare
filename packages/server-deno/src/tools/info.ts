import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseInfoJson, parseInfoText } from "../lib/parsers.js";
import { formatInfo, compactInfoMap, formatInfoCompact } from "../lib/formatters.js";
import { DenoInfoResultSchema } from "../schemas/index.js";

/** Registers the `info` tool on the given MCP server. */
export function registerInfoTool(server: McpServer) {
  server.registerTool(
    "info",
    {
      title: "Deno Info",
      description:
        "Runs `deno info` to show dependency information for a module. Returns structured dependency data.",
      inputSchema: {
        module: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Module specifier or file path to inspect (shows cache info if omitted)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: DenoInfoResultSchema,
    },
    async ({ module, path, compact }) => {
      const cwd = path || process.cwd();
      if (module) assertNoFlagInjection(module, "module");

      const flags: string[] = ["info", "--json"];
      if (module) flags.push(module);

      const result = await denoCmd(flags, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      let data;
      try {
        data = parseInfoJson(result.stdout, module);
      } catch {
        data = parseInfoText(result.stdout, result.stderr, result.exitCode, module);
      }

      return compactDualOutput(
        data,
        rawOutput,
        formatInfo,
        compactInfoMap,
        formatInfoCompact,
        compact === false,
      );
    },
  );
}
