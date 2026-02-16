import type {
  CargoBuildResult,
  CargoTestResult,
  CargoClippyResult,
  CargoRunResult,
  CargoAddResult,
  CargoRemoveResult,
  CargoFmtResult,
  CargoDocResult,
  CargoUpdateResult,
  CargoTreeResult,
  CargoAuditResult,
} from "../schemas/index.js";

interface CargoMessage {
  reason: string;
  message?: {
    code?: { code: string } | null;
    level: string;
    message: string;
    spans: { file_name: string; line_start: number; column_start: number }[];
  };
}

/**
 * Parses `cargo build --message-format=json` output.
 * Each line is a JSON object with a "reason" field.
 * We care about reason="compiler-message" entries.
 */
export function parseCargoBuildJson(stdout: string, exitCode: number): CargoBuildResult {
  const diagnostics = parseCompilerMessages(stdout);
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

/**
 * Parses `cargo test` output.
 * Format: "test name ... ok/FAILED/ignored"
 * Summary: "test result: ok/FAILED. X passed; Y failed; Z ignored"
 */
export function parseCargoTestOutput(stdout: string, exitCode: number): CargoTestResult {
  const lines = stdout.split("\n");
  const tests: { name: string; status: "ok" | "FAILED" | "ignored"; duration?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^test (.+?) \.\.\. (ok|FAILED|ignored)$/);
    if (match) {
      tests.push({
        name: match[1],
        status: match[2] as "ok" | "FAILED" | "ignored",
      });
    }
  }

  const passed = tests.filter((t) => t.status === "ok").length;
  const failed = tests.filter((t) => t.status === "FAILED").length;
  const ignored = tests.filter((t) => t.status === "ignored").length;

  return {
    success: exitCode === 0,
    tests,
    total: tests.length,
    passed,
    failed,
    ignored,
  };
}

/**
 * Parses `cargo clippy --message-format=json` output.
 * Same JSON format as cargo build. Now includes success field.
 */
export function parseCargoClippyJson(stdout: string, exitCode: number): CargoClippyResult {
  const diagnostics = parseCompilerMessages(stdout);
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

/**
 * Parses `cargo run` output.
 * Returns exit code, stdout, stderr, and success flag.
 */
export function parseCargoRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoRunResult {
  return {
    exitCode,
    stdout,
    stderr,
    success: exitCode === 0,
  };
}

/**
 * Parses `cargo add` output (including `--dry-run` mode).
 * Lines like: "      Adding serde v1.0.217 to dependencies"
 * Also handles: "      Adding serde v1.0.217 to dev-dependencies"
 * Dry-run mode outputs the same Adding lines followed by:
 *   "warning: aborting add due to dry run"
 * On failure, captures the error message.
 */
export function parseCargoAddOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoAddResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const added: { name: string; version: string }[] = [];

  // Detect dry-run mode from the cargo warning message
  const isDryRun = /warning[:\s]*aborting add due to dry run/i.test(combined);

  for (const line of lines) {
    // Match both "Adding" (normal and dry-run) and "Updating" lines
    const addMatch = line.match(/Adding\s+(\S+)\s+v(\S+)\s+to\s+/);
    if (addMatch) {
      added.push({ name: addMatch[1], version: addMatch[2] });
      continue;
    }
    // Some cargo versions use "Updating" in dry-run output when a dep is already present
    const updateMatch = line.match(/Updating\s+(\S+)\s+v\S+\s+->\s+v(\S+)/);
    if (updateMatch) {
      added.push({ name: updateMatch[1], version: updateMatch[2] });
    }
  }

  const result: CargoAddResult = {
    success: exitCode === 0,
    added,
    total: added.length,
  };

  if (isDryRun) {
    result.dryRun = true;
  }

  if (exitCode !== 0) {
    // Extract error message from stderr, filtering out dry-run warnings
    const errorLines = stderr
      .split("\n")
      .filter((l) => !/aborting add due to dry run/i.test(l))
      .map((l) => l.replace(/^\s*error\s*:\s*/i, "").trim())
      .filter(Boolean);
    if (errorLines.length > 0) {
      result.error = errorLines.join("; ");
    }
  }

  return result;
}

/**
 * Parses `cargo remove` output.
 * Lines like: "      Removing serde from dependencies"
 * On failure, captures the error message.
 */
