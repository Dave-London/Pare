import type {
  CargoBuildResult,
  CargoCheckResult,
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
  success?: boolean;
  message?: {
    code?: { code: string } | null;
    level: string;
    message: string;
    spans: { file_name: string; line_start: number; column_start: number }[];
    children?: { level: string; message: string }[];
  };
}

/**
 * Parses `cargo build --message-format=json` output.
 * Each line is a JSON object with a "reason" field.
 * We care about reason="compiler-message" entries and the "build-finished" event.
 * Gap #89: Uses build-finished event's success field as authoritative success indicator.
 */
export function parseCargoBuildJson(
  stdout: string,
  exitCode: number,
  stderr?: string,
): CargoBuildResult {
  const { diagnostics: rawDiagnostics, buildFinishedSuccess } = parseCompilerMessages(stdout);
  const diagnostics = deduplicateDiagnostics(rawDiagnostics);
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  // Gap #89: Use build-finished event's success field when available,
  // fall back to exit code
  const success = buildFinishedSuccess !== undefined ? buildFinishedSuccess : exitCode === 0;

  const result: CargoBuildResult = {
    success,
    diagnostics,
  };
  const timings = parseTimingsMetadata(stdout, stderr ?? "");
  if (timings) {
    result.timings = timings;
  }
  return result;
}

/** Parses cargo check output using the build parser. */
export function parseCargoCheckJson(
  stdout: string,
  exitCode: number,
  stderr?: string,
): CargoCheckResult {
  return parseCargoBuildJson(stdout, exitCode, stderr);
}

/**
 * Parses `cargo test` output.
 * Format: "test name ... ok/FAILED/ignored"
 * Summary: "test result: ok/FAILED. X passed; Y failed; Z ignored"
 *
 * For failed tests, captures stdout/stderr output between the "failures:" section
 * and the "failures:" name list or "test result:" line.
 *
 * Gap #95: Also parses JSON message format output for compilation diagnostics.
 */
export function parseCargoTestOutput(
  stdout: string,
  exitCode: number,
  jsonOutput?: string,
): CargoTestResult {
  const lines = stdout.split("\n");
  const tests: {
    name: string;
    status: "ok" | "FAILED" | "ignored";
    duration?: string;
    output?: string;
  }[] = [];

  for (const line of lines) {
    const match = line.match(/^test (.+?) \.\.\. (ok|FAILED|ignored)(?: \(([^)]+)\))?$/);
    if (match) {
      const entry: {
        name: string;
        status: "ok" | "FAILED" | "ignored";
        duration?: string;
      } = {
        name: match[1],
        status: match[2] as "ok" | "FAILED" | "ignored",
      };
      if (match[3]) {
        entry.duration = match[3];
      }
      tests.push(entry);
    }
  }

  // Parse failure output sections.
  // Cargo test output has a "failures:" section containing stdout/stderr for each failed test:
  //   failures:
  //
  //   ---- tests::test_div stdout ----
  //   thread 'tests::test_div' panicked at 'assertion failed: ...'
  //   ...
  //
  //   failures:
  //       tests::test_div
  //
  // We parse output blocks between "---- <name> stdout ----" markers.
  const failureOutputMap = parseFailureOutputSections(stdout);

  // Attach captured output to failed tests
  for (const test of tests) {
    if (test.status === "FAILED" && failureOutputMap.has(test.name)) {
      test.output = failureOutputMap.get(test.name);
    }
  }

  const passed = tests.filter((t) => t.status === "ok").length;
  const failed = tests.filter((t) => t.status === "FAILED").length;
  const ignored = tests.filter((t) => t.status === "ignored").length;

  const result: CargoTestResult = {
    success: exitCode === 0,
    tests,
    passed,
    failed,
    ignored,
  };

  // Gap #95: Parse compilation diagnostics from JSON message format output
  if (jsonOutput) {
    const { diagnostics } = parseCompilerMessages(jsonOutput);
    if (diagnostics.length > 0) {
      result.compilationDiagnostics = diagnostics;
    }
  }

  return result;
}

/**
 * Extracts failure output sections from cargo test output.
 * Looks for blocks starting with "---- <name> stdout ----" and ending at
 * the next "---- " marker or "failures:" or "test result:" line.
 * Returns a map of test name -> captured output.
 */
