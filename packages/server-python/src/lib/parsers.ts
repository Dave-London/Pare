import type {
  PipInstall,
  MypyResult,
  MypyDiagnosticSchema,
  RuffResult,
  PipAuditResult,
  PytestResult,
  UvInstall,
  UvRun,
  BlackResult,
  PipList,
  PipShow,
  RuffFormatResult,
  CondaList,
  CondaInfo,
  CondaEnvList,
  CondaResult,
  PyenvResult,
  PoetryResult,
} from "../schemas/index.js";
import { z } from "zod";

type MypyDiagnostic = z.infer<typeof MypyDiagnosticSchema>;

/** Parses `pip install` output into structured data with installed packages and satisfaction status.
 *  Handles both normal installs ("Successfully installed ...") and dry-run output ("Would install ..."). */
export function parsePipInstall(stdout: string, stderr: string, exitCode: number): PipInstall {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const alreadySatisfied = output.includes("already satisfied");
  const dryRun = output.includes("Would install") || output.includes("--dry-run");

  const installed: { name: string; version: string }[] = [];
  const warnings: string[] = [];

  // Normal mode: "Successfully installed pkg-1.0.0 pkg2-2.0.0"
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

  // Dry-run mode: "Would install pkg-1.0.0 pkg2-2.0.0"
  if (installed.length === 0) {
    const dryRunMatch = output.match(/Would install (.+)/);
    if (dryRunMatch) {
      const packages = dryRunMatch[1].trim().split(/\s+/);
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
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(WARNING|DEPRECATION):/i.test(trimmed)) {
      warnings.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
    installed,
    alreadySatisfied,
    warnings: warnings.length > 0 ? warnings : undefined,
    dryRun,
    total: installed.length,
  };
}

const MYPY_RE = /^(.+?):(\d+)(?::(\d+))?: (error|warning|note): (.+?)(?:\s+\[([^\]]+)\])?$/;

/** Mypy JSON output entry (from `--output json`). */
interface MypyJsonEntry {
  file: string;
  line: number;
  column: number;
  message: string;
  hint: string | null;
  code: string | null;
  severity: "error" | "warning" | "note";
}

/** Parses mypy JSON output (from `--output json`) into structured diagnostics. */
export function parseMypyJsonOutput(stdout: string, exitCode: number): MypyResult {
  let entries: MypyJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch {
    // Fall back to text parsing if JSON parsing fails (older mypy without --output json)
    return parseMypyTextOutput(stdout, exitCode);
  }

  if (!Array.isArray(entries)) {
    return parseMypyTextOutput(stdout, exitCode);
  }

  const diagnostics: MypyDiagnostic[] = entries.map((e) => ({
    file: e.file,
    line: e.line,
    column: e.column > 0 ? e.column : undefined,
    severity: e.severity,
    message: e.message,
    code: e.code || undefined,
  }));

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const notes = diagnostics.filter((d) => d.severity === "note").length;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    notes,
  };
}

/** Parses mypy text output into structured diagnostics (fallback for older mypy without JSON). */
export function parseMypyTextOutput(stdout: string, exitCode: number): MypyResult {
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
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const notes = diagnostics.filter((d) => d.severity === "note").length;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    notes,
  };
}

/** Parses mypy output: tries JSON first, falls back to text parsing.
 *  @deprecated Use parseMypyJsonOutput (which auto-falls back) instead. Kept for backward compat. */
export function parseMypyOutput(stdout: string, exitCode: number): MypyResult {
  return parseMypyTextOutput(stdout, exitCode);
}

/** Parses `ruff check --output-format json` output into structured lint diagnostics with fixability info. */
export function parseRuffJson(stdout: string, exitCode: number, stderr = ""): RuffResult {
  let entries: RuffJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch {
    return { success: exitCode === 0, diagnostics: [], total: 0, fixable: 0 };
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
    fixApplicability: extractFixApplicability(e.fix),
    url: e.url || undefined,
  }));

  const fixable = diagnostics.filter((d) => d.fixable).length;
  const fixedMatch =
    stderr.match(/\bFixed\s+(\d+)\s+(?:errors?|violations?)\b/i) ??
    stderr.match(/\b(\d+)\s+fixed\b/i);
  const fixedCount = fixedMatch ? parseInt(fixedMatch[1], 10) : undefined;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    fixable,
    fixedCount,
  };
}

