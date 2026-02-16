import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseImagesJson } from "../lib/parsers.js";
import { formatImages, compactImagesMap, formatImagesCompact } from "../lib/formatters.js";
import { DockerImagesSchema } from "../schemas/index.js";

/** Registers the `images` tool on the given MCP server. */
export function registerImagesTool(server: McpServer) {
  server.registerTool(
    "images",
    {
      title: "Docker Images",
      description:
        "Lists Docker images with structured repository, tag, size, and creation info. Use instead of running `docker images` in the terminal.",
      inputSchema: {
        all: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show all images including intermediates"),
        filter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter by reference (e.g., 'myapp', 'nginx:*')"),
        digests: z
          .boolean()
          .optional()
          .default(false)
          .describe("Show image digests (default: false)"),
        noTrunc: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not truncate image IDs (default: false)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerImagesSchema,
    },
    async ({ all, filter, digests, noTrunc, compact }) => {
      if (filter) assertNoFlagInjection(filter, "filter");

      const args = ["images", "--format", "json"];
      if (all) args.push("-a");
      if (digests) args.push("--digests");
      if (noTrunc) args.push("--no-trunc");
      if (filter) args.push(filter);

      const result = await docker(args);
      const data = parseImagesJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatImages,
        compactImagesMap,
        formatImagesCompact,
        compact === false,
      );
    },
  );
}
