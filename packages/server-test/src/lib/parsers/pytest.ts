import type { TestRun, Coverage } from "../../schemas/index.js";

/**
 * Parses pytest verbose output (-v) into structured data.
 *
 * Expected formats:
 *   tests/test_foo.py::test_bar PASSED
 *   tests/test_foo.py::test_baz FAILED
 *   ===== short test summary info =====
 *   FAILED tests/test_foo.py::test_baz - AssertionError: assert 1 == 2
 *   ===== 1 failed, 9 passed in 0.42s =====
 */
export function parsePytestOutput(stdout: string): TestRun {
  const lines = stdout.split("\n");

  // Parse summary line: "1 failed, 9 passed, 2 skipped in 0.42s"
  const summaryMatch = stdout.match(
    /=+ (?:(\d+) failed)?[, ]*(?:(\d+) passed)?[, ]*(?:(\d+) skipped)?[, ]*(?:(\d+) error)?[, ]*in ([\d.]+)s/,
  );

  const failed = summaryMatch ? parseInt(summaryMatch[1] || "0", 10) : 0;
  const passed = summaryMatch ? parseInt(summaryMatch[2] || "0", 10) : 0;
  const skipped = summaryMatch ? parseInt(summaryMatch[3] || "0", 10) : 0;
  const duration = summaryMatch ? parseFloat(summaryMatch[5] || "0") : 0;

  // Parse failures from short test summary
  const failures: TestRun["failures"] = [];
  const summaryStart = lines.findIndex((l) => l.includes("short test summary info"));
  const summaryEnd = lines.findIndex(
    (l, i) => i > summaryStart && summaryStart >= 0 && l.match(/^=+ /),
  );

  if (summaryStart >= 0) {
    const failLines = lines.slice(
      summaryStart + 1,
      summaryEnd > summaryStart ? summaryEnd : undefined,
    );
    for (const line of failLines) {
      const match = line.match(/^FAILED\s+(.+?)(?:::(.+?))?\s*-\s*(.+)/);
      if (match) {
        failures.push({
          file: match[1],
          name: match[2] || match[1],
          message: match[3].trim(),
        });
      }
    }
  }

  // If no summary section, try to parse FAILED lines from verbose output
  if (failures.length === 0 && failed > 0) {
    for (const line of lines) {
      const match = line.match(/^(.+?)::(.+?)\s+FAILED/);
      if (match) {
        failures.push({
          file: match[1],
          name: match[2],
          message: "Test failed (details not captured in verbose output)",
        });
      }
    }
  }

  return {
    framework: "pytest",
    summary: {
      total: passed + failed + skipped,
      passed,
      failed,
      skipped,
      duration,
    },
    failures,
  };
}

/**
 * Parses pytest coverage output (from pytest-cov).
 *
 * Expected format:
 *   ---------- coverage: ... ----------
 *   Name                  Stmts   Miss  Cover
 *   -------------------------------------------
 *   src/foo.py               50      5    90%
 *   src/bar.py               30     10    67%
 *   -------------------------------------------
 *   TOTAL                    80     15    81%
 */
export function parsePytestCoverage(stdout: string): Coverage {
  const lines = stdout.split("\n");
  const files: Coverage["files"] = [];
  let totalPct = 0;

  let inCoverage = false;
  for (const line of lines) {
    if (line.includes("Stmts") && line.includes("Miss") && line.includes("Cover")) {
      inCoverage = true;
      continue;
    }
    if (!inCoverage) continue;
    if (line.match(/^-+$/)) continue;

    const match = line.match(/^(\S+)\s+(\d+)\s+(\d+)\s+(\d+)%/);
    if (match) {
      const [, file, , , cover] = match;
      const pct = parseInt(cover, 10);

      if (file === "TOTAL") {
        totalPct = pct;
      } else {
        files.push({ file, lines: pct });
      }
    }
  }

  return {
    framework: "pytest",
    summary: { lines: totalPct },
    files,
  };
}
