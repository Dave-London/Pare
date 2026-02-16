import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, run } from "@paretools/shared";
import { parseNvmOutput } from "../lib/parsers.js";
import { formatNvm } from "../lib/formatters.js";
import { NvmResultSchema } from "../schemas/index.js";

/** Registers the `nvm` tool on the given MCP server. */
export function registerNvmTool(server: McpServer) {
  server.registerTool(
    "nvm",
    {
      title: "Node Version Manager",
      description:
        "Lists installed Node.js versions and shows the current version via nvm. " +
        "Supports both Unix nvm and nvm-windows. " +
        "Use instead of running `nvm list` or `nvm current` in the terminal.",
      inputSchema: {
        action: z
          .enum(["list", "current"])
          .describe(
            "Action to perform: 'list' shows all installed versions, 'current' shows the active version",
          ),
      },
      outputSchema: NvmResultSchema,
    },
    async ({ action }) => {
      if (action === "current") {
        const result = await run("nvm", ["current"], { timeout: 15_000 });
        if (result.exitCode !== 0 && !result.stdout) {
          throw new Error(`nvm current failed: ${result.stderr}`);
        }
        const parsed = parseNvmOutput("", result.stdout);

        // Try to get the filesystem path to the active Node.js binary
        let which: string | undefined;
        try {
          const whichResult = await run("nvm", ["which", "current"], { timeout: 15_000 });
          if (whichResult.exitCode === 0 && whichResult.stdout.trim()) {
            which = whichResult.stdout.trim();
          }
        } catch {
          // nvm which may not be available on nvm-windows; that's ok
        }

        // Try to detect architecture
        let arch: string | undefined;
        try {
          const archResult = await run("node", ["-e", "process.stdout.write(process.arch)"], {
            timeout: 5_000,
          });
          if (archResult.exitCode === 0 && archResult.stdout.trim()) {
            arch = archResult.stdout.trim();
          }
        } catch {
          // Not critical
        }

        return dualOutput(
          { ...parsed, ...(which ? { which } : {}), ...(arch ? { arch } : {}) },
          formatNvm,
        );
      }

      // action === "list"
      const listResult = await run("nvm", ["list"], { timeout: 15_000 });
      if (listResult.exitCode !== 0 && !listResult.stdout) {
        throw new Error(`nvm list failed: ${listResult.stderr}`);
      }

      // Also get current version as fallback
      let currentStdout = "";
      try {
        const currentResult = await run("nvm", ["current"], { timeout: 15_000 });
        currentStdout = currentResult.stdout;
      } catch {
        // nvm current may fail if no version is active; that's ok
      }

      const parsed = parseNvmOutput(listResult.stdout, currentStdout);

      // Try to get which path and arch
      let which: string | undefined;
      try {
        const whichResult = await run("nvm", ["which", "current"], { timeout: 15_000 });
        if (whichResult.exitCode === 0 && whichResult.stdout.trim()) {
          which = whichResult.stdout.trim();
        }
      } catch {
        // nvm which may not be available; that's ok
      }

      let arch: string | undefined;
      try {
        const archResult = await run("node", ["-e", "process.stdout.write(process.arch)"], {
          timeout: 5_000,
        });
        if (archResult.exitCode === 0 && archResult.stdout.trim()) {
          arch = archResult.stdout.trim();
        }
      } catch {
        // Not critical
      }

      return dualOutput(
        { ...parsed, ...(which ? { which } : {}), ...(arch ? { arch } : {}) },
        formatNvm,
      );
    },
  );
}
