import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { bunCmd } from "../lib/bun-runner.js";
import { parseInstallOutput } from "../lib/parsers.js";
import { formatInstall, compactInstallMap, formatInstallCompact } from "../lib/formatters.js";
import { BunInstallResultSchema } from "../schemas/index.js";

/** Registers the `install` tool on the given MCP server. */
export function registerInstallTool(server: McpServer) {
  server.registerTool(
    "install",
    {
      title: "Bun Install",
      description:
        "Runs `bun install` to install project dependencies and returns structured output with package count.",
      inputSchema: {
        frozen: z
          .boolean()
          .optional()
          .describe("Error if lockfile would change (--frozen-lockfile)"),
        production: z.boolean().optional().describe("Skip devDependencies (--production)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunInstallResultSchema,
    },
    async ({ frozen, production, path, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["install"];
      if (frozen) cmdArgs.push("--frozen-lockfile");
      if (production) cmdArgs.push("--production");

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

      const data = parseInstallOutput(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatInstall,
        compactInstallMap,
        formatInstallCompact,
        compact === false,
      );
    },
  );
}
