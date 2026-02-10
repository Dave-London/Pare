import type { TscResult, TscDiagnostic, BuildResult } from "../schemas/index.js";

// tsc output format: file(line,col): error TSxxxx: message
const TSC_DIAGNOSTIC_RE = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/;

export function parseTscOutput(stdout: string, stderr: string, exitCode: number): TscResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const diagnostics: TscDiagnostic[] = [];

  for (const line of lines) {
    const match = line.match(TSC_DIAGNOSTIC_RE);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: parseInt(match[5], 10),
        severity: match[4] as "error" | "warning",
        message: match[6],
      });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
  };
}

export function parseBuildCommandOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BuildResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("error") && !lower.includes("0 error")) {
      errors.push(line.trim());
    } else if (lower.includes("warn") && !lower.includes("0 warn")) {
      warnings.push(line.trim());
    }
  }

  return {
    success: exitCode === 0,
    duration,
    errors,
    warnings,
  };
}
