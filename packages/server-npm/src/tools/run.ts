import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { npm } from "../lib/npm-runner.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun } from "../lib/formatters.js";
import { NpmRunSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "npm Run",
      description:
        "Runs a package.json script via `npm run <script>` and returns structured output with exit code, stdout, stderr, and duration. Use instead of running `npm run` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        script: z.string().describe("The package.json script name to run"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional arguments passed after -- to the script"),
      },
      outputSchema: NpmRunSchema,
    },
    async ({ path, script, args }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(script, "script");
      // Defense-in-depth: validate args even though they come after "--" separator
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const npmArgs = ["run", script];
      if (args && args.length > 0) {
        npmArgs.push("--");
        npmArgs.push(...args);
      }

      const start = Date.now();
      const result = await npm(npmArgs, cwd);
      const duration = Math.round(((Date.now() - start) / 1000) * 10) / 10;

      const data = parseRunOutput(script, result.exitCode, result.stdout, result.stderr, duration);
      return dualOutput(data, formatRun);
    },
  );
}