/** Extracts fix applicability from a ruff fix object. */
function extractFixApplicability(
  fix: RuffFixObject | null | undefined,
): "safe" | "unsafe" | "display" | undefined {
  if (!fix) return undefined;
  if (typeof fix === "object" && "applicability" in fix && typeof fix.applicability === "string") {
    const val = fix.applicability.toLowerCase();
    if (val === "safe" || val === "unsafe" || val === "display") {
      return val;
    }
  }
  return undefined;
}

interface RuffFixObject {
  applicability?: string;
  message?: string;
  edits?: unknown[];
}

interface RuffJsonEntry {
  code: string;
  message: string;
  filename: string;
  location: { row: number; column: number };
  end_location?: { row: number; column: number };
  fix?: RuffFixObject | null;
  url?: string;
}

/** Parses `pip-audit --format json` output into structured vulnerability data with fix versions. */
export function parsePipAuditJson(stdout: string, exitCode: number): PipAuditResult {
  let data: PipAuditJson;
  try {
    data = JSON.parse(stdout);
  } catch {
    return { success: exitCode === 0, vulnerabilities: [], total: 0 };
  }

  const byPackage: NonNullable<PipAuditResult["byPackage"]> = [];
  const skipped: NonNullable<PipAuditResult["skipped"]> = [];
  const vulnerabilities = (data.dependencies ?? []).flatMap((dep) => {
    if (dep.skip_reason) {
      skipped.push({ name: dep.name, reason: dep.skip_reason });
      return [];
    }
    const packageVulns = (dep.vulns ?? []).map((v) => ({
      name: dep.name,
      version: dep.version,
      id: v.id,
      description: v.description ?? "",
      fixVersions: v.fix_versions ?? [],
      aliases: v.aliases && v.aliases.length > 0 ? v.aliases : undefined,
      url: v.url || undefined,
      severity: v.severity || undefined,
      cvssScore: v.cvss_score != null ? v.cvss_score : undefined,
    }));
    if (packageVulns.length > 0) {
      byPackage.push({
        name: dep.name,
        version: dep.version,
        vulnerabilities: packageVulns,
      });
    }
    return packageVulns;
  });

  return {
    success: exitCode === 0,
    vulnerabilities,
    byPackage: byPackage.length > 0 ? byPackage : undefined,
    skipped: skipped.length > 0 ? skipped : undefined,
    total: vulnerabilities.length,
  };
}

interface PipAuditJson {
  dependencies?: {
    name: string;
    version: string;
    skip_reason?: string;
    vulns?: {
      id: string;
      description?: string;
      fix_versions?: string[];
      aliases?: string[];
      url?: string;
      severity?: string;
      cvss_score?: number;
    }[];
  }[];
}

const PYTEST_DURATION_RE = /in ([\d.]+)s/;

function extractCount(line: string, label: RegExp): number {
  const m = line.match(label);
  return m ? parseInt(m[1], 10) : 0;
}

/** Parses pytest output into structured test results with pass/fail/error/skip/warning counts and failure details. */
export function parsePytestOutput(stdout: string, stderr: string, exitCode: number): PytestResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  // Find the summary line (e.g., "=== 3 passed, 1 failed in 0.52s ===")
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;
  let warnings = 0;
  let duration = 0;

  for (const line of lines) {
    // Match lines containing pytest summary markers (== ... in Xs ==) or standalone counts
    if (/\d+ (?:passed|failed|error|skipped|warning)/.test(line) || /in [\d.]+s/.test(line)) {
      passed = Math.max(passed, extractCount(line, /(\d+) passed/));
      failed = Math.max(failed, extractCount(line, /(\d+) failed/));
      errors = Math.max(errors, extractCount(line, /(\d+) errors?/));
      skipped = Math.max(skipped, extractCount(line, /(\d+) skipped/));
      warnings = Math.max(warnings, extractCount(line, /(\d+) warnings?/));

      const durationMatch = line.match(PYTEST_DURATION_RE);
      if (durationMatch) {
        duration = parseFloat(durationMatch[1]);
      }
    }
  }

  // Check for "no tests ran" case
  const noTests = output.includes("no tests ran");
  if (noTests && passed === 0 && failed === 0 && errors === 0) {
    return {
      success: exitCode === 0 || exitCode === 5,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings,
      total: 0,
      duration,
      failures: [],
    };
  }

  // Parse failure blocks from short traceback
  const failures: { test: string; message: string }[] = [];
  const failureBlockRe = /_{3,}\s+(.+?)\s+_{3,}/g;
  let failMatch: RegExpExecArray | null;
  while ((failMatch = failureBlockRe.exec(output)) !== null) {
    const testName = failMatch[1].trim();
    const startIdx = failMatch.index + failMatch[0].length;

    // Find the end of this failure block (next FAILED marker, next separator, or end)
    const remaining = output.slice(startIdx);
    const endMatch = remaining.match(/(?:_{3,}|={3,})/);
    const block = endMatch ? remaining.slice(0, endMatch.index) : remaining;

    // Extract the most relevant error line
    const blockLines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let message = "";

    // Look for assertion errors, E lines, or the last meaningful line
    for (const bLine of blockLines) {
      if (bLine.startsWith("E ")) {
        message = message ? message + "\n" + bLine.slice(2).trim() : bLine.slice(2).trim();
      }
    }
    if (!message && blockLines.length > 0) {
      message = blockLines[blockLines.length - 1];
    }

    failures.push({ test: testName, message });
  }

  const total = passed + failed + errors + skipped;

  return {
    success: exitCode === 0,
    passed,
    failed,
    errors,
    skipped,
    warnings,
    total,
    duration,
    failures,
  };
}

