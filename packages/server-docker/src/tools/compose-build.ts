import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposeBuildOutput } from "../lib/parsers.js";
import {
  formatComposeBuild,
  compactComposeBuildMap,
  formatComposeBuildCompact,
} from "../lib/formatters.js";
import { DockerComposeBuildSchema } from "../schemas/index.js";

export function registerComposeBuildTool(server: McpServer) {
  server.registerTool(
    "compose-build",
    {
      title: "Docker Compose Build",
      description:
        "Builds Docker Compose service images and returns structured per-service build status. Use instead of running `docker compose build` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Directory containing docker-compose.yml (default: cwd)"),
        services: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Specific services to build (default: all)"),
        noCache: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not use cache when building images (default: false)"),
        pull: z
          .boolean()
          .optional()
          .default(false)
          .describe("Always pull a newer version of the base image (default: false)"),
        buildArgs: z
          .record(z.string(), z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .default({})
          .describe("Build arguments as key-value pairs (e.g., {NODE_ENV: 'production'})"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: DockerComposeBuildSchema,
    },
    async ({ path, services, noCache, pull, buildArgs, compact }) => {
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }
      if (buildArgs) {
        for (const [key, value] of Object.entries(buildArgs) as [string, string][]) {
          assertNoFlagInjection(key, "buildArgs key");
          assertNoFlagInjection(value, "buildArgs value");
        }
      }

      const args = ["compose", "build"];
      if (noCache) args.push("--no-cache");
      if (pull) args.push("--pull");
      if (buildArgs) {
        for (const [key, value] of Object.entries(buildArgs) as [string, string][]) {
          args.push("--build-arg", `${key}=${value}`);
        }
      }
      if (services && services.length > 0) {
        args.push(...services);
      }

      const start = Date.now();
      const result = await docker(args, path);
      const duration = Math.round((Date.now() - start) / 100) / 10;

      const data = parseComposeBuildOutput(result.stdout, result.stderr, result.exitCode, duration);

      if (result.exitCode !== 0 && data.built === 0 && data.services.length === 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker compose build failed: ${errorMsg.trim()}`);
      }

      return compactDualOutput(
        data,
        result.stdout,
        formatComposeBuild,
        compactComposeBuildMap,
        formatComposeBuildCompact,
        compact === false,
      );
    },
  );
}
