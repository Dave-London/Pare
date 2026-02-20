import type {
  CMakeConfigureResult,
  CMakeBuildResult,
  CMakeTestResult,
  CMakePresetsResult,
  CMakeInstallResult,
  CMakeCleanResult,
} from "../schemas/index.js";

// ── cmake configure ────────────────────────────────────────────────

export function parseCMakeConfigureOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  buildDir: string,
): CMakeConfigureResult {
  const success = exitCode === 0;
  const text = stdout + "\n" + stderr;

  // Extract generator from compiler identification lines
  let generator: string | undefined;
  const cMatch = text.match(/-- The C compiler identification is (.+)/);
  const cxxMatch = text.match(/-- The CXX compiler identification is (.+)/);
  if (cxxMatch) generator = cxxMatch[1].trim();
  else if (cMatch) generator = cMatch[1].trim();

  // Parse CMake warnings
  const warnings: { message: string; file?: string; line?: number }[] = [];
  const warnWithLocRe = /CMake Warning at ([^:]+):(\d+)[^:]*:\s*\n([\s\S]*?)(?=\n(?:--|CMake|$))/g;
  let match: RegExpExecArray | null;
  while ((match = warnWithLocRe.exec(text)) !== null) {
    warnings.push({
      message: match[3].trim(),
      file: match[1].trim(),
      line: parseInt(match[2], 10),
    });
  }
  // Warnings without location
  const warnNoLocRe = /CMake Warning:\s*\n?([\s\S]*?)(?=\n(?:--|CMake|$))/g;
  while ((match = warnNoLocRe.exec(text)) !== null) {
    const msg = match[1].trim();
    // Avoid duplicates from location-based matches
    if (msg && !warnings.some((w) => w.message === msg)) {
      warnings.push({ message: msg });
    }
  }

  // Parse CMake errors
  const errors: { message: string; file?: string; line?: number }[] = [];
  const errWithLocRe = /CMake Error at ([^:]+):(\d+)[^:]*:\s*\n?([\s\S]*?)(?=\n(?:--|CMake|$))/g;
  while ((match = errWithLocRe.exec(text)) !== null) {
    errors.push({
      message: match[3].trim(),
      file: match[1].trim(),
      line: parseInt(match[2], 10),
    });
  }
  // Errors without location
  const errNoLocRe = /CMake Error:\s*\n?([\s\S]*?)(?=\n(?:--|CMake|$))/g;
  while ((match = errNoLocRe.exec(text)) !== null) {
    const msg = match[1].trim();
    if (msg && !errors.some((e) => e.message === msg)) {
      errors.push({ message: msg });
    }
  }

  return {
    action: "configure",
    success,
    generator,
    buildDir,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
    exitCode,
  };
}

// ── cmake build ────────────────────────────────────────────────────