export function parseCargoRemoveOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoRemoveResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const removed: string[] = [];

  for (const line of lines) {
    const match = line.match(/Removing\s+(\S+)\s+from\s+/);
    if (match) {
      removed.push(match[1]);
    }
  }

  const result: CargoRemoveResult = {
    success: exitCode === 0,
    removed,
    total: removed.length,
  };

  if (exitCode !== 0) {
    const errorLines = stderr
      .split("\n")
      .map((l) => l.replace(/^\s*error\s*:\s*/i, "").trim())
      .filter(Boolean);
    if (errorLines.length > 0) {
      result.error = errorLines.join("; ");
    }
  }

  return result;
}

/**
 * Parses `cargo fmt` output in both check and fix (non-check) modes.
 *
 * Check mode: parses "Diff in <file>:" lines or bare file paths from `--check` output.
 * Fix mode: parses file paths from `-- -l` (--files-with-diff) output, which lists
 *   files that were actually reformatted, one path per line on stdout.
 */
export function parseCargoFmtOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  checkMode: boolean,
): CargoFmtResult {
  const files: string[] = [];

  if (checkMode) {
    // In check mode, cargo fmt --check outputs "Diff in <file>:" lines to stdout
    // or just lists file paths. It may also output raw diff lines.
    const combined = stdout + "\n" + stderr;
    const lines = combined.split("\n");

    for (const line of lines) {
      // Match "Diff in <path> at line N:" format
      const diffMatch = line.match(/^Diff in (.+?) at line/);
      if (diffMatch) {
        const file = diffMatch[1];
        if (!files.includes(file)) {
          files.push(file);
        }
        continue;
      }

      // Some versions just list the file path directly
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith("+") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("@") &&
        trimmed.endsWith(".rs")
      ) {
        if (!files.includes(trimmed)) {
          files.push(trimmed);
        }
      }
    }
  } else {
    // In fix mode with -l flag, rustfmt lists reformatted file paths on stdout,
    // one per line. Parse those to report which files were actually changed.
    const combined = stdout + "\n" + stderr;
    const lines = combined.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith("warning") &&
        !trimmed.startsWith("error") &&
        trimmed.endsWith(".rs")
      ) {
        if (!files.includes(trimmed)) {
          files.push(trimmed);
        }
      }
    }
  }

  return {
    success: exitCode === 0,
    filesChanged: files.length,
    files,
  };
}

/**
 * Parses `cargo doc` output.
 * Counts "warning:" or "warning[" lines from stderr,
 * excluding the summary line "warning: N warnings emitted".
 * Optionally extracts the output directory path.
 */
