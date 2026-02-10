import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { docker } from "../lib/docker-runner.js";
import { parseBuildOutput } from "../lib/parsers.js";
import { formatBuild } from "../lib/formatters.js";
import { DockerBuildSchema } from "../schemas/index.js";

export function registerBuildTool(server: McpServer) {
  server.registerTool(
    "build",
    {
      title: "Docker Build",
      description:
        "Builds a Docker image and returns structured build results including image ID, duration, and errors",
      inputSchema: {
        path: z.string().optional().describe("Build context path (default: cwd)"),
        tag: z.string().optional().describe("Image tag (e.g., myapp:latest)"),
        file: z.string().optional().describe("Dockerfile path (default: Dockerfile)"),
        args: z.array(z.string()).optional().default([]).describe("Additional build arguments"),
      },
      outputSchema: DockerBuildSchema,
    },
    async ({ path, tag, file, args }) => {
      const cwd = path || process.cwd();
      const dockerArgs = ["build", "."];
      if (tag) dockerArgs.push("-t", tag);
      if (file) dockerArgs.push("-f", file);
      if (args) dockerArgs.push(...args);

      const start = Date.now();
      const result = await docker(dockerArgs, cwd);
      const duration = Math.round((Date.now() - start) / 100) / 10;

      const data = parseBuildOutput(result.stdout, result.stderr, result.exitCode, duration);
      return dualOutput(data, formatBuild);
    },
  );
}
