import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoRunOutput } from "../lib/parsers.js";
import { formatCargoRun, compactRunMap, formatRunCompact } from "../lib/formatters.js";
import { CargoRunResultSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Cargo Run",
      description:
        "Runs a cargo binary and returns structured output (exit code, stdout, stderr). Use instead of running `cargo run` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Arguments to pass to the binary (after --)"),
        release: z.boolean().optional().default(false).describe("Run in release mode"),
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Package to run in a workspace"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoRunResultSchema,
    },
    async ({ path, args, release, package: pkg, compact }) => {
      const cwd = path || process.cwd();
      if (pkg) assertNoFlagInjection(pkg, "package");
      // Defense-in-depth: validate args even though they come after "--" separator
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

      const cargoArgs = ["run"];
      if (release) cargoArgs.push("--release");
      if (pkg) cargoArgs.push("-p", pkg);
      if (args && args.length > 0) {
        cargoArgs.push("--");
        cargoArgs.push(...args);
      }

      const result = await cargo(cargoArgs, cwd);
      const data = parseCargoRunOutput(result.stdout, result.stderr, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout + result.stderr,
        formatCargoRun,
        compactRunMap,
        formatRunCompact,
        compact === false,
      );
    },
  );
}
