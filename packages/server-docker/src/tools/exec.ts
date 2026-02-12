import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseExecOutput } from "../lib/parsers.js";
import { formatExec } from "../lib/formatters.js";
import { DockerExecSchema } from "../schemas/index.js";

export function registerExecTool(server: McpServer) {
  server.registerTool(
    "exec",
    {
      title: "Docker Exec",
      description:
        "Executes a command in a running Docker container and returns structured output. Use instead of running `docker exec` in the terminal.",
      inputSchema: {
        container: z.string().describe("Container name or ID"),
        command: z.array(z.string()).describe('Command to execute (e.g., ["ls", "-la"])'),
        workdir: z.string().optional().describe("Working directory inside the container"),
        env: z
          .array(z.string())
          .optional()
          .default([])
          .describe('Environment variables (e.g., ["KEY=VALUE"])'),
        path: z.string().optional().describe("Host working directory (default: cwd)"),
      },
      outputSchema: DockerExecSchema,
    },
    async ({ container, command, workdir, env, path }) => {
      assertNoFlagInjection(container, "container");
      if (workdir) assertNoFlagInjection(workdir, "workdir");

      const args = ["exec"];
      if (workdir) args.push("-w", workdir);
      for (const e of env ?? []) {
        args.push("-e", e);
      }
      args.push(container, ...command);

      const result = await docker(args, path);
      const data = parseExecOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatExec);
    },
  );
}
