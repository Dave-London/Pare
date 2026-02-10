import type {
  NpmInstall,
  NpmAudit,
  NpmOutdated,
  NpmList,
  NpmRun,
  NpmTest,
  NpmInit,
} from "../schemas/index.js";

/** Formats structured npm install data into a human-readable summary of added/removed packages. */
export function formatInstall(data: NpmInstall): string {
  const parts = [];
  if (data.added) parts.push(`added ${data.added}`);
  if (data.removed) parts.push(`removed ${data.removed}`);
  if (data.changed) parts.push(`changed ${data.changed}`);
  const line = parts.length
    ? parts.join(", ") + ` (${data.packages} packages, ${data.duration}s)`
    : `up to date (${data.packages} packages)`;

  const lines = [line];
  if (data.vulnerabilities && data.vulnerabilities.total > 0) {
    lines.push(
      `${data.vulnerabilities.total} vulnerabilities (${data.vulnerabilities.critical} critical, ${data.vulnerabilities.high} high)`,
    );
  }
  if (data.funding) {
    lines.push(`${data.funding} packages looking for funding`);
  }
  return lines.join("\n");
}

/** Formats structured npm audit data into a human-readable vulnerability report. */
export function formatAudit(data: NpmAudit): string {
  if (data.summary.total === 0) return "No vulnerabilities found.";

  const lines = [
    `${data.summary.total} vulnerabilities (${data.summary.critical} critical, ${data.summary.high} high, ${data.summary.moderate} moderate, ${data.summary.low} low)`,
  ];
  for (const v of data.vulnerabilities) {
    lines.push(
      `  [${v.severity}] ${v.name}: ${v.title}${v.fixAvailable ? " (fix available)" : ""}`,
    );
  }
  return lines.join("\n");
}

/** Formats structured npm outdated data into a human-readable list of packages needing updates. */
export function formatOutdated(data: NpmOutdated): string {
  if (data.total === 0) return "All packages are up to date.";

  const lines = [`${data.total} outdated packages:`];
  for (const p of data.packages) {
    lines.push(`  ${p.name}: ${p.current} → ${p.wanted} (latest: ${p.latest})`);
  }
  return lines.join("\n");
}

/** Formats structured npm list data into a human-readable dependency tree summary. */
export function formatList(data: NpmList): string {
  const lines = [`${data.name}@${data.version} (${data.total} dependencies)`];
  for (const [name, dep] of Object.entries(data.dependencies)) {
    lines.push(`  ${name}@${dep.version}`);
  }
  return lines.join("\n");
}

/** Formats structured npm run output into a human-readable script execution summary. */
export function formatRun(data: NpmRun): string {
  const status = data.success ? "completed successfully" : `failed (exit code ${data.exitCode})`;
  const lines = [`Script "${data.script}" ${status} in ${data.duration}s`];
  if (data.stdout) {
    lines.push("", "stdout:", data.stdout);
  }
  if (data.stderr) {
    lines.push("", "stderr:", data.stderr);
  }
  return lines.join("\n");
}

/** Formats structured npm test output into a human-readable test result summary. */
export function formatTest(data: NpmTest): string {
  const status = data.success ? "passed" : `failed (exit code ${data.exitCode})`;
  const lines = [`Tests ${status} in ${data.duration}s`];
  if (data.stdout) {
    lines.push("", "stdout:", data.stdout);
  }
  if (data.stderr) {
    lines.push("", "stderr:", data.stderr);
  }
  return lines.join("\n");
}

/** Formats structured npm init output into a human-readable initialization summary. */
export function formatInit(data: NpmInit): string {
  if (!data.success) {
    return `Failed to initialize package.json at ${data.path}`;
  }
  return `Created ${data.packageName}@${data.version} at ${data.path}`;
}
