import type {
  RubyRunResult,
  RubyCheckResult,
  GemListResult,
  GemInstallResult,
  GemOutdatedResult,
  BundleInstallResult,
  BundleExecResult,
  BundleCheckResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured ruby run results into human-readable output. */
export function formatRun(data: RubyRunResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `ruby ${data.file}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(`ruby ${data.file}: success (${data.duration}ms).`);
  } else {
    lines.push(`ruby ${data.file}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured ruby check results into human-readable output. */
export function formatCheck(data: RubyCheckResult): string {
  if (data.valid) {
    return `ruby -c ${data.file}: ${data.message || "Syntax OK"}`;
  }
  const lines = [`ruby -c ${data.file}: syntax error (exit code ${data.exitCode}).`];
  if (data.errors) lines.push(data.errors);
  return lines.join("\n");
}

/** Formats structured gem list results into human-readable output. */
export function formatGemList(data: GemListResult): string {
  if (data.total === 0) return "gem list: no gems found.";
  const lines = [`gem list: ${data.total} gems`];
  for (const gem of data.gems) {
    lines.push(`  ${gem.name} (${gem.versions.join(", ")})`);
  }
  return lines.join("\n");
}

/** Formats structured gem install results into human-readable output. */
export function formatGemInstall(data: GemInstallResult): string {
  const lines: string[] = [];
  if (data.success) {
    lines.push(`gem install ${data.gem}: success (${data.duration}ms).`);
  } else {
    lines.push(`gem install ${data.gem}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured gem outdated results into human-readable output. */
export function formatGemOutdated(data: GemOutdatedResult): string {
  if (data.total === 0) return "gem outdated: all gems are up to date.";
  const lines = [`gem outdated: ${data.total} outdated gems`];
  for (const gem of data.gems) {
    lines.push(`  ${gem.name} (${gem.current} -> ${gem.latest})`);
  }
  return lines.join("\n");
}

/** Formats structured bundle install results into human-readable output. */
export function formatBundleInstall(data: BundleInstallResult): string {
  const lines: string[] = [];
  if (data.success) {
    lines.push(`bundle install: success (${data.duration}ms).`);
  } else {
    lines.push(`bundle install: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured bundle exec results into human-readable output. */
export function formatBundleExec(data: BundleExecResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `bundle exec ${data.command}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(`bundle exec ${data.command}: success (${data.duration}ms).`);
  } else {
    lines.push(`bundle exec ${data.command}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured bundle check results into human-readable output. */
export function formatBundleCheck(data: BundleCheckResult): string {
  if (data.satisfied) {
    return `bundle check: ${data.message || "The Gemfile's dependencies are satisfied"}`;
  }
  const lines = [`bundle check: dependencies not satisfied (exit code ${data.exitCode}).`];
  if (data.errors) lines.push(data.errors);
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact run: file, exitCode, success, duration, timedOut. Drop stdout/stderr. */
export interface RubyRunCompact {
  [key: string]: unknown;
  file: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactRunMap(data: RubyRunResult): RubyRunCompact {
  return {
    file: data.file,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatRunCompact(data: RubyRunCompact): string {
  if (data.timedOut) {
    return `ruby ${data.file}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `ruby ${data.file}: success (${data.duration}ms).`;
  return `ruby ${data.file}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact check: file, valid, exitCode. */
export interface RubyCheckCompact {
  [key: string]: unknown;
  file: string;
  valid: boolean;
  exitCode: number;
}

export function compactCheckMap(data: RubyCheckResult): RubyCheckCompact {
  return {
    file: data.file,
    valid: data.valid,
    exitCode: data.exitCode,
  };
}

export function formatCheckCompact(data: RubyCheckCompact): string {
  if (data.valid) return `ruby -c ${data.file}: Syntax OK`;
  return `ruby -c ${data.file}: syntax error (exit code ${data.exitCode}).`;
}

/** Compact gem list: total only. */
export interface GemListCompact {
  [key: string]: unknown;
  total: number;
}

export function compactGemListMap(data: GemListResult): GemListCompact {
  return { total: data.total };
}

export function formatGemListCompact(data: GemListCompact): string {
  if (data.total === 0) return "gem list: no gems found.";
  return `gem list: ${data.total} gems`;
}

/** Compact gem install: gem, success, exitCode, duration. */
export interface GemInstallCompact {
  [key: string]: unknown;
  gem: string;
  success: boolean;
  exitCode: number;
  duration: number;
}

export function compactGemInstallMap(data: GemInstallResult): GemInstallCompact {
  return {
    gem: data.gem,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatGemInstallCompact(data: GemInstallCompact): string {
  if (data.success) return `gem install ${data.gem}: success (${data.duration}ms).`;
  return `gem install ${data.gem}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact gem outdated: total only. */
export interface GemOutdatedCompact {
  [key: string]: unknown;
  total: number;
}

export function compactGemOutdatedMap(data: GemOutdatedResult): GemOutdatedCompact {
  return { total: data.total };
}

export function formatGemOutdatedCompact(data: GemOutdatedCompact): string {
  if (data.total === 0) return "gem outdated: all gems are up to date.";
  return `gem outdated: ${data.total} outdated gems`;
}

/** Compact bundle install: success, exitCode, duration. */
export interface BundleInstallCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
}

export function compactBundleInstallMap(data: BundleInstallResult): BundleInstallCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatBundleInstallCompact(data: BundleInstallCompact): string {
  if (data.success) return `bundle install: success (${data.duration}ms).`;
  return `bundle install: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact bundle exec: command, success, exitCode, duration, timedOut. */
export interface BundleExecCompact {
  [key: string]: unknown;
  command: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactBundleExecMap(data: BundleExecResult): BundleExecCompact {
  return {
    command: data.command,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatBundleExecCompact(data: BundleExecCompact): string {
  if (data.timedOut) {
    return `bundle exec ${data.command}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `bundle exec ${data.command}: success (${data.duration}ms).`;
  return `bundle exec ${data.command}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact bundle check: satisfied, exitCode. */
export interface BundleCheckCompact {
  [key: string]: unknown;
  satisfied: boolean;
  exitCode: number;
}

export function compactBundleCheckMap(data: BundleCheckResult): BundleCheckCompact {
  return {
    satisfied: data.satisfied,
    exitCode: data.exitCode,
  };
}

export function formatBundleCheckCompact(data: BundleCheckCompact): string {
  if (data.satisfied) return "bundle check: dependencies satisfied";
  return `bundle check: dependencies not satisfied (exit code ${data.exitCode}).`;
}
