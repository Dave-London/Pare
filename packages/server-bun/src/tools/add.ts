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
import { parseAddOutput } from "../lib/parsers.js";
import { formatAdd, compactAddMap, formatAddCompact } from "../lib/formatters.js";
import { BunAddResultSchema } from "../schemas/index.js";

/** Registers the `add` tool on the given MCP server. */
export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "Bun Add",
      description: "Runs `bun add` to add one or more packages and returns structured output.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Package names to add (e.g. ['typescript', 'zod@3.22'])"),
        dev: z.boolean().optional().default(false).describe("Add as devDependency (--dev / -D)"),
        exact: z.boolean().optional().describe("Add exact version (--exact)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: BunAddResultSchema,
    },
    async ({ packages, dev, exact, path, compact }) => {
      const cwd = path || process.cwd();

      for (const pkg of packages) {
        assertNoFlagInjection(pkg, "packages");
      }

      const cmdArgs = ["add"];
      if (dev) cmdArgs.push("--dev");
      if (exact) cmdArgs.push("--exact");
      cmdArgs.push(...packages);

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

      const data = parseAddOutput(
        packages,
        dev || false,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatAdd,
        compactAddMap,
        formatAddCompact,
        compact === false,
      );
    },
  );
}
