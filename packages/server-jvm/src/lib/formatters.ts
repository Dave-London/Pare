import type {
  GradleBuildResult,
  GradleTestResult,
  GradleTasksResult,
  GradleDependenciesResult,
  MavenBuildResult,
  MavenTestResult,
  MavenDependenciesResult,
  MavenVerifyResult,
} from "../schemas/index.js";

// ── Gradle formatters ───────────────────────────────────────────────

export function formatGradleBuild(data: GradleBuildResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`gradle build: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`gradle build: success (${data.duration}ms).`);
  } else {
    lines.push(`gradle build: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.tasksExecuted !== undefined) lines.push(`tasks executed: ${data.tasksExecuted}`);
  if (data.tasksFailed !== undefined) lines.push(`tasks failed: ${data.tasksFailed}`);
  if (data.diagnostics) {
    for (const d of data.diagnostics) {
      const loc = d.file ? `${d.file}${d.line ? `:${d.line}` : ""}` : "";
      lines.push(`  ${d.severity}: ${d.message}${loc ? ` (${loc})` : ""}`);
    }
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

export function formatGradleTest(data: GradleTestResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`gradle test: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`gradle test: success (${data.duration}ms).`);
  } else {
    lines.push(`gradle test: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  lines.push(
    `${data.totalTests} tests: ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped`,
  );
  if (data.tests) {
    for (const t of data.tests) {
      const status = t.passed ? "PASS" : "FAIL";
      const cls = t.className ? `${t.className} > ` : "";
      lines.push(`  ${status} ${cls}${t.name}${t.duration ? ` (${t.duration})` : ""}`);
      if (t.failure) lines.push(`    ${t.failure}`);
    }
  }
  return lines.join("\n");
}

export function formatGradleTasks(data: GradleTasksResult): string {
  if (data.total === 0) return "gradle: no tasks found.";
  const lines = [`gradle: ${data.total} tasks`];
  let lastGroup: string | undefined;
  for (const t of data.tasks) {
    if (t.group && t.group !== lastGroup) {
      lines.push(`\n${t.group} tasks`);
      lastGroup = t.group;
    }
    lines.push(`  ${t.name}${t.description ? ` - ${t.description}` : ""}`);
  }
  return lines.join("\n");
}

export function formatGradleDependencies(data: GradleDependenciesResult): string {
  if (data.totalDependencies === 0) return "gradle: no dependencies found.";
  const lines = [`gradle: ${data.totalDependencies} dependencies`];
  for (const config of data.configurations) {
    lines.push(`\n${config.configuration}:`);
    for (const d of config.dependencies) {
      lines.push(`  ${d.group}:${d.artifact}${d.version ? `:${d.version}` : ""}`);
    }
  }
  return lines.join("\n");
}

// ── Maven formatters ────────────────────────────────────────────────

export function formatMavenBuild(data: MavenBuildResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`maven build: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`maven build: success (${data.duration}ms).`);
  } else {
    lines.push(`maven build: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.diagnostics) {
    for (const d of data.diagnostics) {
      const loc = d.file ? `${d.file}${d.line ? `:${d.line}` : ""}` : "";
      lines.push(`  ${d.severity}: ${d.message}${loc ? ` (${loc})` : ""}`);
    }
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

export function formatMavenTest(data: MavenTestResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`maven test: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`maven test: success (${data.duration}ms).`);
  } else {
    lines.push(`maven test: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  lines.push(
    `${data.totalTests} tests: ${data.passed} passed, ${data.failed} failed, ${data.errors} errors, ${data.skipped} skipped`,
  );
  if (data.tests) {
    for (const t of data.tests) {
      const status = t.passed ? "PASS" : "FAIL";
      const cls = t.className ? `${t.className} > ` : "";
      lines.push(`  ${status} ${cls}${t.name}`);
      if (t.failure) lines.push(`    ${t.failure}`);
    }
  }
  return lines.join("\n");
}

export function formatMavenDependencies(data: MavenDependenciesResult): string {
  if (data.total === 0) return "maven: no dependencies found.";
  const lines = [`maven: ${data.total} dependencies`];
  for (const d of data.dependencies) {
    const parts = [`  ${d.groupId}:${d.artifactId}`];
    if (d.version) parts.push(`:${d.version}`);
    if (d.scope) parts.push(` (${d.scope})`);
    lines.push(parts.join(""));
  }
  return lines.join("\n");
}

export function formatMavenVerify(data: MavenVerifyResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`maven verify: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`maven verify: success (${data.duration}ms).`);
  } else {
    lines.push(`maven verify: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.diagnostics) {
    for (const d of data.diagnostics) {
      const loc = d.file ? `${d.file}${d.line ? `:${d.line}` : ""}` : "";
      lines.push(`  ${d.severity}: ${d.message}${loc ? ` (${loc})` : ""}`);
    }
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ──────────────────────────

// Gradle build compact
export interface GradleBuildCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  tasksExecuted?: number;
  tasksFailed?: number;
  diagnosticCount: number;
}

export function compactGradleBuildMap(data: GradleBuildResult): GradleBuildCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
    tasksExecuted: data.tasksExecuted,
    tasksFailed: data.tasksFailed,
    diagnosticCount: (data.diagnostics ?? []).length,
  };
}

