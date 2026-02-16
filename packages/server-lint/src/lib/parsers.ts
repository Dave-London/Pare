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
 * [{ filePath, messages: [{ ruleId, severity, message, line, column, endLine, endColumn, fix }], errorCount, warningCount, fixableErrorCount, fixableWarningCount }]
 */
export function parseEslintJson(stdout: string): LintResult {
  let files: EslintJsonEntry[];
  try {
    files = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];
  let fixableErrorCount = 0;
  let fixableWarningCount = 0;

  for (const file of files) {
    fixableErrorCount += file.fixableErrorCount ?? 0;
    fixableWarningCount += file.fixableWarningCount ?? 0;

    for (const msg of file.messages) {
      const diag: LintDiagnostic = {
        file: file.filePath,
        line: msg.line ?? 0,
        severity: msg.severity === 2 ? "error" : msg.severity === 1 ? "warning" : "info",
        rule: msg.ruleId ?? "unknown",
        message: msg.message,
      };
      if (msg.column !== undefined && msg.column !== null) {
        diag.column = msg.column;
      }
      diagnostics.push(diag);
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    fixableErrorCount,
    fixableWarningCount,
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
  fixableErrorCount?: number;
  fixableWarningCount?: number;
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
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
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

    const diagnostic: LintDiagnostic = {
      file,
      line,
      severity,
      rule,
      message,
    };

    const col = diag.location?.sourceCode?.columnNumber;
    if (col !== undefined && col !== null) {
      diagnostic.column = col;
    }

    diagnostics.push(diagnostic);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
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
 * Parses Stylelint JSON output (from `stylelint --formatter json`).
 *
 * Stylelint JSON format is an array of objects:
 * [{ source, warnings: [{ line, column, rule, severity, text }], deprecations, invalidOptionWarnings }]
 */
export function parseStylelintJson(stdout: string): LintResult {
  let files: StylelintJsonEntry[];
  try {
    files = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];

  for (const file of files) {
    for (const warn of file.warnings) {
      const diag: LintDiagnostic = {
        file: file.source ?? "unknown",
        line: warn.line ?? 0,
        severity: warn.severity === "error" ? "error" : "warning",
        rule: warn.rule ?? "unknown",
        message: warn.text ?? "",
      };
      if (warn.column !== undefined && warn.column !== null) {
        diag.column = warn.column;
      }
      diagnostics.push(diag);
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    filesChecked: files.length,
  };
}

interface StylelintJsonEntry {
  source: string | null;
  warnings: {
    line?: number;
    column?: number;
    rule?: string;
    severity: string;
    text?: string;
  }[];
  deprecations?: unknown[];
  invalidOptionWarnings?: unknown[];
}

/**
 * Parses Oxlint JSON output (from `oxlint --format json`).
 *
 * Oxlint outputs one JSON object per line (NDJSON / JSON Lines format):
 * {"file":"src/index.ts","line":5,"column":10,"endLine":5,"endColumn":11,"message":"...","severity":"warning","ruleId":"no-unused-vars"}
 */
export function parseOxlintJson(stdout: string): LintResult {
  const diagnostics: LintDiagnostic[] = [];
  const filesSet = new Set<string>();

  const lines = stdout.split("\n").filter(Boolean);

  for (const line of lines) {
    let entry: OxlintJsonEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Skip non-diagnostic JSON (e.g. summary objects)
    if (!entry.message) continue;

    const file = entry.file ?? "unknown";
    filesSet.add(file);

    const diag: LintDiagnostic = {
      file,
      line: entry.line ?? 0,
      severity: mapOxlintSeverity(entry.severity),
      rule: entry.ruleId ?? "unknown",
      message: entry.message,
    };
    if (entry.column !== undefined && entry.column !== null) {
      diag.column = entry.column;
    }
    diagnostics.push(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    filesChecked: filesSet.size,
  };
}

function mapOxlintSeverity(severity: string | undefined): "error" | "warning" | "info" {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "off":
    case "info":
      return "info";
    default:
      return "warning";
  }
}

interface OxlintJsonEntry {
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message?: string;
  severity?: string;
  ruleId?: string;
  fix?: unknown;
}

/**
 * Parses ShellCheck JSON output (from `shellcheck --format=json`).
 *
 * ShellCheck JSON format is an array of objects:
 * [{ file, line, endLine, column, endColumn, level, code, message, fix }]
 *
 * Levels: "error", "warning", "info", "style"
 * We map "style" to "info" to fit the LintDiagnostic schema.
 */
export function parseShellcheckJson(stdout: string): LintResult {
  let findings: ShellcheckJsonEntry[];
  try {
    findings = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
  }

  if (!Array.isArray(findings)) {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];
  const filesSet = new Set<string>();

  for (const finding of findings) {
    const file = finding.file ?? "unknown";
    filesSet.add(file);

    const diag: LintDiagnostic = {
      file,
      line: finding.line ?? 0,
      severity: mapShellcheckLevel(finding.level),
      rule: finding.code != null ? `SC${finding.code}` : "unknown",
      message: finding.message ?? "",
    };
    if (finding.column !== undefined && finding.column !== null) {
      diag.column = finding.column;
    }
    diagnostics.push(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    filesChecked: filesSet.size,
  };
}

function mapShellcheckLevel(level: string | undefined): "error" | "warning" | "info" {
  switch (level) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
    case "style":
      return "info";
    default:
      return "warning";
  }
}

interface ShellcheckJsonEntry {
  file?: string;
  line?: number;
  endLine?: number;
  column?: number;
  endColumn?: number;
  level?: string;
  code?: number;
  message?: string;
  fix?: unknown;
}

/**
 * Parses Hadolint JSON output (from `hadolint --format json`).
 *
 * Hadolint JSON format is an array of objects:
 * [{ line, code, message, column, file, level }]
 *
 * Levels: "error", "warning", "info", "style"
 * We map "style" to "info" to fit the LintDiagnostic schema.
 */
export function parseHadolintJson(stdout: string): LintResult {
  let findings: HadolintJsonEntry[];
  try {
    findings = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
  }

  if (!Array.isArray(findings)) {
    return { diagnostics: [], total: 0, errors: 0, warnings: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];
  const filesSet = new Set<string>();

  for (const finding of findings) {
    const file = finding.file ?? "unknown";
    filesSet.add(file);

    const rule = finding.code ?? "unknown";
    const diag: LintDiagnostic = {
      file,
      line: finding.line ?? 0,
      severity: mapHadolintLevel(finding.level),
      rule,
      message: finding.message ?? "",
    };
    if (finding.column !== undefined && finding.column !== null) {
      diag.column = finding.column;
    }
    // Compute wiki URL for DL-prefixed rules
    if (typeof rule === "string" && rule.startsWith("DL")) {
      diag.wikiUrl = `https://github.com/hadolint/hadolint/wiki/${rule}`;
    }
    diagnostics.push(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    filesChecked: filesSet.size,
  };
}

function mapHadolintLevel(level: string | undefined): "error" | "warning" | "info" {
  switch (level) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
    case "style":
      return "info";
    default:
      return "warning";
  }
}

interface HadolintJsonEntry {
  file?: string;
  line?: number;
  column?: number;
  level?: string;
  code?: string;
  message?: string;
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