function parseFailureOutputSections(stdout: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = stdout.split("\n");
  let currentName: string | null = null;
  let currentOutput: string[] = [];

  for (const line of lines) {
    // Match "---- tests::test_name stdout ----"
    const headerMatch = line.match(/^---- (.+?) stdout ----$/);
    if (headerMatch) {
      // Save previous block if any
      if (currentName !== null && currentOutput.length > 0) {
        map.set(currentName, currentOutput.join("\n").trim());
      }
      currentName = headerMatch[1];
      currentOutput = [];
      continue;
    }

    // End markers: next section, failures list, or test result
    if (currentName !== null) {
      if (
        line.match(/^failures:/) ||
        line.match(/^test result:/) ||
        line.match(/^---- .+ stdout ----$/)
      ) {
        if (currentOutput.length > 0) {
          map.set(currentName, currentOutput.join("\n").trim());
        }
        currentName = null;
        currentOutput = [];
        // Check if this line starts a new output section
        const newHeader = line.match(/^---- (.+?) stdout ----$/);
        if (newHeader) {
          currentName = newHeader[1];
        }
        continue;
      }
      currentOutput.push(line);
    }
  }

  // Save final block if any
  if (currentName !== null && currentOutput.length > 0) {
    map.set(currentName, currentOutput.join("\n").trim());
  }

  return map;
}

/**
 * Parses `cargo clippy --message-format=json` output.
 * Same JSON format as cargo build. Now includes success field.
 * Gap #90: Captures suggestion text from JSON children.
 */
export function parseCargoClippyJson(stdout: string, exitCode: number): CargoClippyResult {
  const { diagnostics } = parseCompilerMessages(stdout);

  return {
    success: exitCode === 0,
    diagnostics,
  };
}

/**
 * Parses `cargo run` output.
 * Returns exit code, stdout, stderr, and success flag.
 * Optionally truncates stdout/stderr to maxOutputSize bytes.
 * Gap #94: Distinguishes compilation vs runtime vs timeout failure.
 */
export function parseCargoRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  maxOutputSize?: number,
  timedOut?: boolean,
): CargoRunResult {
  const limit = maxOutputSize ?? 0;
  let stdoutTruncated = false;
  let stderrTruncated = false;
  let finalStdout = stdout;
  let finalStderr = stderr;

  if (limit > 0) {
    if (stdout.length > limit) {
      finalStdout = stdout.slice(0, limit);
      stdoutTruncated = true;
    }
    if (stderr.length > limit) {
      finalStderr = stderr.slice(0, limit);
      stderrTruncated = true;
    }
  }

  const result: CargoRunResult = {
    exitCode,
    stdout: finalStdout,
    stderr: finalStderr,
    success: exitCode === 0,
  };

  // Gap #94: Determine failure type
  if (exitCode !== 0) {
    result.failureType = detectRunFailureType(stderr, exitCode, timedOut);
  }

  if (stdoutTruncated) result.stdoutTruncated = true;
  if (stderrTruncated) result.stderrTruncated = true;

  return result;
}

/**
 * Detects whether a cargo run failure is a compilation error, runtime error, or timeout.
 * Gap #94: Compilation errors have specific patterns from rustc.
 */
export function detectRunFailureType(
  stderr: string,
  exitCode: number,
  timedOut?: boolean,
): "compilation" | "runtime" | "timeout" {
  if (timedOut) return "timeout";

  // Compilation failure patterns from cargo/rustc
  const compilationPatterns = [
    /error\[E\d+\]/,
    /could not compile/,
    /aborting due to \d+ previous error/,
    /^error: .+ not found/m,
    /cannot find/,
  ];

  for (const pattern of compilationPatterns) {
    if (pattern.test(stderr)) {
      return "compilation";
    }
  }

  // Exit code 101 is commonly used by cargo for compilation failures,
  // but also by panics. If we didn't match compilation patterns, it's runtime.
  return "runtime";
}

/** Detects signal metadata from conventional Unix-style exit codes or stderr text. */
export function detectSignalFromExitCode(exitCode: number, stderr: string): string | undefined {
  const explicitSignalMatch = stderr.match(/\bSIG[A-Z0-9]+\b/);
  if (explicitSignalMatch) {
    return explicitSignalMatch[0];
  }

  // By convention, shell exits with 128 + signal number when terminated by a signal.
  if (exitCode >= 129 && exitCode <= 255) {
    const signalNumber = exitCode - 128;
    const signalByNumber: Record<number, string> = {
      1: "SIGHUP",
      2: "SIGINT",
      3: "SIGQUIT",
      6: "SIGABRT",
      9: "SIGKILL",
      11: "SIGSEGV",
      13: "SIGPIPE",
      14: "SIGALRM",
      15: "SIGTERM",
    };
    return signalByNumber[signalNumber] ?? `SIG${signalNumber}`;
  }

  return undefined;
}

