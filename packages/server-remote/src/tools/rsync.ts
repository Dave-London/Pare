import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { rsyncCmd } from "../lib/remote-runner.js";
import { parseRsyncOutput } from "../lib/parsers.js";
import { formatRsync, compactRsyncMap, formatRsyncCompact } from "../lib/formatters.js";
import { RsyncResultSchema } from "../schemas/index.js";

/** Registers the `rsync` tool on the given MCP server. */
export function registerRsyncTool(server: McpServer) {
  server.registerTool(
    "rsync",
    {
      title: "Rsync File Sync",
      description:
        "Syncs files between local and remote locations using rsync. WARNING: Defaults to dry-run mode for safety — set dryRun=false to actually transfer files. Returns structured transfer statistics.",
      inputSchema: {
        source: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe(
            "Source path (local path or remote user@host:path). Use trailing / to sync directory contents.",
          ),
        destination: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Destination path (local path or remote user@host:path)"),
        dryRun: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Preview what would be transferred without making changes (default: true for safety). Set to false to actually transfer.",
          ),
        archive: z
          .boolean()
          .optional()
          .default(true)
          .describe("Archive mode: preserves permissions, timestamps, symlinks (rsync -a)"),
        compress: z
          .boolean()
          .optional()
          .default(true)
          .describe("Compress data during transfer (rsync -z)"),
        verbose: z
          .boolean()
          .optional()
          .default(true)
          .describe("Verbose output showing transferred files (rsync -v)"),
        delete: z
          .boolean()
          .optional()
          .describe("Delete files in destination that don't exist in source. Use with caution!"),
        exclude: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Patterns to exclude from sync (e.g. node_modules, .git)"),
        include: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Patterns to include in sync"),
        sshPort: z.number().optional().describe("SSH port for remote transfers"),
        identityFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("SSH private key file for remote transfers"),
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: RsyncResultSchema,
    },
    async ({
      source,
      destination,
      dryRun,
      archive,
      compress,
      verbose,
      delete: deleteDest,
      exclude,
      include,
      sshPort,
      identityFile,
      path,
      compact,
    }) => {
      assertNoFlagInjection(source, "source");
      assertNoFlagInjection(destination, "destination");
      if (identityFile) assertNoFlagInjection(identityFile, "identityFile");

      const cwd = path || process.cwd();
      const args: string[] = [];

      if (archive) args.push("-a");
      if (compress) args.push("-z");
      if (verbose) args.push("-v");
      if (dryRun) args.push("--dry-run");
      if (deleteDest) args.push("--delete");

      // Always include --stats for structured output parsing
      args.push("--stats");

      // Exclude patterns
      for (const pattern of exclude || []) {
        args.push("--exclude", pattern);
      }

      // Include patterns
      for (const pattern of include || []) {
        args.push("--include", pattern);
      }

      // SSH options for remote transfers
      if (sshPort !== undefined || identityFile) {
        const sshOpts: string[] = ["ssh"];
        if (sshPort !== undefined) sshOpts.push(`-p ${sshPort}`);
        if (identityFile) sshOpts.push(`-i ${identityFile}`);
        args.push("-e", sshOpts.join(" "));
      }

      args.push(source, destination);

      const start = Date.now();
      let timedOut = false;
      let result: { exitCode: number; stdout: string; stderr: string };

      try {
        result = await rsyncCmd(args, cwd);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("timed out")) {
          timedOut = true;
          result = { exitCode: 124, stdout: "", stderr: errMsg };
        } else {
          throw err;
        }
      }
      const duration = Date.now() - start;

      const data = parseRsyncOutput(
        source,
        destination,
        dryRun ?? true,
        result.stdout,
        result.stderr,
        result.exitCode,
        duration,
        timedOut,
      );
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatRsync,
        compactRsyncMap,
        formatRsyncCompact,
        compact === false,
      );
    },
  );
}
