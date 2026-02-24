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
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
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
  };
}

/**
 * Parses Prettier `--write` output.
 *
 * Prettier --write outputs one file path per line for each file it processes.
 * It lists ALL files it touched, not just changed ones. To get accurate change
 * counts, use parsePrettierListDifferent() with `--list-different` before writing.
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
    // Prettier --write outputs file paths for files it processes, sometimes
    // with trailing timing info like " 24ms". Strip timing before checking.
    const cleaned = trimmed.replace(/\s+\d+m?s$/, "");
    // Skip lines that don't look like file paths.
    if (
      cleaned &&
      !cleaned.startsWith("[") &&
      !cleaned.startsWith("Checking") &&
      !cleaned.startsWith("All ") &&
      /\.\w+$/.test(cleaned)
    ) {
      files.push(cleaned);
    }
  }

  const result: FormatWriteResult = {
    filesChanged: files.length,
    files,
    success: exitCode === 0,
  };
  if (exitCode !== 0) {
    result.errorMessage = extractErrorMessage(stderr, stdout);
  }

  return result;
}

/**
 * Parses Prettier `--list-different` output to identify files needing formatting.
 *
 * `prettier --list-different` outputs one file path per line for files that
 * would be changed by formatting. Already-formatted files are not listed.
 * Exit code 0 means all files are formatted; exit code 1 means some need formatting.
 */
export function parsePrettierListDifferent(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /\.\w+$/.test(l));
}

/**
 * Builds a FormatWriteResult by combining --list-different results with --write results.
 *
 * @param listDiffFiles - Files that needed formatting (from --list-different)
 * @param writeExitCode - Exit code from --write pass
 * @param totalFilesProcessed - Total files processed by --write (optional, for filesUnchanged)
 */
export function buildPrettierWriteResult(
  listDiffFiles: string[],
  writeExitCode: number,
  totalFilesProcessed?: number,
  errorMessage?: string,
): FormatWriteResult {
  const result: FormatWriteResult = {
    filesChanged: listDiffFiles.length,
    files: listDiffFiles,
    success: writeExitCode === 0,
  };
  if (totalFilesProcessed !== undefined && totalFilesProcessed > 0) {
    result.filesUnchanged = totalFilesProcessed - listDiffFiles.length;
  }
  if (writeExitCode !== 0 && errorMessage) {
    result.errorMessage = errorMessage;
  }
  return result;
}

/**
 * Parses Biome `check --reporter=json` output.
 *
 * Biome JSON reporter (v2+) outputs an object with diagnostics:
 * {
 *   summary: { changed, unchanged, errors, warnings, ... },
 *   diagnostics: [{
 *     severity, message, category,
 *     location: { path: string, start: { line, column }, end: { line, column } },
 *     advices: [...]
 *   }]
 * }
 *
 * Also supports the older format where location uses:
 *   { path: { file }, span: { start, end }, sourceCode: { lineNumber, columnNumber } }
 */
export function parseBiomeJson(stdout: string): LintResult {
  let biomeOutput: BiomeJsonOutput;
  try {
    biomeOutput = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];
  const filesSet = new Set<string>();

  const rawDiags = biomeOutput.diagnostics ?? [];

  for (const diag of rawDiags) {
    // Extract file path: new format uses location.path as string,
    // old format uses location.path.file
    const file = extractBiomeFilePath(diag.location) ?? "unknown";
    filesSet.add(file);

    const severity = mapBiomeSeverity(diag.severity);
    const rule = diag.category ?? "unknown";
    const message =
      typeof diag.description === "string"
        ? diag.description
        : (diag.message ?? "unknown diagnostic");

    // Extract line number: try new format (location.start.line) first,
    // then fall back to old format (location.sourceCode.lineNumber),
    // then default to 0
    const line = extractBiomeLineNumber(diag.location);

    const diagnostic: LintDiagnostic = {
      file,
      line,
      severity,
      rule,
      message,
    };
    // tags were removed from schema — display-only, not actionable

    // Extract column: try new format first, then old format
    const col = extractBiomeColumnNumber(diag.location);
    if (col !== undefined) {
      diagnostic.column = col;
    }

    diagnostics.push(diagnostic);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    errors,
    warnings,
    filesChecked: filesSet.size,
  };
}

/**
 * Extracts file path from Biome diagnostic location.
 * Supports both new format (path is string) and old format (path.file is string).
 */
function extractBiomeFilePath(
  location: BiomeDiagnostic["location"] | undefined,
): string | undefined {
  if (!location) return undefined;

  // New format (Biome v2+): location.path is a string
  if (typeof location.path === "string") {
    return location.path;
  }

  // Old format: location.path is { file: string }
  if (location.path && typeof location.path === "object" && "file" in location.path) {
    return (location.path as { file?: string }).file;
  }

  return undefined;
}

