import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, run, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { parseNvmOutput, parseNvmLsRemoteOutput, parseNvmExecOutput } from "../lib/parsers.js";
import { formatNvm, formatNvmLsRemote, formatNvmExec } from "../lib/formatters.js";
import { NvmResultSchema, NvmLsRemoteSchema, NvmExecSchema } from "../schemas/index.js";

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
        "Supports both Unix nvm and nvm-windows. " +
        "Use instead of running `nvm` commands in the terminal.",
      inputSchema: {
        action: z
          .enum(["list", "current", "ls-remote", "exec"])
          .describe(
            "Action: 'list' shows installed versions, 'current' shows active version, " +
              "'ls-remote' lists available remote versions, 'exec' runs a command with a specific Node version",
          ),
        path: z
          .string()
          .optional()
          .describe("Working directory for .nvmrc detection (default: cwd)"),
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
      for (const a of args ?? []) {
        assertNoFlagInjection(a, "args");
      }

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
        const result = await run("nvm", nvmArgs, { timeout: 300_000, cwd });

        const data = parseNvmExecOutput(version, result.exitCode, result.stdout, result.stderr);
        return dualOutput(data, formatNvmExec);
      }

      // ── action: ls-remote ─────────────────────────────────────────────
      if (action === "ls-remote") {
        const lsRemoteResult = await run("nvm", ["ls-remote"], { timeout: 30_000 });
        if (lsRemoteResult.exitCode !== 0 && !lsRemoteResult.stdout) {
          throw new Error(`nvm ls-remote failed: ${lsRemoteResult.stderr}`);
        }

        const data = parseNvmLsRemoteOutput(lsRemoteResult.stdout, majorVersions ?? 4);
        return dualOutput(data, formatNvmLsRemote);
      }

      // ── action: current ───────────────────────────────────────────────
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

        // Read .nvmrc for the required version
        const required = await readNvmrc();

        return dualOutput(
          {
            ...parsed,
            ...(which ? { which } : {}),
            ...(arch ? { arch } : {}),
            ...(required ? { required } : {}),
          },
          formatNvm,
        );
      }

      // ── action: list ──────────────────────────────────────────────────
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
