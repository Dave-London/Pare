import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseInspectJson } from "../lib/parsers.js";
import { formatInspect, compactInspectMap, formatInspectCompact } from "../lib/formatters.js";
import { DockerInspectSchema } from "../schemas/index.js";

/** Registers the `inspect` tool on the given MCP server. */
export function registerInspectTool(server: McpServer) {
  server.registerTool(
    "inspect",
    {
      title: "Docker Inspect",
      description:
        "Shows detailed container or image information with structured state, image, and platform data.",
      inputSchema: {
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Container or image name/ID to inspect"),
        type: z
          .enum(["container", "image", "volume", "network"])
          .optional()
          .describe(
            'Object type to inspect: "container", "image", "volume", or "network" (--type)',
          ),
        size: z
          .boolean()
          .optional()
          .default(false)
          .describe("Display total file sizes (-s, --size)"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Working directory"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: DockerInspectSchema,
    },
    async ({ target, type, size, path, compact }) => {
      assertNoFlagInjection(target, "target");

      const args = ["inspect", "--format", "json"];
      if (type) args.push("--type", type);
      if (size) args.push("-s");
      args.push(target);
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