/**
 * Extracts line number from Biome diagnostic location.
 * Tries new format (start.line) first, then old format (sourceCode.lineNumber).
 */
function extractBiomeLineNumber(location: BiomeDiagnostic["location"] | undefined): number {
  if (!location) return 0;

  // New format (Biome v2+): location.start.line
  if (location.start && typeof location.start.line === "number") {
    return location.start.line;
  }

  // Old format: location.sourceCode.lineNumber
  if (location.sourceCode && typeof location.sourceCode.lineNumber === "number") {
    return location.sourceCode.lineNumber;
  }

  return 0;
}

/**
 * Extracts column number from Biome diagnostic location.
 * Tries new format (start.column) first, then old format (sourceCode.columnNumber).
 */
function extractBiomeColumnNumber(
  location: BiomeDiagnostic["location"] | undefined,
): number | undefined {
  if (!location) return undefined;

  // New format (Biome v2+): location.start.column
  if (location.start && typeof location.start.column === "number") {
    return location.start.column;
  }

  // Old format: location.sourceCode.columnNumber
  const col = location.sourceCode?.columnNumber;
  if (col !== undefined && col !== null) {
    return col;
  }

  return undefined;
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
  summary?: {
    changed?: number;
    unchanged?: number;
    errors?: number;
    warnings?: number;
  };
  diagnostics?: BiomeDiagnostic[];
  command?: string;
}

interface BiomeDiagnostic {
  category?: string;
  severity?: string;
  description?: string;
  message?: string;
  location?: {
    // New format (Biome v2+): path is a string, start/end have line/column
    path?: string | { file?: string };
    start?: { line?: number; column?: number };
    end?: { line?: number; column?: number };
    // Old format: span has byte offsets, sourceCode has line/column
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
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
  }

  const diagnostics: LintDiagnostic[] = [];
  const deprecations: Array<{ text: string; reference?: string }> = [];
  const seenDeprecations = new Set<string>();

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

    for (const dep of file.deprecations ?? []) {
      const text = typeof dep.text === "string" ? dep.text : "";
      if (!text) continue;
      const reference = typeof dep.reference === "string" ? dep.reference : undefined;
      const key = `${text}::${reference ?? ""}`;
      if (seenDeprecations.has(key)) continue;
      seenDeprecations.add(key);
      deprecations.push(reference ? { text, reference } : { text });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  const result: LintResult = {
    diagnostics,
    errors,
    warnings,
    filesChecked: files.length,
  };
  if (deprecations.length > 0) {
    result.deprecations = deprecations;
  }

  return result;
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
  deprecations?: {
    text?: string;
    reference?: string;
  }[];
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
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
  }

