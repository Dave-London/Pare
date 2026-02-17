import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { makeCmd, justCmd, resolveTool } from "../lib/make-runner.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { MakeRunResultSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Make/Just Run",
      description:
        "Runs a make or just target and returns structured output (stdout, stderr, exit code, duration). Auto-detects make vs just.",
      inputSchema: {
        target: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Target to run"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to the target"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path"),
        tool: z
          .enum(["auto", "make", "just"])
          .optional()
          .default("auto")
          .describe('Task runner to use: "auto" detects from files, or force "make"/"just"'),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: MakeRunResultSchema,
    },
    async ({ target, args, path, tool, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(target, "target");
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const resolved = resolveTool(tool || "auto", cwd);
      const cmdArgs = [target, ...(args || [])];

      const start = Date.now();
      const result =
        resolved === "just" ? await justCmd(cmdArgs, cwd) : await makeCmd(cmdArgs, cwd);
      const duration = Date.now() - start;

      const data = parseRunOutput(
        target,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        resolved,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
