import type { TestRun, Coverage } from "../../schemas/index.js";

/** One "N label" token of pytest's final summary line ("3 passed", "1 xfailed",
 *  "2 subtests passed"), or the literal "no tests ran". */
const PYTEST_COUNT_TOKEN = String.raw`(?:\d+ [a-z]+(?: [a-z]+)?|no tests ran)`;

/** The body of pytest's final summary line, e.g. "1 failed, 9 passed in 0.42s".
 *  Deliberately anchored and strict: the ENTIRE body must be comma-separated
 *  count tokens followed by a duration, so free text containing a number next to
 *  a status word (e.g. the skip reason `port 5555 failed: Connection refused`)
 *  can never be read as a count. See issues #1061 / #1045. */
const PYTEST_SUMMARY_BODY_RE = new RegExp(
  String.raw`^${PYTEST_COUNT_TOKEN}(?:,\s*${PYTEST_COUNT_TOKEN})*\s+in\s+[\d.]+s(?:\s*\([^)]*\))?$`,
);

/** Strips pytest's "=" rule padding: "==== 3 passed in 1s ====" -> "3 passed in 1s".
 *  Returns null for a line that is not a rule. Done with index scans rather than
 *  a regex like /^=+\s*(.*?)\s*=+$/, which is cubic on long runs of "=" (#1182). */
function stripPytestRule(line: string): string | null {
  if (!line.startsWith("=") || !line.endsWith("=")) return null;
  let start = 0;
  let end = line.length;
  while (start < end && line[start] === "=") start++;
  while (end > start && line[end - 1] === "=") end--;
  return line.slice(start, end).trim();
}

/** Finds pytest's own final summary line (also emitted undecorated under `-q`).
 *  The LAST match wins; null means pytest never printed one, so counts stay zero
 *  instead of being guessed from unrelated output. */
function findPytestSummaryLine(lines: string[]): string | null {
  let summary: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const body = stripPytestRule(line) ?? line;
    if (PYTEST_SUMMARY_BODY_RE.test(body)) summary = body;
  }
  return summary;
}

/** First `E   ...` line of the ERRORS-section block whose header names `target`
 *  ("____ ERROR collecting tests/test_x.py ____"), for collection errors, whose
 *  short-summary line carries no message. */
function findErrorBlockMessage(lines: string[], target: string): string | undefined {
  const header = lines.findIndex(
    (l) => l.startsWith("_") && l.includes(" ERROR ") && l.includes(target),
  );
  if (header < 0) return undefined;
  for (let i = header + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("_") || l.startsWith("=")) break;
    const m = l.match(/^E\s+(.+)/);
    if (m) return m[1].trim();
  }
  return undefined;
}

function countFrom(summary: string | null, label: RegExp): number {
  if (!summary) return 0;
  const m = summary.match(label);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Parses pytest verbose output (-v) into structured data.
 *
 * Expected formats:
 *   tests/test_foo.py::test_bar PASSED
 *   tests/test_foo.py::test_baz FAILED
 *   ===== short test summary info =====
 *   FAILED tests/test_foo.py::test_baz - AssertionError: assert 1 == 2
 *   ERROR tests/test_foo.py::test_qux - RuntimeError: fixture broke
 *   ===== 1 failed, 9 passed, 1 error in 0.42s =====
 *
 * pytest reports a test whose setup or teardown raised (or a module that fails
 * to collect) as an ERROR, not a FAILED. Errors are counted in `failed` and
 * listed in `failures`, so a run with errors never reads as `failed: 0`;
 * `summary.errors` says how many of them were errors (#1178).
 */
export function parsePytestOutput(stdout: string): TestRun {
  const lines = stdout.split("\n").map((l) => l.replace(/\r$/, ""));

  // Counts come ONLY from pytest's final summary line
  // ("1 failed, 9 passed, 2 skipped in 0.42s"), never from arbitrary output.
  const summaryLine = findPytestSummaryLine(lines);

  const errors = countFrom(summaryLine, /(\d+) errors?\b/);
  const failed = countFrom(summaryLine, /(\d+) failed\b/) + errors;
  const passed = countFrom(summaryLine, /(\d+) passed\b/);
  const skipped = countFrom(summaryLine, /(\d+) skipped\b/);
  const durationMatch = summaryLine?.match(/in ([\d.]+)s/);
  const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

  // Parse failures from short test summary
  const failures: TestRun["failures"] = [];
  const tests: NonNullable<TestRun["tests"]> = [];

  const testIndex = new Map<string, number>();
  for (const line of lines) {
    const m = line.match(/^(.+?)::(.+?)\s+(PASSED|FAILED|ERROR|SKIPPED|XFAIL|XPASS)\b/);
    if (!m) continue;
    const [, file, name, statusRaw] = m;
    const status =
      statusRaw === "FAILED" || statusRaw === "ERROR"
        ? "failed"
        : statusRaw === "PASSED"
          ? "passed"
          : "skipped";
    // A test whose teardown raises prints PASSED and then ERROR: keep one entry.
    const key = `${file}::${name}`;
    const seen = testIndex.get(key);
    if (seen !== undefined) {
      if (status === "failed") tests[seen].status = "failed";
      continue;
    }
    testIndex.set(key, tests.length);
    tests.push({ file, name, status });
  }

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
        continue;
      }
      // "ERROR path::name - message", or a bare "ERROR path" for a module
      // that failed to collect.
      const err = line.match(/^ERROR\s+(.+?)(?:::(.+?))?(?:\s+-\s+(.+))?\s*$/);
      if (err) {
        const [, file, name, message] = err;
        failures.push({
          file,
          name: name || file,
          message: `ERROR: ${message?.trim() || findErrorBlockMessage(lines, file) || "collection error"}`,
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
      ...(errors > 0 ? { errors } : {}),
    },
    failures,
    ...(tests.length > 0 ? { tests } : {}),
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
        files.push({ file, statements: pct, lines: pct });
      }
    }
  }

  return {
    framework: "pytest",
    summary: { statements: totalPct, lines: totalPct },
    files,
  };
}

/**
 * Parses coverage.py JSON output (`pytest --cov-report=json:<file>`) into structured data.
 */
export function parsePytestCoverageJson(jsonStr: string): Coverage {
  const data = JSON.parse(jsonStr) as {
    files?: Record<
      string,
      {
        summary?: { percent_covered?: number };
        missing_lines?: number[];
      }
    >;
    totals?: { percent_covered?: number };
  };

  const files: Coverage["files"] = [];
  for (const [file, info] of Object.entries(data.files ?? {})) {
    const pct = info.summary?.percent_covered ?? 0;
    files.push({
      file,
      statements: pct,
      lines: pct,
      uncoveredLines: info.missing_lines ?? undefined,
    });
  }

  const totalPct = data.totals?.percent_covered ?? 0;
  return {
    framework: "pytest",
    summary: { statements: totalPct, lines: totalPct },
    files,
    totalFiles: files.length,
  };
}
