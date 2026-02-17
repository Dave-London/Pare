import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
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
      description: "Runs cargo audit and returns structured vulnerability data.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Project root path"),
        fix: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Automatically apply fixes for vulnerable dependencies (cargo audit fix). " +
              "Updates Cargo.toml to use patched versions where available.",
          ),
        mode: z
          .enum(["deps", "bin"])
          .optional()
          .default("deps")
          .describe("Audit dependency tree (deps) or a compiled binary (bin)"),
        binPath: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to compiled binary when mode=bin"),
        noFetch: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Skip fetching the advisory database, use local cache only (--no-fetch). Useful for offline or air-gapped environments.",
          ),
        ignore: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Advisory IDs to ignore (--ignore <ADVISORY>). Example: ['RUSTSEC-2022-0090']"),
        deny: z
          .enum(["critical", "high", "medium", "low", "informational", "unknown"])
          .optional()
          .describe(
            "Minimum severity to treat as an error exit code (--deny <SEVERITY>). " +
              "Default: any vulnerability triggers a non-zero exit.",
          ),
        targetArch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter for target architecture (--target-arch <ARCH>). Example: 'x86_64'"),
        targetOs: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter for target OS (--target-os <OS>). Example: 'linux'"),
        file: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to Cargo.lock file (--file <PATH>). Default: auto-detected."),
        db: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Path to advisory database (--db <PATH>)"),
        url: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("URL for advisory database (--url <URL>)"),
        compact: z.boolean().optional().default(true).describe("Prefer compact output"),
      },
      outputSchema: CargoAuditResultSchema,
    },
    async ({
      path,
      fix,
      mode,
      binPath,
      noFetch,
      ignore,
      deny,
      targetArch,
      targetOs,
      file,
      db,
      url: dbUrl,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (targetArch) assertNoFlagInjection(targetArch, "targetArch");
      if (targetOs) assertNoFlagInjection(targetOs, "targetOs");
      if (file) assertNoFlagInjection(file, "file");
      if (db) assertNoFlagInjection(db, "db");
      if (binPath) assertNoFlagInjection(binPath, "binPath");
      if (mode === "bin" && !binPath) {
        throw new Error("binPath is required when mode is 'bin'");
      }
      if (mode === "bin" && fix) {
        throw new Error("fix mode is not supported with mode='bin'");
      }
      if (mode === "deps" && fix && binPath) {
        throw new Error("binPath is only valid when mode is 'bin'");
      }

      const args =
        mode === "bin"
          ? ["audit", "bin", "--json", ...(binPath ? [binPath] : [])]
          : fix
            ? ["audit", "fix", "--json"]
            : ["audit", "--json"];
      if (noFetch) args.push("--no-fetch");
      if (ignore && ignore.length > 0) {
        for (const id of ignore) {
          assertNoFlagInjection(id, "ignore");
          args.push("--ignore", id);
        }
      }
      if (deny) args.push("--deny", deny);
      if (targetArch) args.push("--target-arch", targetArch);
      if (targetOs) args.push("--target-os", targetOs);
      if (file) args.push("--file", file);
      if (db) args.push("--db", db);
      if (dbUrl) args.push("--url", dbUrl);

      const result = await cargo(args, cwd);

      // cargo audit returns exit code 1 when vulnerabilities are found, which is expected
      const output = result.stdout || result.stderr;
      const data = parseCargoAuditJson(output, result.exitCode, !!fix, mode, binPath);
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