// Matches uv install output lines like: " + package==version" or "Installed N packages in Ns"
const UV_INSTALLED_PKG_RE = /^\s*\+\s+(\S+)==(\S+)/;
const UV_SUMMARY_RE = /Installed (\d+) packages? in ([\d.]+)/;
// Matches uv resolution conflict lines like: "`package>=1.0` and `package<1.0`"
const UV_CONFLICT_RE = /`([a-zA-Z0-9_-]+)\s*([^`]*)`/g;

/** Parses uv pip install output into structured data with installed packages.
 *  On failure, extracts resolution conflict information from stderr. */
export function parseUvInstall(stdout: string, stderr: string, exitCode: number): UvInstall {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  const installed: { name: string; version: string }[] = [];
  let duration = 0;

  for (const line of lines) {
    const pkgMatch = line.match(UV_INSTALLED_PKG_RE);
    if (pkgMatch) {
      installed.push({ name: pkgMatch[1], version: pkgMatch[2] });
    }
    const summaryMatch = line.match(UV_SUMMARY_RE);
    if (summaryMatch) {
      duration = parseFloat(summaryMatch[2]);
    }
  }

  // On failure, extract resolution error details from stderr
  let error: string | undefined;
  let resolutionConflicts: { package: string; constraint: string }[] | undefined;

  if (exitCode !== 0) {
    const stderrTrimmed = stderr.trim();
    if (stderrTrimmed) {
      error = stderrTrimmed;
    }

    // Check for resolution/version conflict errors
    if (
      stderr.includes("version solving failed") ||
      stderr.includes("Cannot install") ||
      stderr.includes("conflict") ||
      stderr.includes("incompatible")
    ) {
      const conflicts: { package: string; constraint: string }[] = [];
      const seen = new Set<string>();

      for (const line of stderr.split("\n")) {
        // Reset lastIndex for global regex
        UV_CONFLICT_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = UV_CONFLICT_RE.exec(line)) !== null) {
          const pkg = match[1];
          const constraint = match[2].trim();
          const key = `${pkg}:${constraint}`;
          if (!seen.has(key) && constraint) {
            seen.add(key);
            conflicts.push({ package: pkg, constraint });
          }
        }
      }

      if (conflicts.length > 0) {
        resolutionConflicts = conflicts;
      }
    }
  }

  const alreadySatisfied =
    exitCode === 0 &&
    installed.length === 0 &&
    /(already installed|already satisfied|audited \d+ packages|nothing to install)/i.test(output);

  return {
    success: exitCode === 0,
    installed,
    total: installed.length,
    duration,
    alreadySatisfied,
    error,
    resolutionConflicts,
  };
}

/** Parses uv run output into structured result with exit code, stdout, stderr. */
export function parseUvRun(
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number,
  options?: { maxOutputChars?: number },
): UvRun {
  const uvDiagnosticLines: string[] = [];
  const commandErrLines: string[] = [];
  for (const line of stderr.split("\n")) {
    const trimmed = line.trim();
    if (
      /^(Resolved|Prepared|Installed|Uninstalled|Audited)\b/.test(trimmed) ||
      /^Using (?:Python|CPython)\b/.test(trimmed) ||
      /^Downloading\b/.test(trimmed)
    ) {
      if (trimmed) uvDiagnosticLines.push(trimmed);
    } else {
      commandErrLines.push(line);
    }
  }

  let outputStdout = stdout;
  let outputStderr = commandErrLines.join("\n");
  let truncated = false;
  const maxOutputChars = options?.maxOutputChars ?? 0;
  if (maxOutputChars > 0) {
    if (outputStdout.length > maxOutputChars) {
      outputStdout = outputStdout.slice(0, maxOutputChars) + "…";
      truncated = true;
    }
    if (outputStderr.length > maxOutputChars) {
      outputStderr = outputStderr.slice(0, maxOutputChars) + "…";
      truncated = true;
    }
  }

  return {
    exitCode,
    stdout: outputStdout,
    stderr: outputStderr,
    commandStderr: outputStderr || undefined,
    uvDiagnostics: uvDiagnosticLines.length > 0 ? uvDiagnosticLines : undefined,
    truncated: truncated || undefined,
    success: exitCode === 0,
    duration: Math.round(durationMs) / 1000,
  };
}

const BLACK_REFORMAT_RE = /^would reformat (.+)$/;
const BLACK_REFORMATTED_RE = /^reformatted (.+)$/;
const BLACK_SUMMARY_RE =
  /(\d+) files? (?:would be )?reformatted(?:,\s*(\d+) files? (?:would be )?left unchanged)?|(\d+) files? (?:would be )?left unchanged/;

/** Parses Black code formatter output into structured result with file counts. */
export function parseBlackOutput(stdout: string, stderr: string, exitCode: number): BlackResult {
  // Black writes most output to stderr
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  const wouldReformat: string[] = [];
  const diagnostics: NonNullable<BlackResult["diagnostics"]> = [];
  let filesChanged = 0;
  let filesUnchanged = 0;

  for (const line of lines) {
    const wouldMatch = line.match(BLACK_REFORMAT_RE);
    if (wouldMatch) {
      wouldReformat.push(wouldMatch[1].trim());
    }
    const reformattedMatch = line.match(BLACK_REFORMATTED_RE);
    if (reformattedMatch) {
      wouldReformat.push(reformattedMatch[1].trim());
    }
    const parseDiagMatch = line.match(/cannot format (.+?): Cannot parse: (\d+):(\d+): (.+)$/i);
    if (parseDiagMatch) {
      diagnostics.push({
        file: parseDiagMatch[1],
        line: parseInt(parseDiagMatch[2], 10),
        column: parseInt(parseDiagMatch[3], 10),
        message: parseDiagMatch[4],
      });
    }
  }

  // Parse summary line
  for (const line of lines) {
    const summaryMatch = line.match(BLACK_SUMMARY_RE);
    if (summaryMatch) {
      if (summaryMatch[1]) {
        filesChanged = parseInt(summaryMatch[1], 10);
        filesUnchanged = summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0;
      } else if (summaryMatch[3]) {
        filesChanged = 0;
        filesUnchanged = parseInt(summaryMatch[3], 10);
      }
    }
  }

  // If we found "would reformat" lines but no summary, use those counts
  if (filesChanged === 0 && wouldReformat.length > 0) {
    filesChanged = wouldReformat.length;
  }

  const filesChecked = filesChanged + filesUnchanged;

  // In check mode, success means no files need reformatting
  // In format mode, success is always true (exitCode 0) unless black errors
  // exitCode 1 in check mode = files would be reformatted ("check_failed")
  // exitCode 123 = internal error (parse error or crash)
  const success = exitCode === 0;

  let errorType: "check_failed" | "internal_error" | undefined;
  if (exitCode === 1) {
    errorType = "check_failed";
  } else if (exitCode === 123) {
    errorType = "internal_error";
  }

  return {
    filesChanged,
    filesUnchanged,
    filesChecked,
    success,
    exitCode: exitCode !== 0 ? exitCode : undefined,
    errorType,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    wouldReformat,
  };
}

/** Parses `pip list --format json` output into structured package list.
 *  When outdated=true, also parses latestVersion and latestFiletype fields.
 *  On JSON parse failure, surfaces error with raw output for debugging. */
export function parsePipListJson(stdout: string, exitCode: number, outdated?: boolean): PipList {
  let entries: PipListJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to parse pip list JSON output";
    // Truncate raw output to 500 chars to avoid bloating the response
    const rawOutput = stdout.length > 500 ? stdout.slice(0, 500) + "..." : stdout;
    return {
      success: false,
      packages: [],
      total: 0,
      error: errorMessage,
      rawOutput: rawOutput || undefined,
    };
  }

  if (!Array.isArray(entries)) {
    return {
      success: false,
      packages: [],
      total: 0,
      error: "pip list output is not a JSON array",
      rawOutput: stdout.length > 500 ? stdout.slice(0, 500) + "..." : stdout,
    };
  }

  const packages = entries.map((e) => ({
    name: e.name,
    version: e.version,
    location: e.location || undefined,
    editableProject: e.editable_project != null ? true : undefined,
    ...(outdated && e.latest_version ? { latestVersion: e.latest_version } : {}),
    ...(outdated && e.latest_filetype ? { latestFiletype: e.latest_filetype } : {}),
  }));

  return { success: exitCode === 0, packages, total: packages.length };
}

interface PipListJsonEntry {
  name: string;
  version: string;
  location?: string;
  editable_project?: string;
  latest_version?: string;
  latest_filetype?: string;
}

/** Parses a single block of `pip show` key-value output into a package info object. */
function parseSinglePipShowBlock(block: string): {
  name: string;
  version: string;
  summary: string;
  homepage?: string;
  author?: string;
  authorEmail?: string;
  license?: string;
  location?: string;
  requires?: string[];
  requiredBy?: string[];
  metadataVersion?: string;
  classifiers?: string[];
} {
  const lines = block.split("\n");
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(": ");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 2).trim();
      data[key] = value;
    }
  }

  const requires =
    data["Requires"] && data["Requires"].trim()
      ? data["Requires"].split(",").map((r) => r.trim())
      : [];

  const requiredBy =
    data["Required-by"] && data["Required-by"].trim()
      ? data["Required-by"].split(",").map((r) => r.trim())
      : [];

  const classifiers =
    data["Classifier"] && data["Classifier"].trim()
      ? data["Classifier"].split(",").map((c) => c.trim())
      : [];

  return {
    name: data["Name"] || "",
    version: data["Version"] || "",
    summary: data["Summary"] || "",
    homepage: data["Home-page"] || undefined,
    author: data["Author"] || undefined,
    authorEmail: data["Author-email"] || undefined,
    license: data["License"] || undefined,
    location: data["Location"] || undefined,
    requires,
    requiredBy: requiredBy.length > 0 ? requiredBy : undefined,
    metadataVersion: data["Metadata-Version"] || undefined,
    classifiers: classifiers.length > 0 ? classifiers : undefined,
  };
}

/** Parses `pip show <package>` key-value output into structured package metadata.
 *  Supports multiple packages separated by `---` delimiter. */
export function parsePipShowOutput(stdout: string, exitCode: number): PipShow {
  // Split on `---` separator for multi-package output
  const blocks = stdout
    .split(/^---$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  const packages = blocks.map(parseSinglePipShowBlock);

  // Use first package for backward-compatible top-level fields
  const first =
    packages.length > 0
      ? packages[0]
      : {
          name: "",
          version: "",
          summary: "",
          requires: [] as string[],
        };

  const hasName = Boolean(first.name);

  return {
    success: exitCode === 0 && hasName,
    packages,
    // Backward-compat top-level fields from first package
    name: first.name,
    version: first.version,
    summary: first.summary,
    homepage: first.homepage,
    author: first.author,
    authorEmail: first.authorEmail,
    license: first.license,
    location: first.location,
    requires: first.requires,
    requiredBy: first.requiredBy,
    metadataVersion: first.metadataVersion,
    classifiers: first.classifiers,
  };
}

/** Parses `pyenv` command output into structured version management data. */
export function parsePyenvOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  action:
    | "versions"
    | "version"
    | "install"
    | "installList"
    | "local"
    | "global"
    | "uninstall"
    | "which"
    | "rehash",
): PyenvResult {
  const output = stdout + "\n" + stderr;

  if (exitCode !== 0) {
    const errorMsg = stderr.trim() || stdout.trim() || "pyenv command failed";
    return { action, success: false, error: errorMsg };
  }

  switch (action) {
    case "versions": {
      const versions: string[] = [];
      let current: string | undefined;
      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Lines starting with * indicate current version
        if (trimmed.startsWith("*")) {
          const ver = trimmed
            .replace(/^\*\s*/, "")
            .replace(/\s+\(.*\)$/, "")
            .trim();
          if (ver) {
            versions.push(ver);
            current = ver;
          }
        } else {
          const ver = trimmed.replace(/\s+\(.*\)$/, "").trim();
          if (ver) versions.push(ver);
        }
      }
      return { action, success: true, versions, current };
    }
    case "version": {
      const ver = stdout
        .trim()
        .replace(/\s+\(.*\)$/, "")
        .trim();
      return { action, success: true, current: ver || undefined };
    }
    case "installList": {
      const availableVersions: string[] = [];
      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("Available versions:") && !trimmed.startsWith("--")) {
          availableVersions.push(trimmed);
        }
      }
      return { action, success: true, availableVersions };
    }
    case "install": {
      // pyenv install outputs to stderr typically
      const installed =
        output.match(/Installed Python-(\S+)/)?.[1] || output.match(/Installing Python-(\S+)/)?.[1];
      return {
        action,
        success: true,
        installed: installed || undefined,
      };
    }
    case "uninstall": {
      // pyenv uninstall -f <version>
      // On success, output may contain "pyenv: remove <version>" or similar
      const version =
        output.match(/remove\s+(\S+)/)?.[1] ||
        output.match(/uninstall(?:ed)?\s+(\S+)/i)?.[1] ||
        // If no match, try extracting from stderr which often has the version
        stderr.match(/(\d+\.\d+\.\d+\S*)/)?.[1] ||
        stdout.match(/(\d+\.\d+\.\d+\S*)/)?.[1];
      return {
        action,
        success: true,
        uninstalled: version || undefined,
      };
    }
    case "local": {
      return { action, success: true, localVersion: stdout.trim() || undefined };
    }
    case "global": {
      return { action, success: true, globalVersion: stdout.trim() || undefined };
    }
    case "which": {
      const commandPath = stdout.trim();
      return { action, success: true, commandPath: commandPath || undefined };
    }
    case "rehash": {
      return { action, success: true };
    }
  }
}

const RUFF_FORMAT_WOULD_RE = /^Would reformat: (.+)$/;
const RUFF_FORMAT_DID_RE = /^reformatted: (.+)$/;

/** Parses `ruff format` output into structured result with file counts.
 *  Distinguishes check mode ("Would reformat") from fix mode ("reformatted"). */
export function parseRuffFormatOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): RuffFormatResult {
  // ruff format writes file-level output to stderr
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  const files: string[] = [];
  let checkMode = false;

  for (const line of lines) {
    const wouldMatch = line.match(RUFF_FORMAT_WOULD_RE);
    if (wouldMatch) {
      files.push(wouldMatch[1].trim());
      checkMode = true;
      continue;
    }
    const didMatch = line.match(RUFF_FORMAT_DID_RE);
    if (didMatch) {
      files.push(didMatch[1].trim());
    }
  }

  // Also detect check mode from summary line
  if (output.includes("would be reformatted")) {
    checkMode = true;
  }

  // Parse summary line: "N files reformatted" or "N files would be reformatted" or "N files left unchanged"
  const reformattedMatch = output.match(/(\d+) files? (?:would be )?reformatted/);
  const filesChanged = reformattedMatch ? parseInt(reformattedMatch[1], 10) : files.length;

  // Parse unchanged count: "N files left unchanged" or "N files would be left unchanged"
  const unchangedMatch = output.match(/(\d+) files? (?:would be )?left unchanged/);
  const filesUnchanged = unchangedMatch ? parseInt(unchangedMatch[1], 10) : 0;

  return {
    success: exitCode === 0,
    filesChanged: filesChanged || files.length,
    filesUnchanged,
    files: files.length > 0 ? files : undefined,
    checkMode,
  };
}

// ── conda parsers ────────────────────────────────────────────────────

interface CondaListJsonEntry {
  name: string;
  version: string;
  channel: string;
  build_string?: string;
}

/** Parses `conda list --json` output into structured package list. */
export function parseCondaListJson(stdout: string, envName?: string): CondaList {
  let entries: CondaListJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch (err) {
    const parseError =
      err instanceof Error ? err.message : "Failed to parse conda list JSON output";
    return { action: "list", packages: [], total: 0, environment: envName, parseError };
  }

  if (!Array.isArray(entries)) {
    return {
      action: "list",
      packages: [],
      total: 0,
      environment: envName,
      parseError: "conda list output is not a JSON array",
    };
  }

  const packages = entries.map((e) => ({
    name: e.name,
    version: e.version,
    channel: e.channel,
    buildString: e.build_string || undefined,
  }));

  return { action: "list", packages, total: packages.length, environment: envName };
}

interface CondaInfoJson {
  conda_version?: string;
  platform?: string;
  python_version?: string;
  default_prefix?: string;
  active_prefix?: string;
  active_prefix_name?: string;
  channels?: string[];
  envs_dirs?: string[];
  pkgs_dirs?: string[];
}

/** Parses `conda info --json` output into structured conda metadata. */
export function parseCondaInfoJson(stdout: string): CondaInfo {
  let data: CondaInfoJson;
  try {
    data = JSON.parse(stdout);
  } catch (err) {
    const parseError =
      err instanceof Error ? err.message : "Failed to parse conda info JSON output";
    return {
      action: "info",
      condaVersion: "",
      platform: "",
      pythonVersion: "",
      defaultPrefix: "",
      channels: [],
      envsDirs: [],
      pkgsDirs: [],
      parseError,
    };
  }

  return {
    action: "info",
    condaVersion: data.conda_version ?? "",
    platform: data.platform ?? "",
    pythonVersion: data.python_version ?? "",
    defaultPrefix: data.default_prefix ?? "",
    activePrefix: data.active_prefix || undefined,
    channels: data.channels ?? [],
    envsDirs: data.envs_dirs ?? [],
    pkgsDirs: data.pkgs_dirs ?? [],
  };
}

interface CondaEnvListJson {
  envs?: string[];
}

/** Parses `conda env list --json` output into structured environment list. */
export function parseCondaEnvListJson(stdout: string, activePrefix?: string): CondaEnvList {
  let data: CondaEnvListJson;
  try {
    data = JSON.parse(stdout);
  } catch (err) {
    const parseError =
      err instanceof Error ? err.message : "Failed to parse conda env list JSON output";
    return { action: "env-list", environments: [], total: 0, parseError };
  }

  const envs = (data.envs ?? []).map((envPath) => {
    // Extract name from the last path segment, or "base" for the root env
    const segments = envPath.replace(/\\/g, "/").split("/");
    const name = segments[segments.length - 1] || "base";
    return {
      name,
      path: envPath,
      active: activePrefix ? envPath === activePrefix : false,
    };
  });

  return { action: "env-list", environments: envs, total: envs.length };
}

interface CondaMutationJson {
  success?: boolean;
  error?: string;
  prefix?: string;
  actions?: {
    LINK?: Array<{ name?: string; version?: string; channel?: string; build_string?: string }>;
    UNLINK?: Array<{ name?: string; version?: string; channel?: string; build_string?: string }>;
  };
}

/** Parses `conda create/remove/update --json` output into structured mutation summaries. */
export function parseCondaMutationJson(
  stdout: string,
  stderr: string,
  action: "create" | "remove" | "update",
  environment?: string,
  prefix?: string,
): CondaResult {
  let data: CondaMutationJson;
  try {
    data = stdout.trim() ? JSON.parse(stdout) : {};
  } catch (err) {
    const parseError =
      err instanceof Error ? err.message : `Failed to parse conda ${action} JSON output`;
    if (action === "create") {
      return {
        action,
        success: false,
        environment,
        prefix,
        totalAdded: 0,
        error: stderr.trim() || undefined,
        parseError,
      };
    }
    if (action === "remove") {
      return {
        action,
        success: false,
        environment,
        prefix,
        totalRemoved: 0,
        error: stderr.trim() || undefined,
        parseError,
      };
    }
    return {
      action,
      success: false,
      environment,
      prefix,
      totalUpdated: 0,
      error: stderr.trim() || undefined,
      parseError,
    };
  }

  const linked = (data.actions?.LINK ?? []).map((p) => ({
    name: p.name ?? "",
    version: p.version ?? undefined,
    channel: p.channel ?? undefined,
    buildString: p.build_string ?? undefined,
  }));
  const unlinked = (data.actions?.UNLINK ?? []).map((p) => ({
    name: p.name ?? "",
    version: p.version ?? undefined,
    channel: p.channel ?? undefined,
    buildString: p.build_string ?? undefined,
  }));
  const success = data.success !== false && !data.error;
  const outPrefix = data.prefix ?? prefix;
  const error = data.error ?? (success ? undefined : stderr.trim() || undefined);

  if (action === "create") {
    return {
      action,
      success,
      environment,
      prefix: outPrefix,
      addedPackages: linked.length > 0 ? linked : undefined,
      totalAdded: linked.length,
      error,
    };
  }
  if (action === "remove") {
    return {
      action,
      success,
      environment,
      prefix: outPrefix,
      removedPackages: unlinked.length > 0 ? unlinked : undefined,
      totalRemoved: unlinked.length,
      error,
    };
  }

  const updatedPackages = linked.filter((l) => unlinked.some((u) => u.name === l.name));
  const addedPackages = linked.filter((l) => !unlinked.some((u) => u.name === l.name));
  const removedPackages = unlinked.filter((u) => !linked.some((l) => l.name === u.name));
  return {
    action,
    success,
    environment,
    prefix: outPrefix,
    updatedPackages: updatedPackages.length > 0 ? updatedPackages : undefined,
    addedPackages: addedPackages.length > 0 ? addedPackages : undefined,
    removedPackages: removedPackages.length > 0 ? removedPackages : undefined,
    totalUpdated: updatedPackages.length + addedPackages.length + removedPackages.length,
    error,
  };
}
// ─── poetry parsers ──────────────────────────────────────────────────────────

/** Strict regex matching `poetry show --no-ansi` lines: "package-name  version  description"
 *  Anchored to start, requires package name to start with a letter/digit, and version
 *  to look like a version string (digit-prefixed). This avoids matching status lines,
 *  blank lines, or other non-package output. */
const POETRY_SHOW_RE = /^([a-zA-Z0-9][a-zA-Z0-9._-]*)\s+(\d[a-zA-Z0-9._-]*)(?:\s+(.+))?$/;

/** Regex matching `poetry build` artifact lines: " - Built package-1.0.0.tar.gz" or "  Built package-1.0.0-py3-none-any.whl" */
const POETRY_BUILT_RE = /Built\s+(\S+)/;

/** Regex matching `poetry add/remove` installed/removed lines with version e.g. "  - Installing requests (2.31.0)" */
const POETRY_INSTALL_LINE_RE = /(?:Installing|Updating|Removing)\s+(\S+)\s+\(([^)]+)\)/;

/** Parses poetry output into structured data based on the action performed. */
export function parsePoetryOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  action: "install" | "add" | "remove" | "show" | "build" | "update" | "lock" | "check" | "export",
): PoetryResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  if (action === "show") {
    const packages: { name: string; version: string; description?: string }[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and lines that don't look like package entries
      if (!trimmed) continue;
      const match = trimmed.match(POETRY_SHOW_RE);
      if (match) {
        packages.push({
          name: match[1],
          version: match[2],
          description: match[3]?.trim() || undefined,
        });
      }
    }
    return {
      success: exitCode === 0,
      action,
      packages,
      total: packages.length,
    };
  }

  if (action === "build") {
    const artifacts: { file: string }[] = [];
    for (const line of lines) {
      const match = line.match(POETRY_BUILT_RE);
      if (match) {
        artifacts.push({ file: match[1] });
      }
    }
    return {
      success: exitCode === 0,
      action,
      artifacts,
      total: artifacts.length,
    };
  }

  if (action === "check" || action === "lock" || action === "export") {
    const messages = lines.map((l) => l.trim()).filter(Boolean);
    return {
      success: exitCode === 0,
      action,
      messages: messages.length > 0 ? messages : undefined,
      total: messages.length,
    };
  }

  // install, add, remove, update — parse installed/updated/removed packages
  const packages: { name: string; version: string }[] = [];
  for (const line of lines) {
    const match = line.match(POETRY_INSTALL_LINE_RE);
    if (match) {
      packages.push({ name: match[1], version: match[2] });
    }
  }

  return {
    success: exitCode === 0,
    action,
    packages,
    total: packages.length,
  };
}
