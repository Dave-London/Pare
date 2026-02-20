import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parseInitOutput } from "../lib/parsers.js";
import { formatInit, compactInitMap, formatInitCompact } from "../lib/formatters.js";
import { TerraformInitResultSchema } from "../schemas/index.js";
import { z } from "zod";

/** Registers the `init` tool on the given MCP server. */
export function registerInitTool(server: McpServer) {
  server.registerTool(
    "init",
    {
      title: "Terraform Init",
      description:
        "Initializes a Terraform working directory. Downloads providers, configures backend, and prepares for plan/apply.",
      inputSchema: {
        path: projectPathInput,
        upgrade: z
          .boolean()
          .optional()
          .describe("Upgrade provider plugins to newest acceptable versions (-upgrade)"),
        reconfigure: z
          .boolean()
          .optional()
          .describe("Reconfigure backend, ignoring saved configuration (-reconfigure)"),
        migrateState: z
          .boolean()
          .optional()
          .describe("Migrate state to new backend configuration (-migrate-state)"),
        compact: compactInput,
      },
      outputSchema: TerraformInitResultSchema,
    },
    async ({ path, upgrade, reconfigure, migrateState, compact }) => {
      const cwd = path || process.cwd();
      const args: string[] = ["init", "-input=false"];

      if (upgrade) args.push("-upgrade");
      if (reconfigure) args.push("-reconfigure");
      if (migrateState) args.push("-migrate-state");

      const result = await terraformCmd(args, cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseInitOutput(result.stdout, result.stderr, result.exitCode);

      return compactDualOutput(
        data,
        rawOutput,
        formatInit,
        compactInitMap,
        formatInitCompact,
        compact === false,
      );
    },
  );
}
