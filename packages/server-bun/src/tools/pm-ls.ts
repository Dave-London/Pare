import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { bunCmd } from "../lib/bun-runner.js";
import { parsePmLsOutput } from "../lib/parsers.js";
import { formatPmLs, compactPmLsMap, formatPmLsCompact } from "../lib/formatters.js";
import { BunPmLsResultSchema } from "../schemas/index.js";

/** Registers the `pm-ls` tool on the given MCP server. */
export function registerPmLsTool(server: McpServer) {
  server.registerTool(
    "pm-ls",
    {
      title: "Bun PM List",
      description:
        "Runs `bun pm ls` to list installed packages and returns structured package info.",
      inputSchema: {
        all: z.boolean().optional().describe("Show all transitive dependencies (--all)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunPmLsResultSchema,
    },
    async ({ all, path, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["pm", "ls"];
      if (all) cmdArgs.push("--all");

      const start = Date.now();
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await bunCmd(cmdArgs, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parsePmLsOutput(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatPmLs,
        compactPmLsMap,
        formatPmLsCompact,
        compact === false,
      );
    },
  );
}
