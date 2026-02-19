import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { denoCmd } from "../lib/deno-runner.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { DenoRunResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Deno Run",
      description:
        "Runs a Deno script with `deno run` and returns structured output (stdout, stderr, exit code, duration).",
      inputSchema: {
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .describe("Script file to run (e.g. main.ts, server.ts)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional arguments to pass to the script"),
        path: projectPathInput,
        allowRead: z.boolean().optional().describe("Allow file system read access (--allow-read)"),
        allowWrite: z
          .boolean()
          .optional()
          .describe("Allow file system write access (--allow-write)"),
        allowNet: z.boolean().optional().describe("Allow network access (--allow-net)"),
        allowEnv: z
          .boolean()
          .optional()
          .describe("Allow environment variable access (--allow-env)"),
        allowAll: z.boolean().optional().describe("Allow all permissions (-A). Use with caution."),
        compact: compactInput,
      },
      outputSchema: DenoRunResultSchema,
    },
    async ({ file, args, path, allowRead, allowWrite, allowNet, allowEnv, allowAll, compact }) => {
      const cwd = path || process.cwd();
      assertNoFlagInjection(file, "file");

      const flags: string[] = ["run"];
      if (allowAll) {
        flags.push("-A");
      } else {
        if (allowRead) flags.push("--allow-read");
        if (allowWrite) flags.push("--allow-write");
        if (allowNet) flags.push("--allow-net");
        if (allowEnv) flags.push("--allow-env");
      }
      flags.push(file, ...(args || []));

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await denoCmd(flags, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          timedOut = true;
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseRunOutput(
        file,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
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
