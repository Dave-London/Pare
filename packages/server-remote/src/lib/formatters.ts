import type {
  SshRunResult,
  SshTestResult,
  SshKeyscanResult,
  RsyncResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured ssh run results into human-readable output. */
export function formatSshRun(data: SshRunResult): string {
  const lines: string[] = [];
  const target = data.user ? `${data.user}@${data.host}` : data.host;

  if (data.timedOut) {
    lines.push(`ssh ${target}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`ssh ${target}: success (${data.duration}ms).`);
  } else {
    lines.push(`ssh ${target}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  lines.push(`command: ${data.command}`);
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured ssh test results into human-readable output. */
export function formatSshTest(data: SshTestResult): string {
  const lines: string[] = [];
  const target = data.user ? `${data.user}@${data.host}` : data.host;

  if (data.reachable) {
    lines.push(`ssh ${target}: reachable (${data.duration}ms).`);
  } else {
    lines.push(`ssh ${target}: unreachable (exit code ${data.exitCode}, ${data.duration}ms).`);
  }
  if (data.banner) lines.push(`banner: ${data.banner}`);
  if (data.error) lines.push(`error: ${data.error}`);
  return lines.join("\n");
}

/** Formats structured ssh-keyscan results into human-readable output. */
export function formatSshKeyscan(data: SshKeyscanResult): string {
  const lines: string[] = [];

  if (data.success) {
    lines.push(`ssh-keyscan ${data.host}: ${data.keys.length} keys found.`);
  } else {
    lines.push(`ssh-keyscan ${data.host}: failed.`);
  }
  for (const key of data.keys) {
    lines.push(`  ${key.keyType}: ${key.key.substring(0, 40)}...`);
  }
  if (data.error) lines.push(`error: ${data.error}`);
  return lines.join("\n");
}

/** Formats structured rsync results into human-readable output. */
export function formatRsync(data: RsyncResult): string {
  const lines: string[] = [];
  const mode = data.dryRun ? " (dry-run)" : "";

  if (data.timedOut) {
    lines.push(`rsync${mode}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`);
  } else if (data.success) {
    lines.push(`rsync${mode}: success (${data.duration}ms).`);
  } else {
    lines.push(`rsync${mode}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  lines.push(`source: ${data.source}`);
  lines.push(`destination: ${data.destination}`);
  if (data.filesTransferred !== undefined)
    lines.push(`files transferred: ${data.filesTransferred}`);
  if (data.totalSize) lines.push(`total size: ${data.totalSize}`);
  if (data.speedup) lines.push(`speedup: ${data.speedup}`);
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact ssh run: drop stdout/stderr. */
export interface SshRunCompact {
  [key: string]: unknown;
  host: string;
  user?: string;
  command: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactSshRunMap(data: SshRunResult): SshRunCompact {
  return {
    host: data.host,
    user: data.user,
    command: data.command,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatSshRunCompact(data: SshRunCompact): string {
  const target = data.user ? `${data.user}@${data.host}` : data.host;
  if (data.timedOut) {
    return `ssh ${target}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `ssh ${target}: success (${data.duration}ms).`;
  return `ssh ${target}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact ssh test: minimal connectivity info. */
export interface SshTestCompact {
  [key: string]: unknown;
  host: string;
  user?: string;
  reachable: boolean;
  duration: number;
}

export function compactSshTestMap(data: SshTestResult): SshTestCompact {
  return {
    host: data.host,
    user: data.user,
    reachable: data.reachable,
    duration: data.duration,
  };
}

export function formatSshTestCompact(data: SshTestCompact): string {
  const target = data.user ? `${data.user}@${data.host}` : data.host;
  return data.reachable
    ? `ssh ${target}: reachable (${data.duration}ms).`
    : `ssh ${target}: unreachable (${data.duration}ms).`;
}

/** Compact keyscan: key count only. */
export interface SshKeyscanCompact {
  [key: string]: unknown;
  host: string;
  keyCount: number;
  keyTypes: string[];
  success: boolean;
}

export function compactSshKeyscanMap(data: SshKeyscanResult): SshKeyscanCompact {
  return {
    host: data.host,
    keyCount: data.keys.length,
    keyTypes: data.keys.map((k) => k.keyType),
    success: data.success,
  };
}

export function formatSshKeyscanCompact(data: SshKeyscanCompact): string {
  if (!data.success) return `ssh-keyscan ${data.host}: failed.`;
  return `ssh-keyscan ${data.host}: ${data.keyCount} keys (${data.keyTypes.join(", ")}).`;
}

/** Compact rsync: drop stdout/stderr, keep stats. */
export interface RsyncCompact {
  [key: string]: unknown;
  source: string;
  destination: string;
  dryRun: boolean;
  success: boolean;
  exitCode: number;
  filesTransferred?: number;
  totalSize?: string;
  speedup?: string;
  duration: number;
  timedOut: boolean;
}

export function compactRsyncMap(data: RsyncResult): RsyncCompact {
  return {
    source: data.source,
    destination: data.destination,
    dryRun: data.dryRun,
    success: data.success,
    exitCode: data.exitCode,
    filesTransferred: data.filesTransferred,
    totalSize: data.totalSize,
    speedup: data.speedup,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatRsyncCompact(data: RsyncCompact): string {
  const mode = data.dryRun ? " (dry-run)" : "";
  if (data.timedOut) {
    return `rsync${mode}: TIMED OUT after ${data.duration}ms.`;
  }
  if (data.success) {
    const stats = data.filesTransferred !== undefined ? `, ${data.filesTransferred} files` : "";
    return `rsync${mode}: success (${data.duration}ms${stats}).`;
  }
  return `rsync${mode}: exit code ${data.exitCode} (${data.duration}ms).`;
}
