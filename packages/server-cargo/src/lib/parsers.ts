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
 * Parses `cargo add` output.
 * Lines like: "      Adding serde v1.0.217 to dependencies"
 * Also handles: "      Adding serde v1.0.217 to dev-dependencies"
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

  for (const line of lines) {
    const match = line.match(/Adding\s+(\S+)\s+v(\S+)\s+to\s+/);
    if (match) {
      added.push({ name: match[1], version: match[2] });
    }
  }

  const result: CargoAddResult = {
    success: exitCode === 0,
    added,
    total: added.length,
  };

  if (exitCode !== 0) {
    // Extract error message from stderr
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
 * Parses `cargo fmt --check` output.
 * In check mode, lists files with formatting differences (one path per line).
 * In fix mode, returns empty list (files are reformatted in place).
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
 * Converts a CVSS v3 base score to a severity label.
 * See https://www.first.org/cvss/specification-document#Qualitative-Severity-Rating-Scale
 */
function cvssToSeverity(
  cvss: string | null | undefined,
): "critical" | "high" | "medium" | "low" | "informational" | "unknown" {
  if (!cvss) return "unknown";

  // Extract numeric score from CVSS vector or raw number
  let score: number;
  const vectorMatch = cvss.match(/CVSS:\d+\.\d+\/.*?$/);
  if (vectorMatch) {
    // Try to extract the base score from the end or use a simple heuristic
    // CVSS vectors don't embed the score directly; we need to look at AV/AC/etc.
    // However, cargo audit often provides the score separately or we parse from the vector.
    // In practice, cargo audit JSON may include a numeric score field too.
    return "unknown";
  }

  score = parseFloat(cvss);
  if (isNaN(score)) return "unknown";
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  if (score > 0.0) return "low";
  return "informational";
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
