import type {
  SshRunResult,
  SshTestResult,
  SshKeyscanResult,
  RsyncResult,
} from "../schemas/index.js";

// ── SSH Run ─────────────────────────────────────────────────────────────

/**
 * Parses the output of an ssh remote command execution into structured data.
 */
export function parseSshRunOutput(
  host: string,
  user: string | undefined,
  command: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): SshRunResult {
  return {
    host,
    user: user || undefined,
    command,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── SSH Test ────────────────────────────────────────────────────────────

/**
 * Parses the output of an ssh connectivity test into structured data.
 */
export function parseSshTestOutput(
  host: string,
  user: string | undefined,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): SshTestResult {
  // ssh -T often writes the banner to stderr
  const combined = (stdout + "\n" + stderr).trim();
  const banner = combined || undefined;

  return {
    host,
    user: user || undefined,
    reachable: exitCode === 0,
    exitCode,
    banner,
    error: exitCode !== 0 ? stderr.trimEnd() || undefined : undefined,
    duration,
  };
}

// ── SSH Keyscan ─────────────────────────────────────────────────────────

/**
 * Parses the output of ssh-keyscan into structured host key data.
 *
 * Expected format (one key per line):
 * ```
 * github.com ssh-ed25519 AAAAC3Nza...
 * github.com ssh-rsa AAAAB3Nza...
 * ```
 *
 * Comment lines starting with # are ignored.
 */
export function parseSshKeyscanOutput(
  host: string,
  stdout: string,
  stderr: string,
  exitCode: number,
): SshKeyscanResult {
  const keys: { host: string; keyType: string; key: string }[] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Format: hostname keytype key
    const parts = trimmed.split(/\s+/, 3);
    if (parts.length === 3) {
      keys.push({
        host: parts[0],
        keyType: parts[1],
        key: parts[2],
      });
    }
  }

  const hasError = exitCode !== 0 || (keys.length === 0 && stderr.trim().length > 0);

  return {
    host,
    keys,
    error: hasError ? stderr.trimEnd() || undefined : undefined,
    success: keys.length > 0,
  };
}

// ── Rsync ───────────────────────────────────────────────────────────────

/**
 * Parses the output of rsync into structured transfer data.
 *
 * When run with --stats, rsync outputs lines like:
 * ```
 * Number of files: 10
 * Number of regular files transferred: 3
 * Total file size: 1,234 bytes
 * ...
 * speedup is 1.23
 * ```
 */
export function parseRsyncOutput(
  source: string,
  destination: string,
  dryRun: boolean,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): RsyncResult {
  let filesTransferred: number | undefined;
  let totalSize: string | undefined;
  let speedup: string | undefined;

  // Parse --stats output
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();

    const transferMatch = trimmed.match(/^Number of (?:regular )?files transferred:\s*([\d,]+)/i);
    if (transferMatch) {
      filesTransferred = parseInt(transferMatch[1].replace(/,/g, ""), 10);
    }

    const sizeMatch = trimmed.match(/^Total file size:\s*(.+?)(?:\s+bytes)?$/i);
    if (sizeMatch) {
      totalSize = sizeMatch[1].trim();
    }

    const speedupMatch = trimmed.match(/speedup is\s+([\d.]+)/i);
    if (speedupMatch) {
      speedup = speedupMatch[1];
    }
  }

  return {
    source,
    destination,
    dryRun,
    success: exitCode === 0 && !timedOut,
    exitCode,
    filesTransferred,
    totalSize,
    speedup,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}
