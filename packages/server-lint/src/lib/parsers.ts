import type {
  LintResult,
  LintDiagnostic,
  FormatCheckResult,
  FormatWriteResult,
} from "../schemas/index.js";

/**
 * Parses ESLint JSON output (from `eslint --format json`).
 *
 * ESLint JSON format is an array of objects:
 * [{ filePath, messages: [{ ruleId, severity, message, line, column, endLine, endColumn, fix }], errorCount, warningCount }]
 */
export function parseEslintJson(stdout: string): LintResult {
  let files: EslintJsonEntry[];
  try {
    files = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, fixable: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];

  for (const file of files) {
    for (const msg of file.messages) {
      diagnostics.push({
        file: file.filePath,
        line: msg.line ?? 0,
        column: msg.column ?? 0,
        endLine: msg.endLine,
        endColumn: msg.endColumn,
        severity: msg.severity === 2 ? "error" : msg.severity === 1 ? "warning" : "info",
        rule: msg.ruleId ?? "unknown",
        message: msg.message,
        fixable: !!msg.fix,
      });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const fixable = diagnostics.filter((d) => d.fixable).length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    fixable,
    filesChecked: files.length,
  };
}

interface EslintJsonEntry {
  filePath: string;
  messages: {
    ruleId: string | null;
    severity: number;
    message: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    fix?: unknown;
  }[];
  errorCount: number;
  warningCount: number;
}

/**
 * Parses Prettier `--check` output.
 *
 * Prettier --check outputs lines like:
 * "Checking formatting...\n[warn] src/index.ts\n[warn] Code style issues found..."
 */
export function parsePrettierCheck(
  stdout: string,
  stderr: string,
  exitCode: number,
): FormatCheckResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const files: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\[warn\]\s+(.+\.\w+)$/);
    if (match) {
      files.push(match[1]);
    }
  }

  return {
    formatted: exitCode === 0,
    files,
    total: files.length,
  };
}

/**
 * Parses Prettier `--write` output.
 *
 * Prettier --write outputs one file path per line for each file it rewrites.
 * If all files are already formatted, output may be empty or just the file names
 * with no changes. We detect changed files from the output lines.
 */
export function parsePrettierWrite(
  stdout: string,
  stderr: string,
  exitCode: number,
): FormatWriteResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const files: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Prettier --write outputs file paths for files it processes.
    // Skip lines that don't look like file paths.
    if (
      trimmed &&
      !trimmed.startsWith("[") &&
      !trimmed.startsWith("Checking") &&
      !trimmed.startsWith("All ") &&
      /\.\w+$/.test(trimmed)
    ) {
      files.push(trimmed);
    }
  }

  return {
    filesChanged: files.length,
    files,
    success: exitCode === 0,
  };
}

/**
 * Parses Biome `check --reporter=json` output.
 *
 * Biome JSON reporter outputs an object with a `diagnostics` array:
 * { diagnostics: [{ category, severity, description, location: { path: { file }, span }, advices }] }
 */
export function parseBiomeJson(stdout: string): LintResult {
  let biomeOutput: BiomeJsonOutput;
  try {
    biomeOutput = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, fixable: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];
  const filesSet = new Set<string>();

  const rawDiags = biomeOutput.diagnostics ?? [];

  for (const diag of rawDiags) {
    const file = diag.location?.path?.file ?? "unknown";
    filesSet.add(file);

    const severity = mapBiomeSeverity(diag.severity);
    const rule = diag.category ?? "unknown";
    const message =
      typeof diag.description === "string"
        ? diag.description
        : (diag.message ?? "unknown diagnostic");

    // Biome spans are byte offsets, not line/column. We extract from sourceCode if available,
    // but default to 0 if line info is not in the JSON output.
    const line = diag.location?.sourceCode?.lineNumber ?? 0;
    const column = diag.location?.sourceCode?.columnNumber ?? 0;

    const fixable = diag.tags?.includes("fixable") ?? false;

    diagnostics.push({
      file,
      line,
      column,
      severity,
      rule,
      message,
      fixable,
    });
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const fixable = diagnostics.filter((d) => d.fixable).length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    fixable,
    filesChecked: filesSet.size,
  };
}

function mapBiomeSeverity(severity: string | undefined): "error" | "warning" | "info" {
  switch (severity) {
    case "error":
    case "fatal":
      return "error";
    case "warning":
      return "warning";
    case "information":
    case "hint":
      return "info";
    default:
      return "warning";
  }
}

interface BiomeJsonOutput {
  diagnostics?: BiomeDiagnostic[];
}

interface BiomeDiagnostic {
  category?: string;
  severity?: string;
  description?: string;
  message?: string;
  location?: {
    path?: { file?: string };
    span?: { start?: number; end?: number };
    sourceCode?: { lineNumber?: number; columnNumber?: number };
  };
  tags?: string[];
  advices?: unknown;
}

/**
 * Parses Biome `format --write` output.
 *
 * Biome format --write outputs lines like:
 * "Formatted 3 files in 50ms. Fixed 2 files."
 * It also outputs individual file paths that were formatted.
 */
export function parseBiomeFormat(
  stdout: string,
  stderr: string,
  exitCode: number,
): FormatWriteResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const files: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip summary lines and empty lines. File paths end with an extension.
    if (
      trimmed &&
      !trimmed.startsWith("Formatted ") &&
      !trimmed.startsWith("Fixed ") &&
      !trimmed.startsWith("Checked ") &&
      /\.\w+$/.test(trimmed)
    ) {
      files.push(trimmed);
    }
  }

  return {
    filesChanged: files.length,
    files,
    success: exitCode === 0,
  };
}
