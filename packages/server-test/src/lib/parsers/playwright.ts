import type {
  PlaywrightResult,
  PlaywrightSuite,
  PlaywrightTestResult,
} from "../../schemas/index.js";

/**
 * Playwright JSON reporter output structure (from `--reporter=json`).
 * See: https://playwright.dev/docs/test-reporters#json-reporter
 */
interface PlaywrightJsonOutput {
  config: { rootDir?: string };
  suites: PlaywrightJsonSuite[];
  errors?: Array<{ message?: string }>;
  stats?: {
    startTime?: string;
    duration?: number;
    expected?: number;
    unexpected?: number;
    flaky?: number;
    skipped?: number;
    interrupted?: number;
  };
}

interface PlaywrightJsonSuite {
  title: string;
  file?: string;
  line?: number;
  suites?: PlaywrightJsonSuite[];
  specs?: PlaywrightJsonSpec[];
}

interface PlaywrightJsonSpec {
  title: string;
  file?: string;
  line?: number;
  tests: Array<{
    projectName?: string;
    results: Array<{
      status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
      duration: number;
      retry: number;
      error?: { message?: string; stack?: string };
      errors?: Array<{ message?: string; stack?: string }>;
    }>;
  }>;
}

/**
 * Parses Playwright JSON reporter output into structured data.
 */
export function parsePlaywrightJson(jsonStr: string): PlaywrightResult {
  const data = JSON.parse(jsonStr) as PlaywrightJsonOutput;

  const suites: PlaywrightSuite[] = [];
  const failures: PlaywrightResult["failures"] = [];
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let timedOut = 0;
  let interrupted = 0;
  let totalDuration = 0;

  function processSuite(suite: PlaywrightJsonSuite, parentFile?: string): PlaywrightSuite {
    const suiteFile = suite.file || parentFile;
    const tests: PlaywrightTestResult[] = [];

    // Process specs in this suite
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        // Use the last result (final retry)
        const lastResult = test.results[test.results.length - 1];
        if (!lastResult) continue;

        total++;
        const status = lastResult.status;
        const duration = lastResult.duration;
        totalDuration += duration;

        switch (status) {
          case "passed":
            passed++;
            break;
          case "failed":
            failed++;
            break;
          case "skipped":
            skipped++;
            break;
          case "timedOut":
            timedOut++;
            break;
          case "interrupted":
            interrupted++;
            break;
        }

        // Extract error message
        let errorMsg: string | undefined;
        if (lastResult.error?.message) {
          errorMsg = lastResult.error.message;
        } else if (lastResult.errors && lastResult.errors.length > 0) {
          errorMsg = lastResult.errors
            .map((e) => e.message)
            .filter(Boolean)
            .join("\n");
        }

        const testResult: PlaywrightTestResult = {
          title: spec.title,
          file: spec.file || suiteFile,
          line: spec.line,
          projectName: test.projectName,
          status,
          duration,
          ...(errorMsg ? { error: errorMsg } : {}),
          ...(lastResult.retry > 0 ? { retry: lastResult.retry } : {}),
        };

        tests.push(testResult);

        // Track failures
        if (status === "failed" || status === "timedOut") {
          failures.push({
            title: spec.title,
            file: spec.file || suiteFile,
            line: spec.line,
            ...(errorMsg ? { error: errorMsg } : {}),
          });
        }
      }
    }

    // Process nested suites
    for (const child of suite.suites ?? []) {
      const childSuite = processSuite(child, suiteFile);
      // Flatten nested suite tests into the parent
      tests.push(...childSuite.tests);
    }

    return {
      title: suite.title,
      file: suiteFile,
      tests,
    };
  }

  for (const suite of data.suites) {
    suites.push(processSuite(suite));
  }

  // If stats are provided by Playwright, use the duration from there
  const durationMs = data.stats?.duration ?? totalDuration;
  const durationSec = Math.round((durationMs / 1000) * 100) / 100;

  // Extract flaky count from stats (Playwright tracks tests that failed then passed on retry)
  const flaky = data.stats?.flaky ?? 0;

  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      timedOut,
      interrupted,
      flaky,
      duration: durationSec,
    },
    suites,
    failures,
  };
}
