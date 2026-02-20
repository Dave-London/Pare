import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { bunCmd } from "../lib/bun-runner.js";
import { parseRemoveOutput } from "../lib/parsers.js";
import { formatRemove, compactRemoveMap, formatRemoveCompact } from "../lib/formatters.js";
import { BunRemoveResultSchema } from "../schemas/index.js";

/** Registers the `remove` tool on the given MCP server. */
export function registerRemoveTool(server: McpServer) {
  server.registerTool(
    "remove",
    {
      title: "Bun Remove",
      description:
        "Runs `bun remove` to remove one or more packages and returns structured output.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Package names to remove"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunRemoveResultSchema,
    },
    async ({ packages, path, compact }) => {
      const cwd = path || process.cwd();

      for (const pkg of packages) {
        assertNoFlagInjection(pkg, "packages");
      }

      const cmdArgs = ["remove", ...packages];

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

      const data = parseRemoveOutput(
        packages,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatRemove,
        compactRemoveMap,
        formatRemoveCompact,
        compact === false,
      );
    },
  );
}
