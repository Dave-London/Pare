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
import { parseBuildOutput } from "../lib/parsers.js";
import { formatBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { NixBuildResultSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Nix Build",
      description: "Builds a Nix derivation and returns structured output paths and diagnostics.",
      inputSchema: {
        installable: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .default(".")
          .describe("Installable reference (e.g. '.#package', 'nixpkgs#hello')"),
        outLink: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Output link path (--out-link)"),
        noLink: z.boolean().optional().describe("Do not create output link (--no-link)"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: NixBuildResultSchema,
    },
    async ({ installable, outLink, noLink, path, compact }) => {
      const cwd = path || process.cwd();
      if (installable) assertNoFlagInjection(installable, "installable");
      if (outLink) assertNoFlagInjection(outLink, "outLink");

      const cmdArgs = ["build", installable || ".", "--print-out-paths"];
      if (outLink) cmdArgs.push("--out-link", outLink);
      if (noLink) cmdArgs.push("--no-link");

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

      const data = parseBuildOutput(
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
        formatBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
