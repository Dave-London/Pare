import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { pytest } from "../lib/python-runner.js";
import { parsePytestOutput } from "../lib/parsers.js";
import { formatPytest } from "../lib/formatters.js";
import { PytestResultSchema } from "../schemas/index.js";

export function registerPytestTool(server: McpServer) {
  server.registerTool(
    "pytest",
    {
      title: "pytest",
      description:
        "Runs pytest and returns structured test results (passed, failed, errors, skipped, failures). Use instead of running `pytest` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        targets: z
          .array(z.string())
          .optional()
          .describe("Test files or directories to run (default: auto-discover)"),
        markers: z
          .string()
          .optional()
          .describe('Pytest marker expression (e.g. "not slow")'),
        verbose: z.boolean().optional().default(false).describe("Enable verbose output"),
        exitFirst: z
          .boolean()
          .optional()
          .default(false)
          .describe("Stop on first failure (-x)"),
      },
      outputSchema: PytestResultSchema,
    },
    async ({ path, targets, markers, verbose, exitFirst }) => {
      const cwd = path || process.cwd();
      const args = ["--tb=short", "-q"];

      if (verbose) args.splice(args.indexOf("-q"), 1, "-v");
      if (exitFirst) args.push("-x");
      if (markers) args.push("-m", markers);
      if (targets && targets.length > 0) args.push(...targets);

      const result = await pytest(args, cwd);
      const data = parsePytestOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatPytest);
    },
  );
}
