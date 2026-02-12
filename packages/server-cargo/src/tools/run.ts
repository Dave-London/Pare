import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoRunOutput } from "../lib/parsers.js";
import { formatCargoRun } from "../lib/formatters.js";
import { CargoRunResultSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Cargo Run",
      description:
        "Runs a cargo binary and returns structured output (exit code, stdout, stderr). Use instead of running `cargo run` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        args: z.array(z.string()).optional().describe("Arguments to pass to the binary (after --)"),
        release: z.boolean().optional().default(false).describe("Run in release mode"),
        package: z.string().optional().describe("Package to run in a workspace"),
      },
      outputSchema: CargoRunResultSchema,
    },
    async ({ path, args, release, package: pkg }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");

      const cargoArgs = ["run"];
      if (release) cargoArgs.push("--release");
      if (pkg) cargoArgs.push("-p", pkg);
      if (args && args.length > 0) {
        cargoArgs.push("--");
        cargoArgs.push(...args);
      }

      const result = await cargo(cargoArgs, cwd);
      const data = parseCargoRunOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatCargoRun);
    },
  );
}
