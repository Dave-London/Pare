import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseRunOutput } from "../lib/parsers.js";
import { formatRun } from "../lib/formatters.js";
import { DockerRunSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Docker Run",
      description:
        "Runs a Docker container from an image and returns structured container ID and status. Use instead of running `docker run` in the terminal.",
      inputSchema: {
        image: z.string().describe("Docker image to run (e.g., nginx:latest)"),
        name: z.string().optional().describe("Container name"),
        ports: z
          .array(z.string())
          .optional()
          .default([])
          .describe('Port mappings (e.g., ["8080:80", "443:443"])'),
        volumes: z
          .array(z.string())
          .optional()
          .default([])
          .describe('Volume mounts (e.g., ["/host/path:/container/path"])'),
        env: z
          .array(z.string())
          .optional()
          .default([])
          .describe('Environment variables (e.g., ["KEY=VALUE"])'),
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
          .array(z.string())
          .optional()
          .default([])
          .describe("Command to run in the container"),
        path: z.string().optional().describe("Working directory (default: cwd)"),
      },
      outputSchema: DockerRunSchema,
    },
    async ({ image, name, ports, volumes, env, detach, rm, command, path }) => {
      assertNoFlagInjection(image, "image");
      if (name) assertNoFlagInjection(name, "name");

      const args = ["run"];
      if (detach) args.push("-d");
      if (rm) args.push("--rm");
      if (name) args.push("--name", name);
      for (const p of ports ?? []) {
        args.push("-p", p);
      }
      for (const v of volumes ?? []) {
        args.push("-v", v);
      }
      for (const e of env ?? []) {
        args.push("-e", e);
      }
      args.push(image);
      if (command && command.length > 0) {
        args.push(...command);
      }

      const result = await docker(args, path);

      if (result.exitCode !== 0) {
        const errorMsg = result.stderr || result.stdout || "Unknown error";
        throw new Error(`docker run failed: ${errorMsg.trim()}`);
      }

      const data = parseRunOutput(result.stdout, image, detach ?? true, name);
      return dualOutput(data, formatRun);
    },
  );
}
