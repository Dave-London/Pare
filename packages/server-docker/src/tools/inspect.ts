import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseInspectJson } from "../lib/parsers.js";
import { formatInspect, compactInspectMap, formatInspectCompact } from "../lib/formatters.js";
import { DockerInspectSchema } from "../schemas/index.js";

export function registerInspectTool(server: McpServer) {
  server.registerTool(
    "inspect",
    {
      title: "Docker Inspect",
      description:
        "Shows detailed container or image information with structured state, image, and platform data. Use instead of running `docker inspect` in the terminal.",
      inputSchema: {
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Container or image name/ID to inspect"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: DockerInspectSchema,
    },
    async ({ target, path, compact }) => {
      assertNoFlagInjection(target, "target");

      const args = ["inspect", "--format", "json", target];
      const result = await docker(args, path);

      if (result.exitCode !== 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker inspect failed: ${errorMsg.trim()}`);
      }

      const data = parseInspectJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatInspect,
        compactInspectMap,
        formatInspectCompact,
        compact === false,
      );
    },
  );
}
