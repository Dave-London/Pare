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
import { parseFlakeShowOutput } from "../lib/parsers.js";
import { formatFlakeShow, compactFlakeShowMap, formatFlakeShowCompact } from "../lib/formatters.js";
import { NixFlakeShowResultSchema } from "../schemas/index.js";

/** Registers the `flake-show` tool on the given MCP server. */
export function registerFlakeShowTool(server: McpServer) {
  server.registerTool(
    "flake-show",
    {
      title: "Nix Flake Show",
      description:
        "Shows the outputs of a Nix flake as a structured tree. Uses --json for machine-parseable output by default.",
      inputSchema: {
        flakeRef: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .default(".")
          .describe("Flake reference (defaults to '.')"),
        json: z
          .boolean()
          .optional()
          .default(true)
          .describe("Use --json for machine-parseable output (default true)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: NixFlakeShowResultSchema,
    },
    async ({ flakeRef, json, path, compact }) => {
      const cwd = path || process.cwd();
      if (flakeRef) assertNoFlagInjection(flakeRef, "flakeRef");

      const cmdArgs = ["flake", "show", flakeRef || "."];
      if (json !== false) cmdArgs.push("--json");

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

      const data = parseFlakeShowOutput(
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
        formatFlakeShow,
        compactFlakeShowMap,
        formatFlakeShowCompact,
        compact === false,
      );
    },
  );
}
