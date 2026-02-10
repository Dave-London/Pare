import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseImagesJson } from "../lib/parsers.js";
import { formatImages } from "../lib/formatters.js";
import { DockerImagesSchema } from "../schemas/index.js";

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
        filter: z.string().optional().describe("Filter by reference (e.g., 'myapp', 'nginx:*')"),
      },
      outputSchema: DockerImagesSchema,
    },
    async ({ all, filter }) => {
      const args = ["images", "--format", "json"];
      if (all) args.push("-a");
      if (filter) args.push(filter);

      const result = await docker(args);
      const data = parseImagesJson(result.stdout);
      return dualOutput(data, formatImages);
    },
  );
}
