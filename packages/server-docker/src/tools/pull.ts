import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parsePullOutput } from "../lib/parsers.js";
import { formatPull, compactPullMap, formatPullCompact } from "../lib/formatters.js";
import { DockerPullSchema } from "../schemas/index.js";

export function registerPullTool(server: McpServer) {
  server.registerTool(
    "pull",
    {
      title: "Docker Pull",
      description:
        "Pulls a Docker image from a registry and returns structured result with digest info.",
      inputSchema: {
        image: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Image to pull (e.g., nginx:latest, ubuntu:22.04)"),
        platform: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Target platform (e.g., "linux/amd64", "linux/arm64")'),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: DockerPullSchema,
    },
    async ({ image, platform, path, compact }) => {
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
      return compactDualOutput(
        data,
        result.stdout,
        formatPull,
        compactPullMap,
        formatPullCompact,
        compact === false,
      );
    },
  );
}