export function formatGradleBuildCompact(data: GradleBuildCompact): string {
  if (data.timedOut)
    return `gradle build: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  if (data.success) return `gradle build: success (${data.duration}ms).`;
  return `gradle build: exit code ${data.exitCode} (${data.duration}ms), ${data.diagnosticCount} diagnostics.`;
}

// Gradle test compact
export interface GradleTestCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export function compactGradleTestMap(data: GradleTestResult): GradleTestCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
    totalTests: data.totalTests,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
  };
}

export function formatGradleTestCompact(data: GradleTestCompact): string {
  if (data.timedOut)
    return `gradle test: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  if (data.success) return `gradle test: ${data.totalTests} passed (${data.duration}ms).`;
  return `gradle test: ${data.passed}/${data.totalTests} passed, ${data.failed} failed, ${data.skipped} skipped (${data.duration}ms).`;
}

// Gradle tasks compact
export interface GradleTasksCompact {
  [key: string]: unknown;
  total: number;
}

export function compactGradleTasksMap(data: GradleTasksResult): GradleTasksCompact {
  return { total: data.total };
}

export function formatGradleTasksCompact(data: GradleTasksCompact): string {
  if (data.total === 0) return "gradle: no tasks found.";
  return `gradle: ${data.total} tasks`;
}

// Gradle dependencies compact
export interface GradleDepsCompact {
  [key: string]: unknown;
  totalDependencies: number;
  configurationCount: number;
}

export function compactGradleDepsMap(data: GradleDependenciesResult): GradleDepsCompact {
  return {
    totalDependencies: data.totalDependencies,
    configurationCount: data.configurations.length,
  };
}

export function formatGradleDepsCompact(data: GradleDepsCompact): string {
  if (data.totalDependencies === 0) return "gradle: no dependencies found.";
  return `gradle: ${data.totalDependencies} dependencies across ${data.configurationCount} configurations`;
}

// Maven build compact
export interface MavenBuildCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  diagnosticCount: number;
}

export function compactMavenBuildMap(data: MavenBuildResult): MavenBuildCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
    diagnosticCount: (data.diagnostics ?? []).length,
  };
}

export function formatMavenBuildCompact(data: MavenBuildCompact): string {
  if (data.timedOut)
    return `maven build: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  if (data.success) return `maven build: success (${data.duration}ms).`;
  return `maven build: exit code ${data.exitCode} (${data.duration}ms), ${data.diagnosticCount} diagnostics.`;
}

// Maven test compact
export interface MavenTestCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
}

export function compactMavenTestMap(data: MavenTestResult): MavenTestCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
    totalTests: data.totalTests,
    passed: data.passed,
    failed: data.failed,
    errors: data.errors,
    skipped: data.skipped,
  };
}

export function formatMavenTestCompact(data: MavenTestCompact): string {
  if (data.timedOut)
    return `maven test: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  if (data.success) return `maven test: ${data.totalTests} passed (${data.duration}ms).`;
  return `maven test: ${data.passed}/${data.totalTests} passed, ${data.failed} failed, ${data.errors} errors, ${data.skipped} skipped (${data.duration}ms).`;
}

// Maven dependencies compact
export interface MavenDepsCompact {
  [key: string]: unknown;
  total: number;
}

export function compactMavenDepsMap(data: MavenDependenciesResult): MavenDepsCompact {
  return { total: data.total };
}

export function formatMavenDepsCompact(data: MavenDepsCompact): string {
  if (data.total === 0) return "maven: no dependencies found.";
  return `maven: ${data.total} dependencies`;
}

// Maven verify compact
export interface MavenVerifyCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  diagnosticCount: number;
}

export function compactMavenVerifyMap(data: MavenVerifyResult): MavenVerifyCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
    diagnosticCount: (data.diagnostics ?? []).length,
  };
}

export function formatMavenVerifyCompact(data: MavenVerifyCompact): string {
  if (data.timedOut)
    return `maven verify: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  if (data.success) return `maven verify: success (${data.duration}ms).`;
  return `maven verify: exit code ${data.exitCode} (${data.duration}ms), ${data.diagnosticCount} diagnostics.`;
}
