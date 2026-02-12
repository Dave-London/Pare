import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parsePullOutput } from "../lib/parsers.js";
import { formatPull } from "../lib/formatters.js";
import { DockerPullSchema } from "../schemas/index.js";

export function registerPullTool(server: McpServer) {
  server.registerTool(
    "pull",
    {
      title: "Docker Pull",
      description:
        "Pulls a Docker image from a registry and returns structured result with digest info. Use instead of running `docker pull` in the terminal.",
      inputSchema: {
        image: z.string().describe("Image to pull (e.g., nginx:latest, ubuntu:22.04)"),
        platform: z
          .string()
          .optional()
          .describe('Target platform (e.g., "linux/amd64", "linux/arm64")'),
        path: z.string().optional().describe("Working directory (default: cwd)"),
      },
      outputSchema: DockerPullSchema,
    },
    async ({ image, platform, path }) => {
      assertNoFlagInjection(image, "image");
      if (platform) assertNoFlagInjection(platform, "platform");

      const args = ["pull"];
      if (platform) args.push("--platform", platform);
      args.push(image);

      const result = await docker(args, path);

      if (result.exitCode !== 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker pull failed: ${errorMsg.trim()}`);
      }

      const data = parsePullOutput(result.stdout, result.stderr, result.exitCode, image);
      return dualOutput(data, formatPull);
    },
  );
}
