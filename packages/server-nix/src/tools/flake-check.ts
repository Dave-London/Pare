import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { nixCmd } from "../lib/nix-runner.js";
import { parseFlakeCheckOutput } from "../lib/parsers.js";
import {
  formatFlakeCheck,
  compactFlakeCheckMap,
  formatFlakeCheckCompact,
} from "../lib/formatters.js";
import { NixFlakeCheckResultSchema } from "../schemas/index.js";

/** Registers the `flake-check` tool on the given MCP server. */
export function registerFlakeCheckTool(server: McpServer) {
  server.registerTool(
    "flake-check",
    {
      title: "Nix Flake Check",
      description:
        "Checks a Nix flake for errors and returns structured check results, warnings, and errors.",
      inputSchema: {
        flakeRef: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .default(".")
          .describe("Flake reference (defaults to '.')"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: NixFlakeCheckResultSchema,
    },
    async ({ flakeRef, path, compact }) => {
      const cwd = path || process.cwd();
      if (flakeRef) assertNoFlagInjection(flakeRef, "flakeRef");

      const cmdArgs = ["flake", "check", flakeRef || "."];

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await nixCmd(cmdArgs, cwd);
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

      const data = parseFlakeCheckOutput(
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
        formatFlakeCheck,
        compactFlakeCheckMap,
        formatFlakeCheckCompact,
        compact === false,
      );
    },
  );
}
