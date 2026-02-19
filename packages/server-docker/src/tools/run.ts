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
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { DockerRunSchema } from "../schemas/index.js";
import { assertValidPortMapping, assertSafeVolumeMount } from "../lib/validation.js";

/** Registers the `run` tool on the given MCP server. */
export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Docker Run",
      description:
        "Runs a Docker container from an image and returns structured container ID and status.",
      inputSchema: {
        image: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Docker image to run (e.g., nginx:latest)"),
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).optional().describe("Container name"),
        ports: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Port mappings (e.g., ["8080:80", "443:443"])'),
        volumes: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Volume mounts (e.g., ["/host/path:/container/path"])'),
        env: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe('Environment variables (e.g., ["KEY=VALUE"])'),
        envFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Read environment variables from a file (--env-file)"),
        detach: z
          .boolean()
          .optional()
          .default(true)
          .describe("Run container in background (default: true)"),
        rm: z
          .boolean()
          .optional()
          .default(false)
          .describe("Remove container after exit (default: false)"),
        command: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default([])
          .describe("Command to run in the container"),
        workdir: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory inside the container (-w, --workdir)"),
        network: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Connect to a Docker network (--network)"),
        platform: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Target platform for multi-arch testing (e.g., "linux/amd64")'),
        entrypoint: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Override image entrypoint (--entrypoint)"),
        user: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Run as a specific user (e.g., "root", "1000:1000")'),
        restart: z
          .enum(["no", "always", "unless-stopped", "on-failure"])
          .optional()
          .describe("Restart policy for the container (--restart)"),
        memory: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Memory limit (e.g., "512m", "1g") for resource constraints'),
        hostname: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Container hostname (-h, --hostname)"),
        shmSize: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe('Size of /dev/shm (e.g., "2g") for browser-based testing containers'),
        pull: z
          .enum(["always", "missing", "never"])
          .optional()
          .describe('Pull image policy: "always", "missing", or "never" (--pull)'),
        cpus: z.number().optional().describe("Number of CPUs to allocate (e.g., 1.5)"),
        readOnly: z
          .boolean()
          .optional()
          .default(false)
          .describe("Mount the container root filesystem as read-only (default: false)"),
        path: cwdPathInput,
        compact: compactInput,
      },
      outputSchema: DockerRunSchema,
    },
    async ({
      image,
      name,
      ports,
      volumes,
      env,
      envFile,
      detach,
      rm,
      command,
      workdir,
      network,
      platform,
      entrypoint,
      user,
      restart,
      memory,
      hostname,
      shmSize,
      pull,
      cpus,
      readOnly,
      path,
      compact,
    }) => {
      assertNoFlagInjection(image, "image");
      if (name) assertNoFlagInjection(name, "name");
      if (workdir) assertNoFlagInjection(workdir, "workdir");
      if (network) assertNoFlagInjection(network, "network");
      if (platform) assertNoFlagInjection(platform, "platform");
      if (entrypoint) assertNoFlagInjection(entrypoint, "entrypoint");
      if (user) assertNoFlagInjection(user, "user");
      if (memory) assertNoFlagInjection(memory, "memory");
      if (hostname) assertNoFlagInjection(hostname, "hostname");
      if (shmSize) assertNoFlagInjection(shmSize, "shmSize");
      if (envFile) assertNoFlagInjection(envFile, "envFile");
      // Validate first element of command array (the binary name) to prevent flag injection.
      // Subsequent elements are intentionally unchecked as they are arguments to the command itself.
      if (command && command.length > 0) {
        assertNoFlagInjection(command[0], "command");
      }

      const args = ["run"];
      if (detach) args.push("-d");
      if (rm) args.push("--rm");
      if (name) args.push("--name", name);
      if (workdir) args.push("-w", workdir);
      if (network) args.push("--network", network);
      if (platform) args.push("--platform", platform);
      if (entrypoint) args.push("--entrypoint", entrypoint);
      if (user) args.push("-u", user);
      if (restart) args.push("--restart", restart);
      if (memory) args.push("-m", memory);
      if (hostname) args.push("-h", hostname);
      if (shmSize) args.push("--shm-size", shmSize);
      if (pull) args.push("--pull", pull);
      if (envFile) args.push("--env-file", envFile);
      for (const p of ports ?? []) {
        assertValidPortMapping(p);
        args.push("-p", p);
      }
      for (const v of volumes ?? []) {
        assertNoFlagInjection(v, "volumes");
        assertSafeVolumeMount(v);
        args.push("-v", v);
      }
      for (const e of env ?? []) {
        assertNoFlagInjection(e, "env");
        args.push("-e", e);
      }
      if (cpus != null) args.push("--cpus", String(cpus));
      if (readOnly) args.push("--read-only");
      args.push(image);
      if (command && command.length > 0) {
        args.push(...command);
      }

      const result = await docker(args, path);

      // #121: Return structured error instead of throwing for non-zero exits
      if (result.exitCode !== 0) {
        const data = parseRunOutput(
          result.stdout,
          image,
          detach ?? true,
          name,
          result.exitCode,
          result.stderr,
        );
        return compactDualOutput(
          data,
          result.stdout || result.stderr,
          formatRun,
          compactRunMap,
          formatRunCompact,
          compact === false,
        );
      }

      // #122: Pass exitCode and stderr for non-detached runs
      const data = parseRunOutput(
        result.stdout,
        image,
        detach ?? true,
        name,
        result.exitCode,
        result.stderr,
      );
      return compactDualOutput(
        data,
        result.stdout,
        formatRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