export function parseCargoDocOutput(
  stderr: string,
  exitCode: number,
  cwd?: string,
): CargoDocResult {
  const lines = stderr.split("\n");
  let warnings = 0;

  for (const line of lines) {
    if (line.match(/\bwarning\b(\[|:)/) && !line.match(/\d+ warnings? emitted/)) {
      warnings++;
    }
  }

  const result: CargoDocResult = {
    success: exitCode === 0,
    warnings,
  };

  // Report the doc output directory if available
  if (cwd) {
    result.outputDir = `${cwd}/target/doc`;
  }

  return result;
}

/**
 * Parses `cargo update` output.
 * Returns success flag and combined output text.
 */
export function parseCargoUpdateOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoUpdateResult {
  const output = (stdout + "\n" + stderr).trim();
  return {
    success: exitCode === 0,
    output,
  };
}

/**
 * Parses `cargo tree` output.
 * Returns the full tree text, counts unique package names, and success flag.
 */
export function parseCargoTreeOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoTreeResult {
  if (exitCode !== 0) {
    return {
      success: false,
      tree: stderr.trim() || undefined,
      packages: 0,
    };
  }

  const tree = stdout.trim();
  const lines = tree.split("\n").filter(Boolean);

  // Extract unique package names from tree lines
  // Typical line: "my-app v0.1.0 (/path/to/project)" or "├── serde v1.0.217"
  const packageNames = new Set<string>();
  for (const line of lines) {
    // Match package name + version pattern like "name v1.2.3"
    const match = line.match(/([a-zA-Z0-9_-]+)\s+v\d+/);
    if (match) {
      packageNames.add(match[1]);
    }
  }

  return {
    success: true,
    tree,
    packages: packageNames.size,
  };
}

/**
 * Converts a CVSS score (numeric string or v2/v3/v4 vector string) to a severity label.
 * See https://www.first.org/cvss/specification-document#Qualitative-Severity-Rating-Scale
 *
 * Supports:
 *   - Plain numeric scores: "9.8", "5.5", "0.0"
 *   - CVSS v3.x vector strings: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
 *   - CVSS v2 vector strings: "(AV:N/AC:L/Au:N/C:C/I:C/A:C)"
 */
export function cvssToSeverity(
  cvss: string | null | undefined,
): "critical" | "high" | "medium" | "low" | "informational" | "unknown" {
  if (!cvss) return "unknown";

  const trimmed = cvss.trim();

  // Try CVSS v3.x vector string: "CVSS:3.0/..." or "CVSS:3.1/..."
  const v3Match = trimmed.match(/^CVSS:3\.\d+\/(.*)/);
  if (v3Match) {
    const score = computeCvss3BaseScore(v3Match[1]);
    if (score !== null) return scoreToSeverity(score);
    return "unknown";
  }

  // Try CVSS v2 vector string: "(AV:N/AC:L/Au:N/C:C/I:C/A:C)" or "AV:N/AC:L/..."
  const v2Cleaned = trimmed.replace(/^\(|\)$/g, "");
  if (/^AV:[NAL]\/AC:[HML]\/Au:[MSN]\/C:[NPC]\/I:[NPC]\/A:[NPC]/.test(v2Cleaned)) {
    const score = computeCvss2BaseScore(v2Cleaned);
    if (score !== null) return scoreToSeverity(score);
    return "unknown";
  }

  // Try plain numeric score
  const score = parseFloat(trimmed);
  if (isNaN(score)) return "unknown";
  return scoreToSeverity(score);
}

/**
 * Maps a numeric CVSS score (0.0-10.0) to a severity label.
 */
function scoreToSeverity(score: number): "critical" | "high" | "medium" | "low" | "informational" {
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  if (score > 0.0) return "low";
  return "informational";
}

/**
 * Computes the CVSS v3 base score from a vector string (without the "CVSS:3.x/" prefix).
 * Implements the CVSS v3.1 specification scoring equations.
 * See https://www.first.org/cvss/v3.1/specification-document#7-4-Metric-Values
 */
function computeCvss3BaseScore(vector: string): number | null {
  const metrics = parseVectorMetrics(vector);

  // Required base metrics
  const av = metrics["AV"];
  const ac = metrics["AC"];
  const pr = metrics["PR"];
  const ui = metrics["UI"];
  const s = metrics["S"];
  const c = metrics["C"];
  const i = metrics["I"];
  const a = metrics["A"];

  if (!av || !ac || !pr || !ui || !s || !c || !i || !a) return null;

  // Attack Vector
  const avScores: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
  // Attack Complexity
  const acScores: Record<string, number> = { L: 0.77, H: 0.44 };
  // User Interaction
  const uiScores: Record<string, number> = { N: 0.85, R: 0.62 };
  // Confidentiality, Integrity, Availability Impact
  const impactScores: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };

  // Privileges Required (depends on Scope)
  const scopeChanged = s === "C";
  const prScores: Record<string, Record<string, number>> = {
    U: { N: 0.85, L: 0.62, H: 0.27 },
    C: { N: 0.85, L: 0.68, H: 0.5 },
  };

  const avVal = avScores[av];
  const acVal = acScores[ac];
  const prVal = prScores[scopeChanged ? "C" : "U"]?.[pr];
  const uiVal = uiScores[ui];
  const cVal = impactScores[c];
  const iVal = impactScores[i];
  const aVal = impactScores[a];

  if (
    avVal === undefined ||
    acVal === undefined ||
    prVal === undefined ||
    uiVal === undefined ||
    cVal === undefined ||
    iVal === undefined ||
    aVal === undefined
  ) {
    return null;
  }

  // ISS = 1 - [(1 - C) x (1 - I) x (1 - A)]
  const iss = 1 - (1 - cVal) * (1 - iVal) * (1 - aVal);

  // Impact
  let impact: number;
  if (scopeChanged) {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  } else {
    impact = 6.42 * iss;
  }

  if (impact <= 0) return 0;

  // Exploitability = 8.22 x AV x AC x PR x UI
  const exploitability = 8.22 * avVal * acVal * prVal * uiVal;

  let baseScore: number;
  if (scopeChanged) {
    baseScore = Math.min(1.08 * (impact + exploitability), 10);
  } else {
    baseScore = Math.min(impact + exploitability, 10);
  }

  // Round up to 1 decimal place (CVSS rounding)
  return roundUp(baseScore);
}

/**
 * Computes the CVSS v2 base score from a vector string.
 * Implements the simplified CVSS v2 specification scoring equations.
 * See https://www.first.org/cvss/v2/guide#3-2-1-Base-Equation
 */
