import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { cargo } from "../lib/cargo-runner.js";
import { parseCargoAuditJson } from "../lib/parsers.js";
import { formatCargoAudit, compactAuditMap, formatAuditCompact } from "../lib/formatters.js";
import { CargoAuditResultSchema } from "../schemas/index.js";

/** Registers the `audit` tool on the given MCP server. */
export function registerAuditTool(server: McpServer) {
  server.registerTool(
    "audit",
    {
      title: "Cargo Audit",
      description:
        "Runs cargo audit and returns structured vulnerability data. Use instead of running `cargo audit` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Project root path (default: cwd)"),
        noFetch: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Skip fetching the advisory database, use local cache only (--no-fetch). Useful for offline or air-gapped environments.",
          ),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: CargoAuditResultSchema,
    },
    async ({ path, noFetch, compact }) => {
      const cwd = path || process.cwd();
      const args = ["audit", "--json"];
      if (noFetch) args.push("--no-fetch");
      const result = await cargo(args, cwd);

      // cargo audit returns exit code 1 when vulnerabilities are found, which is expected
      const output = result.stdout || result.stderr;
      const data = parseCargoAuditJson(output);
      return compactDualOutput(
        data,
        output,
        formatCargoAudit,
        compactAuditMap,
        formatAuditCompact,
        compact === false,
      );
    },
  );
}
