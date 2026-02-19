import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseComposeUpOutput } from "../lib/parsers.js";
import { formatComposeUp, compactComposeUpMap, formatComposeUpCompact } from "../lib/formatters.js";
import { DockerComposeUpSchema } from "../schemas/index.js";

/** Registers the `compose-up` tool on the given MCP server. */
export function registerComposeUpTool(server: McpServer) {
  server.registerTool(
    "compose-up",
    {
      title: "Docker Compose Up",
      description: "Starts Docker Compose services and returns structured status.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .describe("Directory containing docker-compose.yml"),
        services: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Specific services to start (default: all)"),
        scale: z
          .record(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX), z.number().int().min(0))
          .optional()
          .describe("Per-service scale map, mapped to repeated --scale service=num"),
        detach: z.boolean().optional().default(true).describe("Run in background (default: true)"),
        build: z
          .boolean()
          .optional()
          .default(false)
          .describe("Build images before starting (default: false)"),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Compose file path (default: docker-compose.yml)"),
        pull: z
          .enum(["always", "missing", "never"])
          .optional()
          .describe('Pull image policy: "always", "missing", or "never" (--pull)'),
        wait: z
          .boolean()
          .optional()
          .default(false)
          .describe("Wait for services to be running/healthy (default: false)"),
        forceRecreate: z
          .boolean()
          .optional()
          .default(false)
          .describe("Force recreate containers even if config has not changed (default: false)"),
        timeout: z.number().optional().describe("Timeout in seconds for container startup"),
        noRecreate: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not recreate containers if they already exist (default: false)"),
        noDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Do not start linked/dependent services (default: false)"),
        removeOrphans: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Remove containers for services not defined in the Compose file (default: false)",
          ),
        waitTimeout: z
          .number()
          .optional()
          .describe("Maximum time in seconds to wait for services when using --wait"),
        renewAnonVolumes: z
          .boolean()
          .optional()
          .default(false)
          .describe("Recreate anonymous volumes instead of reusing previous data (default: false)"),
        dryRun: z
          .boolean()
          .optional()
          .default(false)
          .describe("Run in dry-run mode without actually starting services (default: false)"),
        compact: compactInput,
      },
      outputSchema: DockerComposeUpSchema,
    },
    async ({
      path,
      services,
      scale,
      detach,
      build,
      file,
      pull,
      wait,
      forceRecreate,
      timeout,
      noRecreate,
      noDeps,
      removeOrphans,
      waitTimeout,
      renewAnonVolumes,
      dryRun,
      compact,
    }) => {
      if (file) assertNoFlagInjection(file, "file");
      if (services) {
        for (const s of services) {
          assertNoFlagInjection(s, "services");
        }
      }
      if (scale) {
        for (const [svc, count] of Object.entries(scale)) {
          assertNoFlagInjection(svc, "scale service");
          if (!Number.isInteger(count) || count < 0) {
            throw new Error("scale values must be non-negative integers");
          }
        }
      }

      const args = ["compose"];
      if (file) args.push("-f", file);
      args.push("up");
      if (detach) args.push("-d");
      if (build) args.push("--build");
      if (pull) args.push("--pull", pull);
      if (wait) args.push("--wait");
      if (forceRecreate) args.push("--force-recreate");
      if (timeout != null) args.push("--timeout", String(timeout));
      if (noRecreate) args.push("--no-recreate");
      if (noDeps) args.push("--no-deps");
      if (removeOrphans) args.push("--remove-orphans");
      if (waitTimeout != null) args.push("--wait-timeout", String(waitTimeout));
      if (renewAnonVolumes) args.push("--renew-anon-volumes");
      if (dryRun) args.push("--dry-run");
      if (scale) {
        for (const [svc, count] of Object.entries(scale)) {
          args.push("--scale", `${svc}=${count}`);
        }
      }
      if (services && services.length > 0) {
        args.push(...services);
      }

      const result = await docker(args, path);
      const data = parseComposeUpOutput(result.stdout, result.stderr, result.exitCode);

      if (result.exitCode !== 0 && data.started === 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker compose up failed: ${errorMsg.trim()}`);
      }

      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatComposeUp,
        compactComposeUpMap,
        formatComposeUpCompact,
        compact === false,
      );
    },
  );
}
