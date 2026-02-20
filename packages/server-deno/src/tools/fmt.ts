import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  compactInput,
  projectPathInput,
  filePatternsInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseFmtCheck, parseFmtWrite } from "../lib/parsers.js";
import { formatFmt, compactFmtMap, formatFmtCompact } from "../lib/formatters.js";
import { DenoFmtResultSchema } from "../schemas/index.js";

/** Registers the `fmt` tool on the given MCP server. */
export function registerFmtTool(server: McpServer) {
  server.registerTool(
    "fmt",
    {
      title: "Deno Fmt",
      description:
        "Runs `deno fmt` to check or write code formatting. Returns structured list of affected files.",
      inputSchema: {
        files: filePatternsInput("Files or directories to format (default: current directory)"),
        path: projectPathInput,
        check: z
          .boolean()
          .optional()
          .default(true)
          .describe("Check formatting without writing (--check). Defaults to true."),
        compact: compactInput,
      },
      outputSchema: DenoFmtResultSchema,
    },
    async ({ files, path, check, compact }) => {
      const cwd = path || process.cwd();

      const flags: string[] = ["fmt"];
      if (check !== false) flags.push("--check");

      if (files) {
        for (const f of files) {
          assertNoFlagInjection(f, "files");
        }
        flags.push(...files);
      }

      const result = await denoCmd(flags, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      const data =
        check !== false
          ? parseFmtCheck(result.stdout, result.stderr, result.exitCode)
          : parseFmtWrite(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatFmt,
        compactFmtMap,
        formatFmtCompact,
        compact === false,
      );
    },
  );
}
