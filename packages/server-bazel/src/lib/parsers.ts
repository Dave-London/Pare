import type {
  BazelBuildResult,
  BazelTestResult,
  BazelQueryResult,
  BazelInfoResult,
  BazelRunResult,
  BazelCleanResult,
  BazelFetchResult,
} from "../schemas/index.js";

// ── Build ────────────────────────────────────────────────────────────

export function parseBazelBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): BazelBuildResult {
  const combined = stderr + "\n" + stdout;
  const success = exitCode === 0;

  // Parse target count from "INFO: Analyzed N targets"
  const analyzedMatch = combined.match(/INFO: Analyzed (\d+) targets?/);
  const totalTargets = analyzedMatch ? parseInt(analyzedMatch[1], 10) : 0;

  // Parse errors with file/line info: ERROR: /path/BUILD:line:col: ...
  const errors: BazelBuildResult["errors"] = [];
  const errorLines = combined.split("\n").filter((l) => l.startsWith("ERROR:"));
  for (const line of errorLines) {
    const fileMatch = line.match(/^ERROR: ([^:]+):(\d+):(\d+): (.+)/);
    if (fileMatch) {
      errors.push({
        file: fileMatch[1],
        line: parseInt(fileMatch[2], 10),
        message: fileMatch[4],
      });
    } else {
      const msgMatch = line.match(/^ERROR: (.+)/);
      if (msgMatch) {
        // Try to extract a target label from error messages like "Target //src:app failed to build"
        const targetMatch = msgMatch[1].match(/Target (\/\/\S+) failed/);
        errors.push({
          target: targetMatch ? targetMatch[1] : undefined,
          message: msgMatch[1],
        });
      }
    }
  }

  // Parse duration from "Elapsed time: X.XXXs"
  const durationMatch = combined.match(/Elapsed time: ([\d.]+)s/);
  const durationMs = durationMatch ? Math.round(parseFloat(durationMatch[1]) * 1000) : undefined;

  // Count failed targets from errors
  const failedTargets = errors.filter((e) => e.target).length;
  const successTargets = success ? totalTargets : totalTargets - Math.max(failedTargets, 0);

  // Build target list
  const targets: BazelBuildResult["targets"] = [];
  // Extract target labels that failed
  const failedLabels = new Set(errors.filter((e) => e.target).map((e) => e.target!));

  // If we know total targets, generate success entries for the non-failed ones
  if (totalTargets > 0) {
    for (const label of failedLabels) {
      targets.push({ label, status: "failed" });
    }
    // We don't have individual success target labels from the output,
    // but we can still report the summary accurately
  }

  return {
    action: "build",
    success,
    targets,
    summary: {
      totalTargets,
      successTargets: Math.max(0, successTargets),
      failedTargets: failedLabels.size,
    },
    errors: errors.length > 0 ? errors : undefined,
    durationMs,
    exitCode,
  };
}

// ── Test ─────────────────────────────────────────────────────────────

export function parseBazelTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): BazelTestResult {
  const combined = stderr + "\n" + stdout;
  const success = exitCode === 0;

  // Parse individual test results
  // Pattern: //label  STATUS in X.Xs
  const testPattern = /^(\/\/\S+)\s+(PASSED|FAILED|FLAKY|TIMEOUT|NO STATUS)\s+in\s+([\d.]+)s/gm;
  const tests: BazelTestResult["tests"] = [];
  let match;

  while ((match = testPattern.exec(combined)) !== null) {
    const statusMap: Record<string, BazelTestResult["tests"][number]["status"]> = {
      PASSED: "passed",
      FAILED: "failed",
      FLAKY: "flaky",
      TIMEOUT: "timeout",
      "NO STATUS": "no_status",
    };
    tests.push({
      label: match[1],
      status: statusMap[match[2]] || "no_status",
      durationMs: Math.round(parseFloat(match[3]) * 1000),
    });
  }

  // Parse summary counts
  let passed = 0;
  let failed = 0;
  let timeout = 0;
  let flaky = 0;
  let skipped = 0;

  for (const t of tests) {
    switch (t.status) {
      case "passed":
        passed++;
        break;
      case "failed":
        failed++;
        break;
      case "timeout":
        timeout++;
        break;
      case "flaky":
        flaky++;
        break;
      case "skipped":
        skipped++;
        break;
    }
  }

  // Parse duration from "Elapsed time: X.XXXs"
  const durationMatch = combined.match(/Elapsed time: ([\d.]+)s/);
  const durationMs = durationMatch ? Math.round(parseFloat(durationMatch[1]) * 1000) : undefined;

  return {
    action: "test",
    success,
    tests,
    summary: {
      totalTests: tests.length,
      passed,
      failed,
      timeout,
      flaky,
      skipped,
    },
    durationMs,
    exitCode,
  };
}

// ── Query ────────────────────────────────────────────────────────────

export function parseBazelQueryOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
): BazelQueryResult {
  const success = exitCode === 0;
  const results = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    action: "query",
    success,
    results,
    count: results.length,
    exitCode,
  };
}

// ── Info ─────────────────────────────────────────────────────────────

export function parseBazelInfoOutput(
  stdout: string,
  _stderr: string,
  exitCode: number,
  infoKey?: string,
): BazelInfoResult {
  const success = exitCode === 0;
  const info: Record<string, string> = {};

  if (infoKey) {
    // Single key mode: stdout is just the value
    info[infoKey] = stdout.trim();
  } else {
    // Multi-key mode: parse "key: value" lines
    for (const line of stdout.split("\n")) {
      const colonIdx = line.indexOf(": ");
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 2).trim();
        if (key) info[key] = value;
      }
    }
  }

  return {
    action: "info",
    success,
    info,
    exitCode,
  };
}

// ── Run ──────────────────────────────────────────────────────────────

export function parseBazelRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  target: string,
): BazelRunResult {
  const success = exitCode === 0;

  return {
    action: "run",
    success,
    target,
    stdout: stdout.trim(),
    stderr: stderr.trim() || undefined,
    exitCode,
  };
}

// ── Clean ────────────────────────────────────────────────────────────

export function parseBazelCleanOutput(
  _stdout: string,
  _stderr: string,
  exitCode: number,
  expunged: boolean,
): BazelCleanResult {
  return {
    action: "clean",
    success: exitCode === 0,
    expunged,
    exitCode,
  };
}

// ── Fetch ────────────────────────────────────────────────────────────

export function parseBazelFetchOutput(
  _stdout: string,
  _stderr: string,
  exitCode: number,
): BazelFetchResult {
  return {
    action: "fetch",
    success: exitCode === 0,
    exitCode,
  };
}