export function parseCMakeBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CMakeBuildResult {
  const success = exitCode === 0;
  const text = stdout + "\n" + stderr;

  const warnings: { message: string; file?: string; line?: number; column?: number }[] = [];
  const errors: { message: string; file?: string; line?: number; column?: number }[] = [];

  // GCC/Clang: file:line:col: warning: message
  const gccWarnRe = /([^:\s]+):(\d+):(\d+):\s*warning:\s*(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = gccWarnRe.exec(text)) !== null) {
    warnings.push({
      message: match[4].trim(),
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
    });
  }

  // GCC/Clang: file:line:col: error: message
  const gccErrRe = /([^:\s]+):(\d+):(\d+):\s*error:\s*(.+)/g;
  while ((match = gccErrRe.exec(text)) !== null) {
    errors.push({
      message: match[4].trim(),
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
    });
  }

  // MSVC: file(line): warning C1234: message
  const msvcWarnRe = /([^(\s]+)\((\d+)\):\s*warning\s+\w+:\s*(.+)/g;
  while ((match = msvcWarnRe.exec(text)) !== null) {
    warnings.push({
      message: match[3].trim(),
      file: match[1],
      line: parseInt(match[2], 10),
    });
  }

  // MSVC: file(line): error C1234: message
  const msvcErrRe = /([^(\s]+)\((\d+)\):\s*error\s+\w+:\s*(.+)/g;
  while ((match = msvcErrRe.exec(text)) !== null) {
    errors.push({
      message: match[3].trim(),
      file: match[1],
      line: parseInt(match[2], 10),
    });
  }

  return {
    action: "build",
    success,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
    summary: {
      warningCount: warnings.length,
      errorCount: errors.length,
    },
    exitCode,
  };
}

// ── ctest ──────────────────────────────────────────────────────────

export function parseCTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CMakeTestResult {
  const success = exitCode === 0;
  const text = stdout + "\n" + stderr;

  const tests: {
    name: string;
    number: number;
    status: "passed" | "failed" | "timeout" | "skipped" | "not_run" | "disabled";
    durationSec?: number;
    output?: string;
  }[] = [];

  // Parse individual test results
  // Pattern: 1/3 Test #1: test_basic ...................   Passed    0.01 sec
  // or:      2/3 Test #2: test_advanced ................***Failed    0.05 sec
  const testRe =
    /\d+\/\d+\s+Test\s+#(\d+):\s+(\S+)\s+\.+\s*(\*{0,3}(?:Passed|Failed|Timeout|Not Run|Disabled))\s+([\d.]+)\s+sec/g;
  let match: RegExpExecArray | null;
  while ((match = testRe.exec(text)) !== null) {
    // Strip leading *** prefix (e.g., "***Failed" -> "Failed")
    const rawStatus = match[3].replace(/^\*+/, "");
    let status: "passed" | "failed" | "timeout" | "skipped" | "not_run" | "disabled";
    switch (rawStatus) {
      case "Passed":
        status = "passed";
        break;
      case "Failed":
        status = "failed";
        break;
      case "Timeout":
        status = "timeout";
        break;
      case "Not Run":
        status = "not_run";
        break;
      case "Disabled":
        status = "disabled";
        break;
      default:
        status = "failed";
    }

    tests.push({
      name: match[2],
      number: parseInt(match[1], 10),
      status,
      durationSec: parseFloat(match[4]),
    });
  }

  // Parse summary
  let passed = 0;
  let failed = 0;
  let totalTests = tests.length;
  const skipped = tests.filter((t) => t.status === "skipped" || t.status === "not_run").length;
  const timeout = tests.filter((t) => t.status === "timeout").length;

  const summaryMatch = text.match(
    /(\d+)%\s+tests\s+passed,\s+(\d+)\s+tests?\s+failed\s+out\s+of\s+(\d+)/,
  );
  if (summaryMatch) {
    failed = parseInt(summaryMatch[2], 10);
    totalTests = parseInt(summaryMatch[3], 10);
    passed = totalTests - failed;
  } else {
    passed = tests.filter((t) => t.status === "passed").length;
    failed = tests.filter((t) => t.status === "failed" || t.status === "timeout").length;
  }

  // Parse total duration
  let totalDurationSec: number | undefined;
  const durationMatch = text.match(/Total Test time \(real\)\s*=\s*([\d.]+)\s+sec/);
  if (durationMatch) {
    totalDurationSec = parseFloat(durationMatch[1]);
  }

  return {
    action: "test",
    success,
    tests,
    summary: {
      totalTests,
      passed,
      failed,
      skipped,
      timeout,
      totalDurationSec,
    },
    exitCode,
  };
}

// ── cmake list-presets ─────────────────────────────────────────────

export function parseCMakePresetsOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CMakePresetsResult {
  const success = exitCode === 0;
  const text = stdout + "\n" + stderr;

  const configurePresets: { name: string; displayName?: string }[] = [];
  const buildPresets: { name: string; displayName?: string }[] = [];
  const testPresets: { name: string; displayName?: string }[] = [];

  // Determine which section we're in
  let currentTarget: { name: string; displayName?: string }[] | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    if (/^Available configure presets?:/i.test(trimmed)) {
      currentTarget = configurePresets;
      continue;
    }
    if (/^Available build presets?:/i.test(trimmed)) {
      currentTarget = buildPresets;
      continue;
    }
    if (/^Available test presets?:/i.test(trimmed)) {
      currentTarget = testPresets;
      continue;
    }

    // Parse preset entry: "name" - Display Name  or  "name"
    const presetMatch = trimmed.match(/^"([^"]+)"(?:\s+-\s+(.+))?$/);
    if (presetMatch && currentTarget) {
      currentTarget.push({
        name: presetMatch[1],
        displayName: presetMatch[2]?.trim() || undefined,
      });
    }
  }

  return {
    action: "list-presets",
    success,
    configurePresets: configurePresets.length > 0 ? configurePresets : undefined,
    buildPresets: buildPresets.length > 0 ? buildPresets : undefined,
    testPresets: testPresets.length > 0 ? testPresets : undefined,
    exitCode,
  };
}

// ── cmake install ──────────────────────────────────────────────────

export function parseCMakeInstallOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CMakeInstallResult {
  const success = exitCode === 0;
  const text = stdout + "\n" + stderr;

  // Parse prefix from "-- Install configuration: ..."
  let prefix: string | undefined;
  const prefixMatch = text.match(/-- Install configuration:\s*"([^"]+)"/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
  }

  // Parse installed files: "-- Installing: /path/to/file"
  const installedFiles: string[] = [];
  const installRe = /-- Installing:\s*(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = installRe.exec(text)) !== null) {
    installedFiles.push(match[1].trim());
  }

  return {
    action: "install",
    success,
    prefix,
    installedFiles: installedFiles.length > 0 ? installedFiles : undefined,
    exitCode,
  };
}

// ── cmake clean ────────────────────────────────────────────────────

export function parseCMakeCleanOutput(
  _stdout: string,
  _stderr: string,
  exitCode: number,
): CMakeCleanResult {
  return {
    action: "clean",
    success: exitCode === 0,
    exitCode,
  };
}