  if (!Array.isArray(findings)) {
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
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
    // suggestedFixes were removed from schema — display-only, not actionable
    diagnostics.push(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
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
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
  }

  if (!Array.isArray(findings)) {
    return { diagnostics: [], errors: 0, warnings: 0, filesChecked: 0 };
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
    // wikiUrl was removed from schema — display-only, not actionable
    diagnostics.push(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
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
 * Parses Biome `format --write --reporter=json` output.
 *
 * With JSON reporter, Biome outputs:
 * { summary: { changed, unchanged, ... }, diagnostics: [...] }
 *
 * Without JSON reporter (text output), it outputs:
 * "Formatted N files in Xms. Fixed M files."
 * and individual file paths that were formatted.
 *
 * We try JSON first, then fall back to text parsing.
 */
export function parseBiomeFormat(
  stdout: string,
  stderr: string,
  exitCode: number,
): FormatWriteResult {
  // Try JSON parse first (when --reporter=json is used)
  const jsonResult = parseBiomeFormatJson(stdout);
  if (jsonResult) {
    const result: FormatWriteResult = { ...jsonResult, success: exitCode === 0 };
    if (exitCode !== 0) {
      result.errorMessage = extractErrorMessage(stderr, stdout);
    }
    return result;
  }

  // Fall back to text-based parsing
  return parseBiomeFormatText(stdout, stderr, exitCode);
}

/**
 * Parses Biome format JSON output.
 * Returns null if the output is not valid Biome JSON.
 */
function parseBiomeFormatJson(stdout: string): Omit<FormatWriteResult, "success"> | null {
  let parsed: BiomeJsonOutput;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return null;
  }

  // Validate it's a Biome JSON response (has summary or diagnostics)
  if (!parsed.summary && !parsed.diagnostics) return null;

  const summary = parsed.summary;
  const changed = summary?.changed ?? 0;
  const unchanged = summary?.unchanged ?? 0;

  // Extract file paths from diagnostics that indicate formatting changes
  const files: string[] = [];
  for (const diag of parsed.diagnostics ?? []) {
    if (diag.category === "format" && diag.location) {
      const filePath = extractBiomeFilePath(diag.location);
      if (filePath) files.push(filePath);
    }
  }

  return {
    filesChanged: changed,
    filesUnchanged: unchanged > 0 ? unchanged : undefined,
    files,
  };
}

/**
 * Parses Biome format text output (fallback when JSON reporter is not used).
 */
function parseBiomeFormatText(stdout: string, stderr: string, exitCode: number): FormatWriteResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const files: string[] = [];
  let summaryChanged: number | undefined;
  let summaryTotal: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Extract counts from summary line: "Formatted N files in Xms. Fixed M files."
    const formattedMatch = trimmed.match(/^Formatted\s+(\d+)\s+files?\b/);
    if (formattedMatch) {
      summaryTotal = parseInt(formattedMatch[1], 10);
      const fixedMatch = trimmed.match(/Fixed\s+(\d+)\s+files?\b/);
      if (fixedMatch) {
        summaryChanged = parseInt(fixedMatch[1], 10);
      }
      continue;
    }

    // Skip other summary lines
    if (
      trimmed.startsWith("Fixed ") ||
      trimmed.startsWith("Checked ") ||
      // Skip the "The --json option is unstable" warning
      trimmed.startsWith("The --json")
    ) {
      continue;
    }

    // File paths end with an extension
    if (trimmed && /\.\w+$/.test(trimmed)) {
      files.push(trimmed);
    }
  }

  // Use summary counts if available, otherwise fall back to file count
  const filesChanged = summaryChanged ?? files.length;
  const result: FormatWriteResult = {
    filesChanged,
    files,
    success: exitCode === 0,
  };

  // Compute filesUnchanged from summary if we have both counts
  if (summaryTotal !== undefined && summaryChanged !== undefined) {
    const unchanged = summaryTotal - summaryChanged;
    if (unchanged > 0) {
      result.filesUnchanged = unchanged;
    }
  }
  if (exitCode !== 0) {
    result.errorMessage = extractErrorMessage(stderr, stdout);
  }

  return result;
}

function extractErrorMessage(primary: string, fallback: string): string | undefined {
  const preferred = primary.trim();
  if (preferred) {
    return preferred
      .split("\n")
      .find((line) => line.trim())
      ?.trim();
  }

  return fallback
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !/\.\w+$/.test(line));
}

/** Shell script file extensions for directory expansion. */
const SHELL_EXTENSIONS = new Set(["sh", "bash", "zsh", "ksh", "dash"]);

/**
 * Resolves shellcheck patterns, expanding directories to shell script file paths.
 *
 * ShellCheck requires individual file paths, not directories. If a pattern
 * is a directory, we recursively find shell script files within it.
 *
 * @param patterns - Array of file patterns or directories
 * @param cwd - Working directory for resolving paths
 * @returns Array of resolved file paths
 */
export async function resolveShellcheckPatterns(
  patterns: string[],
  cwd: string,
): Promise<string[]> {
  const { stat, readdir } = await import("node:fs/promises");
  const { join, extname } = await import("node:path");

  const resolvedFiles: string[] = [];

  for (const pattern of patterns) {
    const fullPath = pattern.startsWith("/") ? pattern : join(cwd, pattern);

    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        // Recursively find shell script files in the directory
        const entries = await readdir(fullPath, { recursive: true });
        for (const entry of entries) {
          const ext = extname(String(entry)).slice(1); // remove leading dot
          if (SHELL_EXTENSIONS.has(ext)) {
            resolvedFiles.push(join(fullPath, String(entry)));
          }
        }
      } else if (stats.isFile()) {
        resolvedFiles.push(fullPath);
      }
    } catch {
      // Pattern might be a glob or doesn't exist — pass through as-is
      // and let shellcheck handle the error
      resolvedFiles.push(pattern);
    }
  }

  return resolvedFiles;
}

/**
 * Validates that shellcheck patterns contain actual file paths rather than
 * bare directories. Returns an error message if validation fails, or null if ok.
 */
export function validateShellcheckPatterns(patterns: string[]): string | null {
  const bareDirectories = patterns.filter(
    (p) => p === "." || p === ".." || (p.endsWith("/") && !p.includes("*")),
  );

  if (bareDirectories.length > 0) {
    return (
      `ShellCheck requires file paths, not directories. ` +
      `The following patterns look like directories: ${bareDirectories.join(", ")}. ` +
      `Use glob patterns like "src/**/*.sh" or specific file paths instead.`
    );
  }

  return null;
}
