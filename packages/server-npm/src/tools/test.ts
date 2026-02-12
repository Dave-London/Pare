import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseTestOutput } from "../lib/parsers.js";
import { formatTest } from "../lib/formatters.js";
import { NpmTestSchema } from "../schemas/index.js";

export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "npm Test",
      description:
        "Runs `npm test` and returns structured output with exit code, stdout, stderr, and duration. Shorthand for running the test script defined in package.json.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional arguments passed after -- to the test script"),
      },
      outputSchema: NpmTestSchema,
    },
    async ({ path, args }) => {
      // Defense-in-depth: validate args even though they come after "--" separator
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cwd = path || process.cwd();

      const npmArgs = ["test"];
      if (args && args.length > 0) {
        npmArgs.push("--");
        npmArgs.push(...args);
      }

      const start = Date.now();
      const result = await npm(npmArgs, cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const data = parseTestOutput(result.exitCode, result.stdout, result.stderr, duration);
      return dualOutput(data, formatTest);
    },
  );
}
