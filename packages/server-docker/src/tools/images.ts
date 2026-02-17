import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseImagesJson } from "../lib/parsers.js";
import { formatImages, compactImagesMap, formatImagesCompact } from "../lib/formatters.js";
import { DockerImagesSchema } from "../schemas/index.js";

export function registerImagesTool(server: McpServer) {
  server.registerTool(
    "images",
    {
      title: "Docker Images",
      description:
        "Lists Docker images with structured repository, tag, size, and creation info.",
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
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: DockerImagesSchema,
    },
    async ({ all, filter, compact }) => {
      if (filter) assertNoFlagInjection(filter, "filter");

      const args = ["images", "--format", "json"];
      if (all) args.push("-a");
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
