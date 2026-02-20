import type {
  CMakeConfigureResult,
  CMakeBuildResult,
  CMakeTestResult,
  CMakePresetsResult,
  CMakeInstallResult,
  CMakeCleanResult,
} from "../schemas/index.js";

// ── Full formatters ────────────────────────────────────────────────

export function formatConfigure(data: CMakeConfigureResult): string {
  const lines: string[] = [];
  lines.push(data.success ? "cmake configure: success" : "cmake configure: failed");
  lines.push(`build dir: ${data.buildDir}`);
  if (data.generator) lines.push(`compiler: ${data.generator}`);
  if (data.warnings) {
    for (const w of data.warnings) {
      const loc = w.file ? ` (${w.file}${w.line != null ? `:${w.line}` : ""})` : "";
      lines.push(`warning${loc}: ${w.message}`);
    }
  }
  if (data.errors) {
    for (const e of data.errors) {
      const loc = e.file ? ` (${e.file}${e.line != null ? `:${e.line}` : ""})` : "";
      lines.push(`error${loc}: ${e.message}`);
    }
  }
  return lines.join("\n");
}

export function formatBuild(data: CMakeBuildResult): string {
  const lines: string[] = [];
  lines.push(
    data.success
      ? `cmake build: success (${data.summary.warningCount} warnings)`
      : `cmake build: failed (${data.summary.errorCount} errors, ${data.summary.warningCount} warnings)`,
  );
  if (data.warnings) {
    for (const w of data.warnings) {
      const loc = w.file ? `${w.file}:${w.line ?? "?"}:${w.column ?? "?"}` : "unknown";
      lines.push(`  warning: ${loc}: ${w.message}`);
    }
  }
  if (data.errors) {
    for (const e of data.errors) {
      const loc = e.file ? `${e.file}:${e.line ?? "?"}:${e.column ?? "?"}` : "unknown";
      lines.push(`  error: ${loc}: ${e.message}`);
    }
  }
  return lines.join("\n");
}

export function formatTest(data: CMakeTestResult): string {
  const lines: string[] = [];
  const s = data.summary;
  lines.push(
    data.success
      ? `ctest: ${s.passed}/${s.totalTests} passed`
      : `ctest: ${s.failed}/${s.totalTests} failed`,
  );
  for (const t of data.tests) {
    const dur = t.durationSec != null ? ` (${t.durationSec}s)` : "";
    lines.push(`  #${t.number} ${t.name}: ${t.status}${dur}`);
  }
  if (s.totalDurationSec != null) {
    lines.push(`total time: ${s.totalDurationSec}s`);
  }
  return lines.join("\n");
}

export function formatPresets(data: CMakePresetsResult): string {
  const lines: string[] = [];
  lines.push(data.success ? "cmake presets:" : "cmake presets: failed");
  if (data.configurePresets) {
    lines.push("  configure:");
    for (const p of data.configurePresets) {
      lines.push(`    "${p.name}"${p.displayName ? ` - ${p.displayName}` : ""}`);
    }
  }
  if (data.buildPresets) {
    lines.push("  build:");
    for (const p of data.buildPresets) {
      lines.push(`    "${p.name}"${p.displayName ? ` - ${p.displayName}` : ""}`);
    }
  }
  if (data.testPresets) {
    lines.push("  test:");
    for (const p of data.testPresets) {
      lines.push(`    "${p.name}"${p.displayName ? ` - ${p.displayName}` : ""}`);
    }
  }
  return lines.join("\n");
}

export function formatInstall(data: CMakeInstallResult): string {
  const lines: string[] = [];
  lines.push(data.success ? "cmake install: success" : "cmake install: failed");
  if (data.prefix) lines.push(`configuration: ${data.prefix}`);
  if (data.installedFiles) {
    for (const f of data.installedFiles) lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

export function formatClean(data: CMakeCleanResult): string {
  return data.success ? "cmake clean: success" : "cmake clean: failed";
}

// ── Compact types, mappers, and formatters ─────────────────────────

export interface CMakeConfigureCompact {
  [key: string]: unknown;
  success: boolean;
  buildDir: string;
  warningCount: number;
  errorCount: number;
}

export function compactConfigureMap(data: CMakeConfigureResult): CMakeConfigureCompact {
  return {
    success: data.success,
    buildDir: data.buildDir,
    warningCount: data.warnings?.length ?? 0,
    errorCount: data.errors?.length ?? 0,
  };
}

export function formatConfigureCompact(data: CMakeConfigureCompact): string {
  if (data.success) return `cmake configure: success (${data.buildDir})`;
  return `cmake configure: failed (${data.errorCount} errors, ${data.warningCount} warnings)`;
}

export interface CMakeBuildCompact {
  [key: string]: unknown;
  success: boolean;
  warningCount: number;
  errorCount: number;
}

export function compactBuildMap(data: CMakeBuildResult): CMakeBuildCompact {
  return {
    success: data.success,
    warningCount: data.summary.warningCount,
    errorCount: data.summary.errorCount,
  };
}

export function formatBuildCompact(data: CMakeBuildCompact): string {
  if (data.success) return `cmake build: success (${data.warningCount} warnings)`;
  return `cmake build: failed (${data.errorCount} errors, ${data.warningCount} warnings)`;
}

export interface CMakeTestCompact {
  [key: string]: unknown;
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
}

export function compactTestMap(data: CMakeTestResult): CMakeTestCompact {
  return {
    success: data.success,
    totalTests: data.summary.totalTests,
    passed: data.summary.passed,
    failed: data.summary.failed,
  };
}

export function formatTestCompact(data: CMakeTestCompact): string {
  if (data.success) return `ctest: ${data.passed}/${data.totalTests} passed`;
  return `ctest: ${data.failed}/${data.totalTests} failed`;
}

export interface CMakePresetsCompact {
  [key: string]: unknown;
  success: boolean;
  configureCount: number;
  buildCount: number;
  testCount: number;
}

export function compactPresetsMap(data: CMakePresetsResult): CMakePresetsCompact {
  return {
    success: data.success,
    configureCount: data.configurePresets?.length ?? 0,
    buildCount: data.buildPresets?.length ?? 0,
    testCount: data.testPresets?.length ?? 0,
  };
}

export function formatPresetsCompact(data: CMakePresetsCompact): string {
  if (!data.success) return "cmake presets: failed";
  return `cmake presets: ${data.configureCount} configure, ${data.buildCount} build, ${data.testCount} test`;
}

export interface CMakeInstallCompact {
  [key: string]: unknown;
  success: boolean;
  fileCount: number;
}

export function compactInstallMap(data: CMakeInstallResult): CMakeInstallCompact {
  return {
    success: data.success,
    fileCount: data.installedFiles?.length ?? 0,
  };
}

export function formatInstallCompact(data: CMakeInstallCompact): string {
  if (data.success) return `cmake install: success (${data.fileCount} files)`;
  return "cmake install: failed";
}

export interface CMakeCleanCompact {
  [key: string]: unknown;
  success: boolean;
}

export function compactCleanMap(data: CMakeCleanResult): CMakeCleanCompact {
  return { success: data.success };
}

export function formatCleanCompact(data: CMakeCleanCompact): string {
  return data.success ? "cmake clean: success" : "cmake clean: failed";
}
