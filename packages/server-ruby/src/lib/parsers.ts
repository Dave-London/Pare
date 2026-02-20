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

// ── Run ─────────────────────────────────────────────────────────────────

/** Parses the output of `ruby <file>` into structured result data. */
export function parseRunOutput(
  file: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): RubyRunResult {
  return {
    file,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── Check ───────────────────────────────────────────────────────────────

/** Parses the output of `ruby -c <file>` into structured result data. */
export function parseCheckOutput(
  file: string,
  stdout: string,
  stderr: string,
  exitCode: number,
): RubyCheckResult {
  const valid = exitCode === 0;
  return {
    file,
    valid,
    exitCode,
    message: stdout.trimEnd() || undefined,
    errors: stderr.trimEnd() || undefined,
  };
}

// ── Gem List ────────────────────────────────────────────────────────────

/**
 * Parses `gem list --local` output into structured gem data.
 *
 * Expected format:
 * ```
 * *** LOCAL GEMS ***
 *
 * abbrev (default: 0.1.2)
 * base64 (0.2.0, 0.1.0)
 * bigdecimal (default: 3.1.8, 3.1.6)
 * ```
 */
export function parseGemList(stdout: string): GemListResult {
  const gems: { name: string; versions: string[] }[] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("***") || trimmed.startsWith("*")) continue;

    // Match: gem-name (version1, version2, ...)
    // Versions may have "default: " prefix
    const match = trimmed.match(/^(\S+)\s+\((.+)\)$/);
    if (match) {
      const name = match[1];
      const rawVersions = match[2];
      const versions = rawVersions
        .split(",")
        .map((v) => v.trim().replace(/^default:\s*/, ""))
        .filter((v) => v.length > 0);
      gems.push({ name, versions });
    }
  }

  return { gems, total: gems.length };
}

// ── Gem Install ─────────────────────────────────────────────────────────

/** Parses the output of `gem install <name>` into structured result data. */
export function parseGemInstallOutput(
  gem: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): GemInstallResult {
  return {
    gem,
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
  };
}

// ── Gem Outdated ────────────────────────────────────────────────────────

/**
 * Parses `gem outdated` output into structured outdated gem data.
 *
 * Expected format:
 * ```
 * bigdecimal (3.1.6 < 3.1.8)
 * json (2.7.1 < 2.8.1)
 * ```
 */
export function parseGemOutdated(stdout: string): GemOutdatedResult {
  const gems: { name: string; current: string; latest: string }[] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match: gem-name (current < latest)
    const match = trimmed.match(/^(\S+)\s+\((\S+)\s+<\s+(\S+)\)$/);
    if (match) {
      gems.push({
        name: match[1],
        current: match[2],
        latest: match[3],
      });
    }
  }

  return { gems, total: gems.length };
}

// ── Bundle Install ──────────────────────────────────────────────────────

/** Parses the output of `bundle install` into structured result data. */
export function parseBundleInstallOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BundleInstallResult {
  return {
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
  };
}

// ── Bundle Exec ─────────────────────────────────────────────────────────

/** Parses the output of `bundle exec <cmd>` into structured result data. */
export function parseBundleExecOutput(
  command: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): BundleExecResult {
  return {
    command,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── Bundle Check ────────────────────────────────────────────────────────

/** Parses the output of `bundle check` into structured result data. */
export function parseBundleCheckOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): BundleCheckResult {
  return {
    satisfied: exitCode === 0,
    exitCode,
    message: stdout.trimEnd() || undefined,
    errors: stderr.trimEnd() || undefined,
  };
}