/**
 * Parses `cargo add` output (including `--dry-run` mode).
 * Lines like: "      Adding serde v1.0.217 to dependencies"
 * Also handles: "      Adding serde v1.0.217 to dev-dependencies"
 * Dry-run mode outputs the same Adding lines followed by:
 *   "warning: aborting add due to dry run"
 * On failure, captures the error message.
 *
 * Gap #86: Accepts dependency type flags to include in output.
 */
export function parseCargoAddOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  depType?: "normal" | "dev" | "build",
): CargoAddResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const added: { name: string; version: string; featuresActivated?: string[] }[] = [];

  // Detect dry-run mode from the cargo warning message
  const isDryRun = /warning[:\s]*aborting add due to dry run/i.test(combined);

  // Gap #86: Detect dependency type from output if not explicitly provided
  let detectedType: "normal" | "dev" | "build" | undefined = depType;
  let currentPackage: { name: string; version: string; featuresActivated?: string[] } | undefined;
  let inFeaturesBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^features:/i.test(trimmed)) {
      inFeaturesBlock = true;
      continue;
    }

    if (inFeaturesBlock) {
      const featureMatch = trimmed.match(/^[+*-]\s+(.+)$/);
      if (featureMatch && currentPackage) {
        if (!currentPackage.featuresActivated) {
          currentPackage.featuresActivated = [];
        }
        currentPackage.featuresActivated.push(featureMatch[1].trim());
        continue;
      }
      if (trimmed === "") {
        continue;
      }
      inFeaturesBlock = false;
    }

    // Match both "Adding" (normal and dry-run) and "Updating" lines
    const addMatch = line.match(/Adding\s+(\S+)\s+v(\S+)\s+to\s+(\S+)/);
    if (addMatch) {
      currentPackage = { name: addMatch[1], version: addMatch[2] };
      added.push(currentPackage);
      // Detect type from "to dev-dependencies" / "to build-dependencies" / "to dependencies"
      if (!depType) {
        const target = addMatch[3];
        if (target === "dev-dependencies") detectedType = "dev";
        else if (target === "build-dependencies") detectedType = "build";
        else if (target === "dependencies") detectedType = "normal";
      }
      continue;
    }
    // Some cargo versions use "Updating" in dry-run output when a dep is already present
    const updateMatch = line.match(/Updating\s+(\S+)\s+v\S+\s+->\s+v(\S+)/);
    if (updateMatch) {
      currentPackage = { name: updateMatch[1], version: updateMatch[2] };
      added.push(currentPackage);
    }
  }

  const result: CargoAddResult = {
    success: exitCode === 0,
    added,
  };

  if (detectedType) {
    result.dependencyType = detectedType;
  }

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
 *
 * Gap #93: Accepts dependency type flags to include in output.
 */
