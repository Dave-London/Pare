import type {
  PipInstall,
  MypyResult,
  MypyDiagnosticSchema,
  RuffResult,
  PipAuditResult,
} from "../schemas/index.js";
import { z } from "zod";

type MypyDiagnostic = z.infer<typeof MypyDiagnosticSchema>;

/** Parses `pip install` output into structured data with installed packages and satisfaction status. */
export function parsePipInstall(stdout: string, stderr: string, exitCode: number): PipInstall {
  const output = stdout + "\n" + stderr;
  const alreadySatisfied = output.includes("already satisfied");

  const installed: { name: string; version: string }[] = [];
  const installMatch = output.match(/Successfully installed (.+)/);
  if (installMatch) {
    const packages = installMatch[1].trim().split(/\s+/);
    for (const pkg of packages) {
      const lastDash = pkg.lastIndexOf("-");
      if (lastDash > 0) {
        installed.push({
          name: pkg.slice(0, lastDash),
          version: pkg.slice(lastDash + 1),
        });
      }
    }
  }

  return {
    success: exitCode === 0,
    installed,
    alreadySatisfied,
    total: installed.length,
  };
}

const MYPY_RE = /^(.+?):(\d+)(?::(\d+))?: (error|warning|note): (.+?)(?:\s+\[([^\]]+)\])?$/;

/** Parses mypy type-checker output into structured diagnostics with file locations and error codes. */
export function parseMypyOutput(stdout: string, exitCode: number): MypyResult {
  const lines = stdout.split("\n");
  const diagnostics: MypyDiagnostic[] = [];

  for (const line of lines) {
    const match = line.match(MYPY_RE);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        severity: match[4] as "error" | "warning" | "note",
        message: match[5],
        code: match[6] || undefined,
      });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter(
    (d) => d.severity === "warning" || d.severity === "note",
  ).length;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
  };
}

/** Parses `ruff check --output-format json` output into structured lint diagnostics with fixability info. */
export function parseRuffJson(stdout: string): RuffResult {
  let entries: RuffJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, fixable: 0 };
  }

  const diagnostics = entries.map((e) => ({
    file: e.filename,
    line: e.location.row,
    column: e.location.column,
    endLine: e.end_location?.row,
    endColumn: e.end_location?.column,
    code: e.code,
    message: e.message,
    fixable: !!e.fix,
  }));

  const fixable = diagnostics.filter((d) => d.fixable).length;

  return { diagnostics, total: diagnostics.length, fixable };
}

interface RuffJsonEntry {
  code: string;
  message: string;
  filename: string;
  location: { row: number; column: number };
  end_location?: { row: number; column: number };
  fix?: unknown;
}

/** Parses `pip-audit --format json` output into structured vulnerability data with fix versions. */
export function parsePipAuditJson(stdout: string): PipAuditResult {
  let data: PipAuditJson;
  try {
    data = JSON.parse(stdout);
  } catch {
    return { vulnerabilities: [], total: 0 };
  }

  const vulnerabilities = (data.dependencies ?? []).flatMap((dep) =>
    (dep.vulns ?? []).map((v) => ({
      name: dep.name,
      version: dep.version,
      id: v.id,
      description: v.description ?? "",
      fixVersions: v.fix_versions ?? [],
    })),
  );

  return { vulnerabilities, total: vulnerabilities.length };
}

interface PipAuditJson {
  dependencies?: {
    name: string;
    version: string;
    vulns?: {
      id: string;
      description?: string;
      fix_versions?: string[];
    }[];
  }[];
}
