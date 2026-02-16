import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoGetOutput } from "../lib/parsers.js";
import { formatGoGet, compactGetMap, formatGetCompact } from "../lib/formatters.js";
import { GoGetResultSchema } from "../schemas/index.js";

/** Registers the `get` tool on the given MCP server. */
export function registerGetTool(server: McpServer) {
  server.registerTool(
    "get",
    {
      title: "Go Get",
      description:
        "Downloads and installs Go packages and their dependencies. Use instead of running `go get` in the terminal.",
      inputSchema: {
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("Packages to install (e.g., ['github.com/pkg/errors@latest'])"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        update: z
          .enum(["all", "patch"])
          .optional()
          .describe(
            "Update modules: 'all' maps to -u (update to latest), 'patch' maps to -u=patch (patch-level updates only)",
          ),
        testDeps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Also download packages needed to build and test the specified packages (-t)"),
        verbose: z
          .boolean()
          .optional()
          .default(false)
          .describe("Print information about download and resolution progress (-v)"),
        downloadOnly: z
          .boolean()
          .optional()
          .default(false)
          .describe("Download the named packages but do not install them (-d)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GoGetResultSchema,
    },
    async ({ packages, path, update, testDeps, verbose, downloadOnly, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages) {
        assertNoFlagInjection(p, "packages");
      }
      const args = ["get"];
      if (update === "all") args.push("-u");
      else if (update === "patch") args.push("-u=patch");
      if (testDeps) args.push("-t");
      if (verbose) args.push("-v");
      if (downloadOnly) args.push("-d");
      args.push(...packages);
      const result = await goCmd(args, cwd);
      // Pass requestedPackages for per-package status tracking (Gap #153)
      const data = parseGoGetOutput(result.stdout, result.stderr, result.exitCode, packages);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGoGet,
        compactGetMap,
        formatGetCompact,
        compact === false,
      );
    },
  );
}