function computeCvss2BaseScore(vector: string): number | null {
  const metrics = parseVectorMetrics(vector);

  const av = metrics["AV"];
  const ac = metrics["AC"];
  const au = metrics["Au"];
  const c = metrics["C"];
  const i = metrics["I"];
  const a = metrics["A"];

  if (!av || !ac || !au || !c || !i || !a) return null;

  const avScores: Record<string, number> = { L: 0.395, A: 0.646, N: 1.0 };
  const acScores: Record<string, number> = { H: 0.35, M: 0.61, L: 0.71 };
  const auScores: Record<string, number> = { M: 0.45, S: 0.56, N: 0.704 };
  const impactScores: Record<string, number> = { N: 0, P: 0.275, C: 0.66 };

  const avVal = avScores[av];
  const acVal = acScores[ac];
  const auVal = auScores[au];
  const cVal = impactScores[c];
  const iVal = impactScores[i];
  const aVal = impactScores[a];

  if (
    avVal === undefined ||
    acVal === undefined ||
    auVal === undefined ||
    cVal === undefined ||
    iVal === undefined ||
    aVal === undefined
  ) {
    return null;
  }

  const impact = 10.41 * (1 - (1 - cVal) * (1 - iVal) * (1 - aVal));
  const exploitability = 20 * avVal * acVal * auVal;
  const fImpact = impact === 0 ? 0 : 1.176;
  const baseScore = (0.6 * impact + 0.4 * exploitability - 1.5) * fImpact;

  return roundUp(Math.max(0, baseScore));
}

/**
 * Parses a CVSS vector string into key-value metric pairs.
 * Example: "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" -> {AV:"N", AC:"L", ...}
 */
function parseVectorMetrics(vector: string): Record<string, string> {
  const metrics: Record<string, string> = {};
  for (const part of vector.split("/")) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      metrics[part.substring(0, colonIdx)] = part.substring(colonIdx + 1);
    }
  }
  return metrics;
}

/**
 * Rounds up to 1 decimal place per CVSS specification.
 * "If the value to be rounded has more than one decimal place, round up."
 */
function roundUp(value: number): number {
  const rounded = Math.ceil(value * 10) / 10;
  return rounded;
}

/**
 * Parses `cargo audit --json` output.
 * Returns structured vulnerability data with severity summary and success flag.
 */
export function parseCargoAuditJson(jsonStr: string, exitCode: number): CargoAuditResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return {
      success: false,
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
        unknown: 0,
      },
    };
  }

  type Severity = "critical" | "high" | "medium" | "low" | "informational" | "unknown";

  const vulnData = data.vulnerabilities as { list?: Array<Record<string, unknown>> } | undefined;
  const vulnList = vulnData?.list ?? [];
  const vulnerabilities = vulnList.map(
    (v: {
      advisory?: {
        id?: string;
        title?: string;
        url?: string;
        date?: string;
        cvss?: string | null;
      };
      package?: { name?: string; version?: string };
      versions?: { patched?: string[]; unaffected?: string[] };
    }) => {
      const advisory = v.advisory ?? {};
      const pkg = v.package ?? {};
      const versions = v.versions ?? {};

      return {
        id: advisory.id ?? "unknown",
        package: pkg.name ?? "unknown",
        version: pkg.version ?? "unknown",
        severity: cvssToSeverity(advisory.cvss) as Severity,
        title: advisory.title ?? "Unknown vulnerability",
        url: advisory.url || undefined,
        date: advisory.date || undefined,
        patched: versions.patched ?? [],
        unaffected: versions.unaffected ?? [],
      };
    },
  );

  const summary = {
    total: vulnerabilities.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    unknown: 0,
  };

  for (const v of vulnerabilities) {
    const sev = v.severity as Severity;
    if (sev in summary) {
      summary[sev]++;
    }
  }

  return {
    success: exitCode === 0 || vulnerabilities.length === 0,
    vulnerabilities,
    summary,
  };
}

function parseCompilerMessages(stdout: string) {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const diagnostics: {
    file: string;
    line: number;
    column: number;
    severity: "error" | "warning" | "note" | "help";
    code?: string;
    message: string;
  }[] = [];

  for (const line of lines) {
    let msg: CargoMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }

    if (msg.reason !== "compiler-message" || !msg.message) continue;

    const span = msg.message.spans[0];
    if (!span) continue;

    const severity = (
      ["error", "warning", "note", "help"].includes(msg.message.level)
        ? msg.message.level
        : "warning"
    ) as "error" | "warning" | "note" | "help";

    diagnostics.push({
      file: span.file_name,
      line: span.line_start,
      column: span.column_start,
      severity,
      code: msg.message.code?.code || undefined,
      message: msg.message.message,
    });
  }

  return diagnostics;
}
