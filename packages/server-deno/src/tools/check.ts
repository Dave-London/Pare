import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  filePatternsInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseCheckOutput } from "../lib/parsers.js";
import { formatCheck, compactCheckMap, formatCheckCompact } from "../lib/formatters.js";
import { DenoCheckResultSchema } from "../schemas/index.js";

/** Registers the `check` tool on the given MCP server. */
export function registerCheckTool(server: McpServer) {
  server.registerTool(
    "check",
    {
      title: "Deno Check",
      description:
        "Runs `deno check` for type-checking without execution. Returns structured type errors.",
      inputSchema: {
        files: filePatternsInput("Files to type-check (at least one required)", []),
        path: projectPathInput,
        all: z.boolean().optional().describe("Type-check all modules including remote (--all)"),
        compact: compactInput,
      },
      outputSchema: DenoCheckResultSchema,
    },
    async ({ files, path, all, compact }) => {
      const cwd = path || process.cwd();

      const flags: string[] = ["check"];
      if (all) flags.push("--all");

      if (files) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        flags.push(...files);
      }

      const result = await denoCmd(flags, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      const data = parseCheckOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        rawOutput,
        formatCheck,
        compactCheckMap,
        formatCheckCompact,
        compact === false,
      );
    },
  );
}
