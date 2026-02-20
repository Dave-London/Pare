import type {
  BunRunResult,
  BunTestResult,
  BunBuildResult,
  BunInstallResult,
  BunAddResult,
  BunRemoveResult,
  BunOutdatedResult,
  BunPmLsResult,
} from "../schemas/index.js";

// ── Run ─────────────────────────────────────────────────────────────

/** Parses the output of `bun run` into structured result data. */
export function parseRunOutput(
  script: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): BunRunResult {
  const success = exitCode === 0 && !timedOut;
  return {
    script,
    success,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── Test ────────────────────────────────────────────────────────────

/**
 * Parses `bun test` output into structured test results.
 *
 * Expected output patterns:
 * ```
 * bun test v1.x.x
 *
 * src/index.test.ts:
 * ✓ should do something [0.12ms]
 * ✗ should fail [0.05ms]
 *   error: Expected 1 to be 2
 *
 *  5 pass
 *  1 fail
 *  1 skip
 *  7 expect() calls
 * Ran 7 tests across 2 files. [52.00ms]
 * ```
 */
export function parseTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunTestResult {
  const combined = `${stdout}\n${stderr}`;
  const success = exitCode === 0;

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Parse summary line: " N pass"
  const passMatch = combined.match(/(\d+)\s+pass/);
  if (passMatch) passed = parseInt(passMatch[1], 10);

  // Parse summary line: " N fail"
  const failMatch = combined.match(/(\d+)\s+fail/);
  if (failMatch) failed = parseInt(failMatch[1], 10);

  // Parse summary line: " N skip"
  const skipMatch = combined.match(/(\d+)\s+skip/);
  if (skipMatch) skipped = parseInt(skipMatch[1], 10);

  const total = passed + failed + skipped;

  // Parse individual test results
  const tests: { name: string; passed: boolean; duration?: number; error?: string }[] = [];
  const lines = combined.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match passing test: "✓ test name [0.12ms]" or "(pass) test name [0.12ms]"
    const passTestMatch = line.match(
      /^[\s]*(?:✓|✔|\(pass\))\s+(.+?)(?:\s+\[(\d+(?:\.\d+)?)\s*ms\])?\s*$/,
    );
    if (passTestMatch) {
      tests.push({
        name: passTestMatch[1].trim(),
        passed: true,
        duration: passTestMatch[2] ? parseFloat(passTestMatch[2]) : undefined,
      });
      continue;
    }

    // Match failing test: "✗ test name [0.05ms]" or "(fail) test name [0.05ms]"
    const failTestMatch = line.match(
      /^[\s]*(?:✗|✘|\(fail\))\s+(.+?)(?:\s+\[(\d+(?:\.\d+)?)\s*ms\])?\s*$/,
    );
    if (failTestMatch) {
      // Look ahead for error message
      let error: string | undefined;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.match(/^\s+/)) {
          error = nextLine.trim();
        }
      }
      tests.push({
        name: failTestMatch[1].trim(),
        passed: false,
        duration: failTestMatch[2] ? parseFloat(failTestMatch[2]) : undefined,
        error,
      });
      continue;
    }
  }

  return {
    success,
    passed,
    failed,
    skipped,
    total,
    duration,
    tests: tests.length > 0 ? tests : undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

// ── Build ───────────────────────────────────────────────────────────

/**
 * Parses `bun build` output into structured build result data.
 *
 * Expected output patterns:
 * ```
 *   ./out/index.js  1.50 KB
 *
 * [8ms] bundle 1 modules
 * ```
 */
export function parseBuildOutput(
  entrypoints: string[],
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunBuildResult {
  const success = exitCode === 0;
  const combined = `${stdout}\n${stderr}`;

  // Parse artifact lines: "  ./out/index.js  1.50 KB"
  const artifacts: { path: string; size?: string }[] = [];
  const artifactRe = /^\s+(\S+)\s+(\d+(?:\.\d+)?\s*(?:B|KB|MB|GB))\s*$/;
  for (const line of combined.split("\n")) {
    const match = line.match(artifactRe);
    if (match) {
      artifacts.push({ path: match[1], size: match[2] });
    }
  }

  return {
    success,
    entrypoints,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    duration,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

// ── Install ─────────────────────────────────────────────────────────

/**
 * Parses `bun install` output into structured install result data.
 *
 * Expected output patterns:
 * ```
 * bun install v1.x.x
 *
 *  + @types/node@20.11.0
 *  + typescript@5.3.3
 *
 *  128 packages installed [1.23s]
 * ```
 */
export function parseInstallOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunInstallResult {
  const success = exitCode === 0;
  const combined = `${stdout}\n${stderr}`;

  let installedCount = 0;
  const countMatch = combined.match(/(\d+)\s+packages?\s+installed/);
  if (countMatch) {
    installedCount = parseInt(countMatch[1], 10);
  }

  return {
    success,
    installedCount,
    duration,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

// ── Add ─────────────────────────────────────────────────────────────

/** Parses `bun add` output into structured result data. */
export function parseAddOutput(
  packages: string[],
  dev: boolean,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunAddResult {
  const success = exitCode === 0;
  return {
    success,
    packages,
    dev,
    duration,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

// ── Remove ──────────────────────────────────────────────────────────

/** Parses `bun remove` output into structured result data. */
export function parseRemoveOutput(
  packages: string[],
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunRemoveResult {
  const success = exitCode === 0;
  return {
    success,
    packages,
    duration,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

// ── Outdated ────────────────────────────────────────────────────────

/**
 * Parses `bun outdated` output into structured result data.
 *
 * Expected output patterns (table format):
 * ```
 * ┌──────────────┬─────────┬────────┬────────┐
 * │ Package      │ Current │ Update │ Latest │
 * ├──────────────┼─────────┼────────┼────────┤
 * │ typescript   │ 5.3.3   │ 5.4.0  │ 5.4.0  │
 * │ vitest       │ 1.2.0   │ 1.3.0  │ 1.3.0  │
 * └──────────────┴─────────┴────────┴────────┘
 * ```
 */
export function parseOutdatedOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunOutdatedResult {
  // bun outdated exits 0 even when there are outdated packages
  const success = exitCode === 0;
  const combined = `${stdout}\n${stderr}`;

  const packages: { name: string; current: string; latest: string; wanted?: string }[] = [];

  // Parse table rows: "│ name │ current │ update │ latest │"
  const rowRe = /│\s*(\S+)\s*│\s*(\S+)\s*│\s*(\S+)\s*│\s*(\S+)\s*│/;
  for (const line of combined.split("\n")) {
    const match = line.match(rowRe);
    if (match) {
      const name = match[1];
      // Skip header row
      if (name === "Package" || name === "package") continue;
      packages.push({
        name,
        current: match[2],
        wanted: match[3] !== match[4] ? match[3] : undefined,
        latest: match[4],
      });
    }
  }

  return {
    success,
    packages,
    total: packages.length,
    duration,
  };
}

// ── Pm Ls ───────────────────────────────────────────────────────────

/**
 * Parses `bun pm ls` output into structured result data.
 *
 * Expected output patterns:
 * ```
 * /path/to/project node_modules (123)
 * ├── typescript@5.3.3
 * ├── vitest@1.2.0
 * └── zod@3.22.4
 * ```
 */
export function parsePmLsOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BunPmLsResult {
  const success = exitCode === 0;

  const packages: { name: string; version?: string }[] = [];

  // Parse tree lines: "├── name@version" or "└── name@version"
  const pkgRe = /[├└│]──\s+(.+?)@(\S+)/;
  for (const line of stdout.split("\n")) {
    const match = line.match(pkgRe);
    if (match) {
      packages.push({
        name: match[1],
        version: match[2],
      });
    }
  }

  return {
    success,
    packages,
    total: packages.length,
    duration,
  };
}
