import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseBuildOutput } from "../lib/parsers.js";
import { formatBuild, compactBuildMap, formatBuildCompact } from "../lib/formatters.js";
import { DockerBuildSchema } from "../schemas/index.js";

/** Registers the `build` tool on the given MCP server. */
export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Docker Build",
      description:
        "Builds a Docker image and returns structured build results including image ID, duration, and errors.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Build context path"),
        /** #98: Support multiple tags — accepts string or string[] for multiple -t flags. */
        tag: z
          .union([
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX),
          ])
          .optional()
          .describe(
            'Image tag(s). String for a single tag or string[] for multiple tags (e.g., ["myapp:latest", "myapp:v1.2"])',
          ),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Dockerfile path (default: Dockerfile)"),
        noCache: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not use cache when building the image (default: false)"),
        pull: z
          .boolean()
          .optional()
          .default(false)
          .describe("Always attempt to pull a newer version of the base image (default: false)"),
        buildArgs: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe(
            'Build-time variables passed via --build-arg (e.g., ["NODE_ENV=production", "VERSION=1.0"])',
          ),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target build stage for multi-stage builds (--target)"),
        platform: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Target platform for multi-arch builds (e.g., "linux/amd64", "linux/arm64")'),
        label: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Image metadata labels (e.g., ["version=1.0", "maintainer=team"])'),
        cacheFrom: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('External cache sources for CI optimization (e.g., ["type=registry,ref=img"])'),
        cacheTo: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe(
            'Cache export destinations paired with cacheFrom (e.g., ["type=registry,ref=img"])',
          ),
        secret: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Build secrets (e.g., ["id=mysecret,src=secret.txt"])'),
        ssh: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('SSH agent socket/keys for private repo access (e.g., ["default"])'),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Additional build arguments"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: DockerBuildSchema,
    },
    async ({
      path,
      tag,
      file,
      noCache,
      pull,
      buildArgs,
      target,
      platform,
      label,
      cacheFrom,
      cacheTo,
      secret,
      ssh,
      args,
      compact,
    }) => {
      // #98: Normalize tag to array
      const tags = tag ? (Array.isArray(tag) ? tag : [tag]) : [];
      for (const t of tags) {
        assertNoFlagInjection(t, "tag");
      }
      if (file) assertNoFlagInjection(file, "file");
      if (target) assertNoFlagInjection(target, "target");
      if (platform) assertNoFlagInjection(platform, "platform");
      for (const a of buildArgs ?? []) {
        assertNoFlagInjection(a, "buildArgs");
      }
      for (const l of label ?? []) {
        assertNoFlagInjection(l, "label");
      }
      for (const c of cacheFrom ?? []) {
        assertNoFlagInjection(c, "cacheFrom");
      }
      for (const c of cacheTo ?? []) {
        assertNoFlagInjection(c, "cacheTo");
      }
      for (const s of secret ?? []) {
        assertNoFlagInjection(s, "secret");
      }
      for (const s of ssh ?? []) {
        assertNoFlagInjection(s, "ssh");
      }
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cwd = path || process.cwd();
      const dockerArgs = ["build", "."];
      // #98: Support multiple tags
      for (const t of tags) {
        dockerArgs.push("-t", t);
      }
      if (file) dockerArgs.push("-f", file);
      if (noCache) dockerArgs.push("--no-cache");
      if (pull) dockerArgs.push("--pull");
      if (target) dockerArgs.push("--target", target);
      if (platform) dockerArgs.push("--platform", platform);
      for (const ba of buildArgs ?? []) {
        dockerArgs.push("--build-arg", ba);
      }
      for (const l of label ?? []) {
        dockerArgs.push("--label", l);
      }
      for (const c of cacheFrom ?? []) {
        dockerArgs.push("--cache-from", c);
      }
      for (const c of cacheTo ?? []) {
        dockerArgs.push("--cache-to", c);
      }
      for (const s of secret ?? []) {
        dockerArgs.push("--secret", s);
      }
      for (const s of ssh ?? []) {
        dockerArgs.push("--ssh", s);
      }
      if (args) dockerArgs.push(...args);

      const start = Date.now();
      const result = await docker(dockerArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;

      const data = parseBuildOutput(result.stdout, result.stderr, result.exitCode, duration);
      return compactDualOutput(
        data,
        result.stdout,
        formatBuild,
        compactBuildMap,
        formatBuildCompact,
        compact === false,
      );
    },
  );
}
