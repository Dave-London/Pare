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
import { parseFlakeUpdateOutput } from "../lib/parsers.js";
import {
  formatFlakeUpdate,
  compactFlakeUpdateMap,
  formatFlakeUpdateCompact,
} from "../lib/formatters.js";
import { NixFlakeUpdateResultSchema } from "../schemas/index.js";

/** Registers the `flake-update` tool on the given MCP server. */
export function registerFlakeUpdateTool(server: McpServer) {
  server.registerTool(
    "flake-update",
    {
      title: "Nix Flake Update",
      description:
        "Updates flake lock file inputs and returns structured information about what was updated.",
      inputSchema: {
        inputs: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe(
            "Specific inputs to update (e.g. ['nixpkgs', 'flake-utils']). If omitted, all inputs are updated.",
          ),
        flakeRef: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Flake reference (defaults to current directory)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: NixFlakeUpdateResultSchema,
    },
    async ({ inputs, flakeRef, path, compact }) => {
      const cwd = path || process.cwd();
      if (flakeRef) assertNoFlagInjection(flakeRef, "flakeRef");
      if (inputs) {
        for (const input of inputs) {
          assertNoFlagInjection(input, "inputs");
        }
      }

      const cmdArgs = ["flake", "update"];
      if (inputs && inputs.length > 0) {
        for (const input of inputs) {
          cmdArgs.push(input);
        }
      }
      if (flakeRef) {
        cmdArgs.push("--flake", flakeRef);
      }

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

      const data = parseFlakeUpdateOutput(
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
        formatFlakeUpdate,
        compactFlakeUpdateMap,
        formatFlakeUpdateCompact,
        compact === false,
      );
    },
  );
}
