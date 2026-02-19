import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { z } from "zod";
import { terraformCmd } from "../lib/terraform-runner.js";
import { parseWorkspaceListOutput, parseWorkspaceActionOutput } from "../lib/parsers.js";
import { formatWorkspace, compactWorkspaceMap, formatWorkspaceCompact } from "../lib/formatters.js";
import { TerraformWorkspaceResultSchema } from "../schemas/index.js";

/** Registers the `workspace` tool on the given MCP server. */
export function registerWorkspaceTool(server: McpServer) {
  server.registerTool(
    "workspace",
    {
      title: "Terraform Workspace",
      description: "Manages Terraform workspaces: list, select, create, or delete workspaces.",
      inputSchema: {
        path: projectPathInput,
        action: z
          .enum(["list", "select", "new", "delete"])
          .default("list")
          .describe("Workspace action to perform"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Workspace name (required for select/new/delete)"),
        compact: compactInput,
      },
      outputSchema: TerraformWorkspaceResultSchema,
    },
    async ({ path, action, name, compact }) => {
      const cwd = path || process.cwd();
      if (name) assertNoFlagInjection(name, "name");

      if (action === "list") {
        const result = await terraformCmd(["workspace", "list"], cwd);
        const rawOutput = (result.stdout + "\n" + result.stderr).trim();
        const data = parseWorkspaceListOutput(result.stdout, result.stderr, result.exitCode);

        return compactDualOutput(
          data,
          rawOutput,
          formatWorkspace,
          compactWorkspaceMap,
          formatWorkspaceCompact,
          compact === false,
        );
      }

      // select, new, delete all require a name
      if (!name) {
        const data = {
          success: false,
          action: action as "select" | "new" | "delete",
          error: `Workspace name is required for "${action}" action`,
        };
        return compactDualOutput(
          data,
          "",
          formatWorkspace,
          compactWorkspaceMap,
          formatWorkspaceCompact,
          compact === false,
        );
      }

      const result = await terraformCmd(["workspace", action, name], cwd);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      const data = parseWorkspaceActionOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
        action as "select" | "new" | "delete",
        name,
      );

      return compactDualOutput(
        data,
        rawOutput,
        formatWorkspace,
        compactWorkspaceMap,
        formatWorkspaceCompact,
        compact === false,
      );
    },
  );
}
