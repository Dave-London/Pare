import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import {
  parseNvmOutput,
  parseNvmLsRemoteOutput,
  parseNvmExecOutput,
  parseNvmAliases,
} from "../lib/parsers.js";
import {
  formatNvm,
  formatNvmLsRemote,
  formatNvmExec,
  formatNvmVersion,
} from "../lib/formatters.js";
import { NvmResultSchema } from "../schemas/index.js";

/** Registers the `nvm` tool on the given MCP server. */
export function registerNvmTool(server: McpServer) {
  server.registerTool(
    "nvm",
    {
      title: "Node Version Manager",
      description:
        "Manages Node.js versions via nvm. " +
        "Supports listing installed versions, showing the current version, listing remote versions, " +
        "and executing commands with a specific Node.js version. " +
        "Supports both Unix nvm and nvm-windows.",
      inputSchema: {
        action: z
          .enum(["list", "current", "ls-remote", "exec", "version"])
          .describe(
            "Action: 'list' shows installed versions, 'current' shows active version, " +
              "'ls-remote' lists available remote versions, 'exec' runs a command with a specific Node version, " +
              "'version' resolves a version alias/range without installing",
          ),
        path: z.string().optional().describe("Working directory for .nvmrc detection"),
        version: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Node.js version for 'exec' action (e.g., '20', '20.11.1', 'lts/iron')"),
        command: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Command to run for 'exec' action (e.g., 'node', 'npm')"),
        args: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Arguments for the command in 'exec' action"),
        majorVersions: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .default(4)
          .describe(
            "For 'ls-remote': limit to last N major Node.js versions (default: 4). " +
              "Reduces output size significantly.",
          ),
      },
      // Output schema varies by action — we use the union's largest schema for registration
      // and return the appropriate one per action
      outputSchema: NvmResultSchema,
    },
    async ({ action, path, version, command, args, majorVersions }) => {
      const cwd = path || process.cwd();

      // Validate inputs for exec action
      if (version) assertNoFlagInjection(version, "version");
      if (command) assertNoFlagInjection(command, "command");

      // Helper: read .nvmrc from the working directory
      async function readNvmrc(): Promise<string | undefined> {
        try {
          const nvmrcPath = join(cwd, ".nvmrc");
          const raw = await readFile(nvmrcPath, "utf-8");
          const trimmed = raw.trim();
          return trimmed || undefined;
        } catch {
          return undefined;
        }
      }

      // ── action: exec ──────────────────────────────────────────────────
      if (action === "exec") {
        if (!version) {
          throw new Error("'version' is required for 'exec' action");
        }
        if (!command) {
          throw new Error("'command' is required for 'exec' action");
        }

        // nvm exec <version> <command> [args...]
        const nvmArgs = ["exec", version, command, ...(args ?? [])];
        const result = await runNvmCommand(nvmArgs, { timeout: 300_000, cwd });

        const data = parseNvmExecOutput(version, result.exitCode, result.stdout, result.stderr);
        return dualOutput(data, formatNvmExec);
      }

      // ── action: ls-remote ─────────────────────────────────────────────
      if (action === "ls-remote") {
        const lsRemoteResult = await runNvmCommand(["ls-remote"], { timeout: 30_000 });
        if (lsRemoteResult.exitCode !== 0 && !lsRemoteResult.stdout) {
          throw new Error(`nvm ls-remote failed: ${lsRemoteResult.stderr}`);
        }

        const data = parseNvmLsRemoteOutput(lsRemoteResult.stdout, majorVersions ?? 4);
        return dualOutput(data, formatNvmLsRemote);
      }

      if (action === "version") {
        if (!version) {
          throw new Error("'version' is required for 'version' action");
        }

        const versionResult = await runNvmCommand(["version", version], { timeout: 15_000, cwd });
        if (versionResult.exitCode !== 0 && !versionResult.stdout.trim()) {
          throw new Error(`nvm version failed: ${versionResult.stderr}`);
        }

        const resolvedVersion = versionResult.stdout.trim().split("\n")[0] ?? "";
        return dualOutput(
          {
            current: "none",
            versions: [],
            requestedVersion: version,
            resolvedVersion,
          },
          formatNvmVersion,
        );
      }

      // ── action: current ───────────────────────────────────────────────
      if (action === "current") {
        const result = await runNvmCommand(["current"], { timeout: 15_000 });
        if (result.exitCode !== 0 && !result.stdout) {
          throw new Error(`nvm current failed: ${result.stderr}`);
        }
        const parsed = parseNvmOutput("", result.stdout);

        // Try to get the filesystem path to the active Node.js binary
        let which: string | undefined;
        try {
          const whichResult = await runNvmCommand(["which", "current"], { timeout: 15_000 });
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

        // Read .nvmrc for the required version
        const required = await readNvmrc();

        const structuredData = {
          ...parsed,
          ...(which ? { which } : {}),
          ...(required ? { required } : {}),
        };
        return dualOutput(structuredData, (d) => formatNvm(d, { arch }));
      }

      // ── action: list ──────────────────────────────────────────────────
      const listResult = await runNvmCommand(["list"], { timeout: 15_000 });
      if (listResult.exitCode !== 0 && !listResult.stdout) {
        throw new Error(`nvm list failed: ${listResult.stderr}`);
      }

      // Also get current version as fallback
      let currentStdout = "";
      try {
        const currentResult = await runNvmCommand(["current"], { timeout: 15_000 });
        currentStdout = currentResult.stdout;
      } catch {
        // nvm current may fail if no version is active; that's ok
      }

      const parsed = parseNvmOutput(listResult.stdout, currentStdout);

      // Extract aliases from list output for the human-readable formatter (display-only)
      const aliases = parseNvmAliases(listResult.stdout);

      // Try to get which path and arch
      let which: string | undefined;
      try {
        const whichResult = await runNvmCommand(["which", "current"], { timeout: 15_000 });
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

      return dualOutput({ ...parsed, ...(which ? { which } : {}) }, (d) =>
        formatNvm(d, { aliases, arch }),
      );
    },
  );
}

async function runNvmCommand(args: string[], options: Parameters<typeof run>[2] = {}) {
  try {
    return await run("nvm", args, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isMissingNvm =
      message.includes('Command not found: "nvm"') ||
      message.includes("nvm: command not found") ||
      message.includes("'nvm' is not recognized");
    if (isMissingNvm) {
      throw new Error(
        "nvm is not available in this shell. nvm is often loaded as a shell function; ensure your shell startup config sources nvm (for example, set NVM_DIR and source nvm.sh) before starting Pare.",
      );
    }
    throw error;
  }
}
