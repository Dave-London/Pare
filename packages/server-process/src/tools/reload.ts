import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { strippedDualOutput, run, INPUT_LIMITS, cwdPathInput } from "@paretools/shared";
import { formatReload, schemaReloadMap } from "../lib/formatters.js";
import { ReloadResultSchema } from "../schemas/index.js";
import type { ReloadResultInternal } from "../schemas/index.js";

/** Registers the `reload` tool on the given MCP server. */
export function registerReloadTool(server: McpServer) {
  server.registerTool(
    "reload",
    {
      title: "Reload Server",
      description:
        "Rebuilds the MCP server (or a specified project) and sends a `notifications/tools/list_changed` " +
        "notification so the host re-fetches tool definitions. Useful during local development when code " +
        "changes require a rebuild without restarting the session.\n\n" +
        "Default build command: `pnpm build`. Override with `buildCommand` for custom setups.",
      inputSchema: {
        buildCommand: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("pnpm build")
          .describe('Build command to run (default: "pnpm build")'),
        path: cwdPathInput,
        timeout: z
          .number()
          .int()
          .min(1)
          .max(600_000)
          .optional()
          .default(120_000)
          .describe("Build timeout in milliseconds (default: 120000, max: 600000)"),
      },
      outputSchema: ReloadResultSchema,
    },
    async ({ buildCommand, path, timeout }) => {
      const cwd = path || process.cwd();
      const cmd = buildCommand ?? "pnpm build";
      const timeoutMs = timeout ?? 120_000;

      const start = Date.now();
      let rebuilt = false;
      let buildOutput: string | undefined;
      let error: string | undefined;

      try {
        const result = await run("sh", ["-c", cmd], {
          cwd,
          timeout: timeoutMs,
          shell: false,
        });

        rebuilt = result.exitCode === 0;
        const combined = (result.stdout + "\n" + result.stderr).trim();
        buildOutput = combined || undefined;

        if (!rebuilt) {
          error = result.stderr.trim() || `Build exited with code ${result.exitCode}`;
        }
      } catch (err: unknown) {
        rebuilt = false;
        error = err instanceof Error ? err.message : String(err);
      }

      const buildDuration = Date.now() - start;

      // Send the MCP notification to refresh tool definitions
      let notificationSent = false;
      try {
        server.sendToolListChanged();
        notificationSent = true;
      } catch {
        // Server may not be connected yet (e.g., in tests); swallow silently
      }

      const data: ReloadResultInternal = {
        rebuilt,
        notificationSent,
        error,
        buildCommand: cmd,
        buildDuration,
        buildOutput,
      };

      return strippedDualOutput(data, formatReload, schemaReloadMap);
    },
  );
}