export function parseCargoRemoveOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  depType?: "normal" | "dev" | "build",
): CargoRemoveResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const removed: string[] = [];
  const failedPackages = new Set<string>();

  // Gap #93: Detect dependency type from output if not explicitly provided
  let detectedType: "normal" | "dev" | "build" | undefined = depType;

  for (const line of lines) {
    const match = line.match(/Removing\s+(\S+)\s+from\s+(\S+)/);
    if (match) {
      removed.push(match[1]);
      // Detect type from "from dev-dependencies" / "from build-dependencies" / "from dependencies"
      if (!depType) {
        const target = match[2];
        if (target === "dev-dependencies") detectedType = "dev";
        else if (target === "build-dependencies") detectedType = "build";
        else if (target === "dependencies") detectedType = "normal";
      }
    }

    const failedMatch =
      line.match(/dependency [`'"]([^`'"]+)[`'"] could not be found/i) ??
      line.match(/package ID specification [`'"]([^`'"]+)[`'"] did not match/i);
    if (failedMatch) {
      failedPackages.add(failedMatch[1]);
    }
  }

  const result: CargoRemoveResult = {
    success: exitCode === 0,
    removed,
  };

  if (detectedType) {
    result.dependencyType = detectedType;
  }

  if (exitCode !== 0) {
    if (removed.length > 0) {
      result.partialSuccess = true;
    }
    if (failedPackages.size > 0) {
      result.failedPackages = Array.from(failedPackages);
    }
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
 * Check mode: Gap #92 - uses --files-with-diff for more reliable file detection.
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
  const diffLines: string[] = [];

  if (checkMode) {
    // Gap #92: In check mode with --files-with-diff, the output contains
    // file paths directly, one per line. Parse those first.
    const combined = stdout + "\n" + stderr;
    const lines = combined.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Match "Diff in <path> at line N:" format (legacy/verbose output)
      const diffMatch = trimmed.match(/^Diff in (.+?) at line/);
      if (diffMatch) {
        const file = diffMatch[1];
        if (!files.includes(file)) {
          files.push(file);
        }
        continue;
      }

      // File paths from --files-with-diff or bare paths ending in .rs
      if (
        trimmed &&
        !trimmed.startsWith("+") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("@") &&
        !trimmed.startsWith("warning") &&
        !trimmed.startsWith("error") &&
        trimmed.endsWith(".rs")
      ) {
        if (!files.includes(trimmed)) {
          files.push(trimmed);
        }
      }

      if (
        trimmed.startsWith("+") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("@@") ||
        trimmed.startsWith("--- ") ||
        trimmed.startsWith("+++ ") ||
        /^diff --git /.test(trimmed) ||
        /^Diff in .+ at line /.test(trimmed)
      ) {
        diffLines.push(line);
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

  // In check mode, exit code 1 with files means "needs formatting" (not a hard error).
  // needsFormatting is true when check mode finds files that need formatting.
  // In fix mode, needsFormatting is always false (files were already reformatted).
  const needsFormatting = checkMode && (exitCode !== 0 || files.length > 0);

  return {
    success: exitCode === 0,
    needsFormatting,
    filesChanged: files.length,
    files,
    ...(checkMode && diffLines.length > 0 ? { diff: diffLines.join("\n") } : {}),
  };
}

/**
 * Parses `cargo doc` output.
 * Counts "warning:" or "warning[" lines from stderr,
 * excluding the summary line "warning: N warnings emitted".
 * Parses structured warning details with file location and message.
 * Optionally extracts the output directory path.
 */
export function parseCargoDocOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  cwd?: string,
): CargoDocResult {
  const fromJson = parseCompilerMessages(stdout)
    .diagnostics.filter((d) => d.severity === "warning")
    .map((d) => ({ file: d.file, line: d.line, message: d.message }));
  const fromText = parseDocWarningsFromText(stderr);

  const merged = new Map<string, { file: string; line: number; message: string }>();
  for (const w of [...fromJson, ...fromText]) {
    const key = `${w.file}:${w.line}:${w.message}`;
    if (!merged.has(key)) {
      merged.set(key, w);
    }
  }
  const warningDetails = Array.from(merged.values());

  const result: CargoDocResult = {
    success: exitCode === 0,
    warnings: warningDetails.length,
  };

  if (warningDetails.length > 0) {
    result.warningDetails = warningDetails;
  }

  // Report the doc output directory if available
  if (cwd) {
    result.outputDir = `${cwd}/target/doc`;
  }

  return result;
}

/**
 * Parses `cargo update` output.
 * Returns success flag, parsed updated packages, and combined output text.
 *
 * Cargo update outputs lines like:
 *   "    Updating serde v1.0.200 -> v1.0.217"
 *   "    Updating crates.io index"
 *   "      Adding new-crate v1.0.0"
 *   "    Removing old-crate v0.5.0"
 *   "    Downgrading foo v2.0.0 -> v1.5.0"
 *   "    Locking serde v1.0.200 -> v1.0.217"  (newer cargo versions)
 *
 * Gap #96: Compact mode now includes updateCount instead of dropping all data.
 */
export function parseCargoUpdateOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoUpdateResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const updated: { name: string; from: string; to: string }[] = [];

  for (const line of lines) {
    // Match "Updating <name> v<from> -> v<to>" or "Locking <name> v<from> -> v<to>"
    // or "Downgrading <name> v<from> -> v<to>"
    const match = line.match(/(?:Updating|Locking|Downgrading)\s+(\S+)\s+v(\S+)\s+->\s+v(\S+)/);
    if (match) {
      updated.push({ name: match[1], from: match[2], to: match[3] });
    }
  }

  return {
    success: exitCode === 0,
    updated,
    totalUpdated: updated.length,
  };
}

/**
 * Parses `cargo tree` output into structured dependency data.
 * Returns the full tree text, a flat list of dependencies with depth,
 * counts unique package names, and success flag.
 *
 * Tree lines use ASCII art prefixes to indicate depth:
 *   "my-app v0.1.0 (/path/to/project)"       -> depth 0
 *   "├── serde v1.0.217"                      -> depth 1
 *   "│   └── serde_derive v1.0.217"           -> depth 2
 *   "└── anyhow v1.0.89"                      -> depth 1
 */
export function parseCargoTreeOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoTreeResult {
  if (exitCode !== 0) {
    return {
      success: false,
      packages: 0,
    };
  }

  const lines = stdout.trim().split("\n").filter(Boolean);

  // Extract unique package names and structured dependency list
  const packageNames = new Set<string>();
  const dependencies: { name: string; version: string; depth: number }[] = [];

  for (const line of lines) {
    // Match package name + version pattern like "name v1.2.3"
    const match = line.match(/([a-zA-Z0-9_-]+)\s+v(\d+[^\s]*)/);
    if (match) {
      packageNames.add(match[1]);

      // Calculate depth from the tree indentation.
      // Each level of depth is represented by 4 chars of tree drawing:
      //   depth 0: "name v1.0.0"
      //   depth 1: "├── name v1.0.0" or "└── name v1.0.0"
      //   depth 2: "│   ├── name v1.0.0" or "│   └── name v1.0.0"
      // We find the position of the package name in the line.
      const nameIndex = line.indexOf(match[1]);
      // The prefix before the name contains tree-drawing characters.
      // Each depth level is 4 characters wide (e.g., "├── " or "│   ")
      // For depth 0, nameIndex is 0.
      // For depth 1, nameIndex is 4 (after "├── ").
      // For depth 2, nameIndex is 8 (after "│   ├── ").
      const depth = nameIndex > 0 ? Math.round(nameIndex / 4) : 0;

      dependencies.push({ name: match[1], version: match[2], depth });
    }
  }

  return {
    success: true,
    dependencies,
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
 * Extracts a numeric CVSS score from a CVSS string.
 * Gap #88: Used to populate cvssScore field in audit output.
 */
export function extractCvssScore(cvss: string | null | undefined): number | undefined {
  if (!cvss) return undefined;

  const trimmed = cvss.trim();

  // Try CVSS v3.x vector string
  const v3Match = trimmed.match(/^CVSS:3\.\d+\/(.*)/);
  if (v3Match) {
    const score = computeCvss3BaseScore(v3Match[1]);
    return score !== null ? score : undefined;
  }

  // Try CVSS v2 vector string
  const v2Cleaned = trimmed.replace(/^\(|\)$/g, "");
  if (/^AV:[NAL]\/AC:[HML]\/Au:[MSN]\/C:[NPC]\/I:[NPC]\/A:[NPC]/.test(v2Cleaned)) {
    const score = computeCvss2BaseScore(v2Cleaned);
    return score !== null ? score : undefined;
  }

  // Try plain numeric score
  const score = parseFloat(trimmed);
  return isNaN(score) ? undefined : score;
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
 * Gap #87: Supports cargo audit fix with fixesApplied count.
 * Gap #88: Includes raw CVSS score and vector string.
 */
export function parseCargoAuditJson(
  jsonStr: string,
  exitCode: number,
  fixMode?: boolean,
  mode: "deps" | "bin" = "deps",
  auditedBinary?: string,
): CargoAuditResult {
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

  const vulnData = data.vulnerabilities as
    | { list?: Array<Record<string, unknown>> }
    | Array<Record<string, unknown>>
    | undefined;
  const vulnList = Array.isArray(vulnData) ? vulnData : (vulnData?.list ?? []);
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

      const entry: {
        id: string;
        package: string;
        version: string;
        severity: Severity;
        title: string;
        patched: string[];
        unaffected?: string[];
        cvssScore?: number;
      } = {
        id: advisory.id ?? "unknown",
        package: pkg.name ?? "unknown",
        version: pkg.version ?? "unknown",
        severity: cvssToSeverity(advisory.cvss) as Severity,
        title: advisory.title ?? "Unknown vulnerability",
        patched: versions.patched ?? [],
        unaffected: versions.unaffected ?? [],
      };

      // Gap #88: Include raw CVSS score
      if (advisory.cvss) {
        const score = extractCvssScore(advisory.cvss);
        if (score !== undefined) {
          entry.cvssScore = score;
        }
      }

      return entry;
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

  const result: CargoAuditResult = {
    success: exitCode === 0 || vulnerabilities.length === 0,
    mode,
    ...(auditedBinary ? { auditedBinary } : {}),
    vulnerabilities,
    summary,
  };

  // Gap #87: For fix mode, count fixes from patched vulnerabilities
  if (fixMode) {
    // In fix mode, cargo audit fix attempts to fix all vulnerabilities.
    // The number of fixes is inferred from vulnerabilities that have patched versions.
    const fixable = vulnerabilities.filter((v) => v.patched.length > 0).length;
    result.fixesApplied = fixable;
  }

  return result;
}

function deduplicateDiagnostics<
  T extends { file: string; line: number; column: number; severity: string },
>(diagnostics: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const d of diagnostics) {
    const code = "code" in d ? String((d as { code?: string }).code ?? "") : "";
    const message = "message" in d ? String((d as { message?: string }).message ?? "") : "";
    const key = `${d.file}:${d.line}:${d.column}:${d.severity}:${code}:${message}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(d);
    }
  }
  return deduped;
}

function parseTimingsMetadata(
  stdout: string,
  stderr: string,
): { generated: boolean; format?: "html" | "json" | "unknown"; reportPath?: string } | undefined {
  const combined = `${stdout}\n${stderr}`;
  const timingPathMatch = combined.match(/([^\s]+timings?[^\s]*\.(html|json))/i);
  if (timingPathMatch) {
    const format = timingPathMatch[2]?.toLowerCase();
    return {
      generated: true,
      format: format === "html" || format === "json" ? format : "unknown",
      reportPath: timingPathMatch[1],
    };
  }

  if (/\b--timings\b|timings?/i.test(combined)) {
    return { generated: true, format: "unknown" };
  }

  return undefined;
}

function parseDocWarningsFromText(
  stderr: string,
): { file: string; line: number; message: string }[] {
  const lines = stderr.split("\n");
  const warningDetails: { file: string; line: number; message: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/\bwarning\b(\[|:)/) && !line.match(/\d+ warnings? emitted/)) {
      const msgMatch = line.match(/\bwarning(?:\[[^\]]+\])?\s*:\s*(.+)/);
      const message = msgMatch ? msgMatch[1].trim() : line.trim();

      let file = "";
      let lineNum = 0;
      if (i + 1 < lines.length) {
        const locMatch = lines[i + 1].match(/\s*-->\s+([^:]+):(\d+)/);
        if (locMatch) {
          file = locMatch[1];
          lineNum = parseInt(locMatch[2], 10);
        }
      }

      warningDetails.push({ file, line: lineNum, message });
    }
  }

  return warningDetails;
}

/**
 * Parses compiler messages from JSON output.
 * Gap #89: Extracts build-finished event's success field.
 * Gap #90: Extracts suggestion text from children array.
 */
function parseCompilerMessages(stdout: string): {
  diagnostics: {
    file: string;
    line: number;
    column: number;
    severity: "error" | "warning" | "note" | "help";
    code?: string;
    message: string;
    suggestion?: string;
  }[];
  buildFinishedSuccess?: boolean;
} {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const diagnostics: {
    file: string;
    line: number;
    column: number;
    severity: "error" | "warning" | "note" | "help";
    code?: string;
    message: string;
    suggestion?: string;
  }[] = [];
  let buildFinishedSuccess: boolean | undefined;

  for (const line of lines) {
    let msg: CargoMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }

    // Gap #89: Capture build-finished event's success field
    if (msg.reason === "build-finished") {
      buildFinishedSuccess = msg.success;
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

    const diagnostic: {
      file: string;
      line: number;
      column: number;
      severity: "error" | "warning" | "note" | "help";
      code?: string;
      message: string;
      suggestion?: string;
    } = {
      file: span.file_name,
      line: span.line_start,
      column: span.column_start,
      severity,
      code: msg.message.code?.code || undefined,
      message: msg.message.message,
    };

    // Gap #90: Extract suggestion text from children array
    if (msg.message.children && msg.message.children.length > 0) {
      const helpChild = msg.message.children.find(
        (c) => c.level === "help" || c.level === "suggestion",
      );
      if (helpChild && helpChild.message) {
        diagnostic.suggestion = helpChild.message;
      }
    }

    diagnostics.push(diagnostic);
  }

  return { diagnostics, buildFinishedSuccess };
}
