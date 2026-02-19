import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseInspectJsonAll } from "../lib/parsers.js";
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
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .describe("Container/image/network/volume target(s) to inspect"),
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
        path: cwdPathInput,
        compact: compactInput,
      },
      outputSchema: DockerInspectSchema,
    },
    async ({ target, type, size, path, compact }) => {
      const targets = Array.isArray(target) ? target : [target];
      for (const t of targets) {
        assertNoFlagInjection(t, "target");
      }

      const args = ["inspect", "--format", "json"];
      if (type) args.push("--type", type);
      if (size) args.push("-s");
      args.push(...targets);
      const result = await docker(args, path);

      if (result.exitCode !== 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker inspect failed: ${errorMsg.trim()}`);
      }

      const items = parseInspectJsonAll(result.stdout);
      if (items.length === 0) {
        throw new Error("docker inspect returned no objects");
      }
      const data = {
        ...items[0],
        ...(items.length > 1
          ? {
              relatedTargets: items.map((item, idx) => ({
                target: targets[idx] ?? item.name,
                id: item.id,
                name: item.name,
                inspectType: item.inspectType,
              })),
            }
          : {}),
      };
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
