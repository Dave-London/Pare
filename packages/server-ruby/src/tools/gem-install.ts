import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { gemCmd } from "../lib/ruby-runner.js";
import { parseGemInstallOutput } from "../lib/parsers.js";
import {
  formatGemInstall,
  compactGemInstallMap,
  formatGemInstallCompact,
} from "../lib/formatters.js";
import { GemInstallResultSchema } from "../schemas/index.js";

/** Registers the `gem-install` tool on the given MCP server. */
export function registerGemInstallTool(server: McpServer) {
  server.registerTool(
    "gem-install",
    {
      title: "Gem Install",
      description:
        "Installs a Ruby gem using `gem install` and returns structured output with success status and duration.",
      inputSchema: {
        gem: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Name of the gem to install"),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Specific version to install (e.g., '1.2.3')"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: GemInstallResultSchema,
    },
    async ({ gem, version, path, compact }) => {
      assertNoFlagInjection(gem, "gem");
      if (version) assertNoFlagInjection(version, "version");

      const cwd = path || process.cwd();
      const cmdArgs = ["install", gem];
      if (version) cmdArgs.push("--version", version);

      const start = Date.now();
      const result = await gemCmd(cmdArgs, cwd);
      const duration = Date.now() - start;

      const data = parseGemInstallOutput(
        gem,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGemInstall,
        compactGemInstallMap,
        formatGemInstallCompact,
        compact === false,
      );
    },
  );
}
