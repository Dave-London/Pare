import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { runPm } from "../lib/npm-runner.js";
import { detectPackageManager } from "../lib/detect-pm.js";
import { parseOutdatedJson, parseYarnOutdatedJson } from "../lib/parsers.js";
import { formatOutdated } from "../lib/formatters.js";
import { NpmOutdatedSchema } from "../schemas/index.js";
import { packageManagerInput, filterInput } from "../lib/pm-input.js";

export function registerOutdatedTool(server: McpServer) {
  server.registerTool(
    "outdated",
    {
      title: "Outdated Packages",
      description:
        "Checks for outdated packages and returns structured update information. " +
        "Auto-detects package manager via lock files (pnpm-lock.yaml → pnpm, yarn.lock → yarn, otherwise npm).",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        packageManager: packageManagerInput,
        filter: filterInput,
      },
      outputSchema: NpmOutdatedSchema,
    },
    async ({ path, packageManager, filter }) => {
      const cwd = path || process.cwd();
      const pm = await detectPackageManager(cwd, packageManager);

      const pmArgs: string[] = [];
      if (pm === "pnpm" && filter) pmArgs.push(`--filter=${filter}`);
      pmArgs.push("outdated", "--json");

      const result = await runPm(pm, pmArgs, cwd);

      // outdated returns exit code 1 when outdated packages exist, which is expected
      const output = result.stdout || "{}";
      const outdated =
        pm === "yarn" ? parseYarnOutdatedJson(output) : parseOutdatedJson(output, pm);
      return dualOutput({ ...outdated, packageManager: pm }, formatOutdated);
    },
  );
}
