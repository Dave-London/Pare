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

// ── Full formatters ─────────────────────────────────────────────────

/** Formats structured `bun run` results into human-readable text. */
export function formatRun(data: BunRunResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `bun run ${data.script}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(`bun run ${data.script}: success (${data.duration}ms).`);
  } else {
    lines.push(`bun run ${data.script}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured `bun test` results into human-readable text. */
export function formatTest(data: BunTestResult): string {
  const lines: string[] = [];
  const status = data.success ? "PASS" : "FAIL";
  lines.push(`bun test: ${status} (${data.duration}ms)`);
  lines.push(
    `  ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped (${data.total} total)`,
  );

  if (data.tests) {
    for (const t of data.tests) {
      const icon = t.passed ? "+" : "-";
      const dur = t.duration !== undefined ? ` [${t.duration}ms]` : "";
      lines.push(`  ${icon} ${t.name}${dur}`);
      if (t.error) lines.push(`    ${t.error}`);
    }
  }
  return lines.join("\n");
}

/** Formats structured `bun build` results into human-readable text. */
export function formatBuild(data: BunBuildResult): string {
  const lines: string[] = [];
  const status = data.success ? "success" : "failed";
  lines.push(`bun build: ${status} (${data.duration}ms)`);
  lines.push(`  entrypoints: ${data.entrypoints.join(", ")}`);
  if (data.artifacts) {
    for (const a of data.artifacts) {
      lines.push(`  ${a.path}${a.size ? ` (${a.size})` : ""}`);
    }
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured `bun install` results into human-readable text. */
export function formatInstall(data: BunInstallResult): string {
  const lines: string[] = [];
  const status = data.success ? "success" : "failed";
  lines.push(`bun install: ${status} (${data.duration}ms)`);
  lines.push(`  ${data.installedCount} packages installed`);
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured `bun add` results into human-readable text. */
export function formatAdd(data: BunAddResult): string {
  const lines: string[] = [];
  const status = data.success ? "success" : "failed";
  const devLabel = data.dev ? " (dev)" : "";
  lines.push(`bun add${devLabel}: ${status} (${data.duration}ms)`);
  lines.push(`  packages: ${data.packages.join(", ")}`);
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured `bun remove` results into human-readable text. */
export function formatRemove(data: BunRemoveResult): string {
  const lines: string[] = [];
  const status = data.success ? "success" : "failed";
  lines.push(`bun remove: ${status} (${data.duration}ms)`);
  lines.push(`  packages: ${data.packages.join(", ")}`);
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured `bun outdated` results into human-readable text. */
export function formatOutdated(data: BunOutdatedResult): string {
  if (data.total === 0) return `bun outdated: all packages up to date (${data.duration}ms).`;

  const lines: string[] = [];
  lines.push(`bun outdated: ${data.total} packages outdated (${data.duration}ms)`);
  for (const p of data.packages) {
    const wanted = p.wanted ? ` (wanted: ${p.wanted})` : "";
    lines.push(`  ${p.name}: ${p.current} -> ${p.latest}${wanted}`);
  }
  return lines.join("\n");
}

/** Formats structured `bun pm ls` results into human-readable text. */
export function formatPmLs(data: BunPmLsResult): string {
  if (data.total === 0) return `bun pm ls: no packages found (${data.duration}ms).`;

  const lines: string[] = [];
  lines.push(`bun pm ls: ${data.total} packages (${data.duration}ms)`);
  for (const p of data.packages) {
    lines.push(`  ${p.name}${p.version ? `@${p.version}` : ""}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ──────────────────────────

/** Compact run: drop stdout/stderr. */
export interface BunRunCompact {
  [key: string]: unknown;
  script: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactRunMap(data: BunRunResult): BunRunCompact {
  return {
    script: data.script,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatRunCompact(data: BunRunCompact): string {
  if (data.timedOut) {
    return `bun run ${data.script}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `bun run ${data.script}: success (${data.duration}ms).`;
  return `bun run ${data.script}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact test: drop individual test details. */
export interface BunTestCompact {
  [key: string]: unknown;
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
}

export function compactTestMap(data: BunTestResult): BunTestCompact {
  return {
    success: data.success,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
    total: data.total,
    duration: data.duration,
  };
}

export function formatTestCompact(data: BunTestCompact): string {
  const status = data.success ? "PASS" : "FAIL";
  return `bun test: ${status} — ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped (${data.duration}ms)`;
}

/** Compact build: drop stdout/stderr. */
export interface BunBuildCompact {
  [key: string]: unknown;
  success: boolean;
  entrypoints: string[];
  artifactCount: number;
  duration: number;
}

export function compactBuildMap(data: BunBuildResult): BunBuildCompact {
  return {
    success: data.success,
    entrypoints: data.entrypoints,
    artifactCount: (data.artifacts ?? []).length,
    duration: data.duration,
  };
}

export function formatBuildCompact(data: BunBuildCompact): string {
  const status = data.success ? "success" : "failed";
  return `bun build: ${status} — ${data.artifactCount} artifacts from ${data.entrypoints.join(", ")} (${data.duration}ms)`;
}

/** Compact install: drop stdout/stderr. */
export interface BunInstallCompact {
  [key: string]: unknown;
  success: boolean;
  installedCount: number;
  duration: number;
}

export function compactInstallMap(data: BunInstallResult): BunInstallCompact {
  return {
    success: data.success,
    installedCount: data.installedCount,
    duration: data.duration,
  };
}

export function formatInstallCompact(data: BunInstallCompact): string {
  const status = data.success ? "success" : "failed";
  return `bun install: ${status} — ${data.installedCount} packages (${data.duration}ms)`;
}

/** Compact add: drop stdout/stderr. */
export interface BunAddCompact {
  [key: string]: unknown;
  success: boolean;
  packages: string[];
  dev: boolean;
  duration: number;
}

export function compactAddMap(data: BunAddResult): BunAddCompact {
  return {
    success: data.success,
    packages: data.packages,
    dev: data.dev,
    duration: data.duration,
  };
}

export function formatAddCompact(data: BunAddCompact): string {
  const status = data.success ? "success" : "failed";
  const devLabel = data.dev ? " (dev)" : "";
  return `bun add${devLabel}: ${status} — ${data.packages.join(", ")} (${data.duration}ms)`;
}

/** Compact remove: drop stdout/stderr. */
export interface BunRemoveCompact {
  [key: string]: unknown;
  success: boolean;
  packages: string[];
  duration: number;
}

export function compactRemoveMap(data: BunRemoveResult): BunRemoveCompact {
  return {
    success: data.success,
    packages: data.packages,
    duration: data.duration,
  };
}

export function formatRemoveCompact(data: BunRemoveCompact): string {
  const status = data.success ? "success" : "failed";
  return `bun remove: ${status} — ${data.packages.join(", ")} (${data.duration}ms)`;
}

/** Compact outdated: drop individual package details. */
export interface BunOutdatedCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  duration: number;
}

export function compactOutdatedMap(data: BunOutdatedResult): BunOutdatedCompact {
  return {
    success: data.success,
    total: data.total,
    duration: data.duration,
  };
}

export function formatOutdatedCompact(data: BunOutdatedCompact): string {
  if (data.total === 0) return `bun outdated: all up to date (${data.duration}ms).`;
  return `bun outdated: ${data.total} packages outdated (${data.duration}ms)`;
}

/** Compact pm ls: drop individual package details. */
export interface BunPmLsCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  duration: number;
}

export function compactPmLsMap(data: BunPmLsResult): BunPmLsCompact {
  return {
    success: data.success,
    total: data.total,
    duration: data.duration,
  };
}

export function formatPmLsCompact(data: BunPmLsCompact): string {
  if (data.total === 0) return `bun pm ls: no packages (${data.duration}ms).`;
  return `bun pm ls: ${data.total} packages (${data.duration}ms)`;
}
