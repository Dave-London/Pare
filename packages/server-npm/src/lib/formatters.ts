import type {
  NpmInstall,
  NpmAudit,
  NpmOutdated,
  NpmList,
  NpmListDep,
  NpmRun,
  NpmTest,
  NpmInit,
  NpmInfo,
  NpmSearch,
  NvmResult,
  NvmLsRemote,
  NvmExec,
} from "../schemas/index.js";

/** Formats structured npm install data into a human-readable summary of added/removed packages. */
export function formatInstall(data: NpmInstall, duration?: number): string {
  const parts = [];
  if (data.added) parts.push(`added ${data.added}`);
  if (data.removed) parts.push(`removed ${data.removed}`);
  if (data.changed) parts.push(`changed ${data.changed}`);
  const durationSuffix = duration !== undefined ? `, ${duration}s` : "";
  const line = parts.length
    ? parts.join(", ") + ` (${data.added + data.removed + data.changed} packages${durationSuffix})`
    : `up to date`;

  const lines = [line];

  // Show specific package details if available
  if (data.packageDetails && data.packageDetails.length > 0) {
    const maxShow = 10; // Limit display to avoid huge output
    const shown = data.packageDetails.slice(0, maxShow);
    for (const pkg of shown) {
      lines.push(`  ${pkg.action}: ${pkg.name}@${pkg.version}`);
    }
    if (data.packageDetails.length > maxShow) {
      lines.push(`  ... and ${data.packageDetails.length - maxShow} more`);
    }
  }
  if (data.lockfileChanged !== undefined) {
    lines.push(`Lockfile changed: ${data.lockfileChanged ? "yes" : "no"}`);
  }

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
  const total = data.vulnerabilities.length;
  if (total === 0) return "No vulnerabilities found.";

  const critical = data.vulnerabilities.filter((v) => v.severity === "critical").length;
  const high = data.vulnerabilities.filter((v) => v.severity === "high").length;
  const moderate = data.vulnerabilities.filter((v) => v.severity === "moderate").length;
  const low = data.vulnerabilities.filter((v) => v.severity === "low").length;

  const lines = [
    `${total} vulnerabilities (${critical} critical, ${high} high, ${moderate} moderate, ${low} low)`,
  ];
  for (const v of data.vulnerabilities) {
    const cveInfo = v.cve ? ` [${v.cve}]` : "";
    lines.push(
      `  [${v.severity}] ${v.name}: ${v.title}${cveInfo}${v.fixAvailable ? " (fix available)" : ""}`,
    );
  }
  return lines.join("\n");
}

/** Formats structured npm outdated data into a human-readable list of packages needing updates. */
export function formatOutdated(data: NpmOutdated): string {
  const total = data.packages.length;
  if (total === 0) return "All packages are up to date.";

  const lines = [`${total} outdated packages:`];
  for (const p of data.packages) {
    const homepage = p.homepage ? ` (${p.homepage})` : "";
    lines.push(`  ${p.name}: ${p.current} → ${p.wanted} (latest: ${p.latest})${homepage}`);
  }
  return lines.join("\n");
}

/** Formats structured npm list data into a human-readable dependency tree summary. */
export function formatList(data: NpmList): string {
  function countDeps(deps: Record<string, NpmListDep>): number {
    let count = 0;
    for (const dep of Object.values(deps)) {
      count++;
      if (dep.dependencies) count += countDeps(dep.dependencies);
    }
    return count;
  }
  const total = countDeps(data.dependencies ?? {});
  const lines = [`${data.name}@${data.version} (${total} dependencies)`];
  if (data.problems && data.problems.length > 0) {
    lines.push(`Problems (${data.problems.length}):`);
    for (const problem of data.problems) {
      lines.push(`  - ${problem}`);
    }
  }
  function formatDeps(deps: Record<string, NpmListDep>, indent: string) {
    for (const [name, dep] of Object.entries(deps)) {
      const typeTag = dep.type ? ` [${dep.type}]` : "";
      lines.push(`${indent}${name}@${dep.version}${typeTag}`);
      if (dep.dependencies) {
        formatDeps(dep.dependencies, indent + "  ");
      }
    }
  }
  formatDeps(data.dependencies ?? {}, "  ");
  return lines.join("\n");
}

/** Formats structured npm run output into a human-readable script execution summary. */
export function formatRun(data: NpmRun, script?: string, duration?: number): string {
  const scriptName = script ?? "unknown";
  const durationStr = duration !== undefined ? ` in ${duration}s` : "";
  let status: string;
  if (data.timedOut) {
    status = `timed out${duration !== undefined ? ` after ${duration}s` : ""}`;
  } else if (data.success) {
    status = `completed successfully`;
  } else {
    status = `failed (exit code ${data.exitCode})`;
  }
  const lines = [`Script "${scriptName}" ${status}${durationStr}`];
  if (data.stdout) {
    lines.push("", "stdout:", data.stdout);
  }
  if (data.stderr) {
    lines.push("", "stderr:", data.stderr);
  }
  return lines.join("\n");
}

/** Formats structured npm test output into a human-readable test result summary. */
export function formatTest(data: NpmTest, duration?: number): string {
  const status = data.timedOut
    ? "timed out"
    : data.success
      ? "passed"
      : `failed (exit code ${data.exitCode})`;
  const durationStr = duration !== undefined ? ` in ${duration}s` : "";
  const lines = [`Tests ${status}${durationStr}`];

  // Show parsed test results if available
  if (data.testResults) {
    const r = data.testResults;
    lines.push(
      `Results: ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped (${r.total} total)`,
    );
  }

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
    const lines = [`Failed to initialize package.json at ${data.path}`];
    if (data.stderr) lines.push("", "stderr:", data.stderr);
    return lines.join("\n");
  }
  return `Created ${data.packageName}@${data.version} at ${data.path}`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact list: counts only, no dependency tree (tree shape can't validate against schema). */
export interface NpmListCompact {
  [key: string]: unknown;
  name: string;
  version: string;
}

export function compactListMap(data: NpmList): NpmListCompact {
  return {
    name: data.name,
    version: data.version,
  };
}

export function formatListCompact(data: NpmListCompact): string {
  return `${data.name}@${data.version}`;
}

// ── Info formatters ──────────────────────────────────────────────────

/** Formats structured npm info data into a human-readable package summary. */
export function formatInfo(data: NpmInfo, deprecationMessage?: string): string {
  const lines = [`${data.name}@${data.version}`];
  if (data.description) lines.push(data.description);
  if (data.isDeprecated)
    lines.push(`DEPRECATED${deprecationMessage ? `: ${deprecationMessage}` : ""}`);
  if (data.license) lines.push(`License: ${data.license}`);
  if (data.homepage) lines.push(`Homepage: ${data.homepage}`);
  if (data.repository?.url) lines.push(`Repository: ${data.repository.url}`);
  if (data.keywords && data.keywords.length > 0) {
    lines.push(`Keywords: ${data.keywords.join(", ")}`);
  }
  if (data.engines) {
    const engineParts = Object.entries(data.engines)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    lines.push(`Engines: ${engineParts}`);
  }
  if (data.peerDependencies) {
    const peerCount = Object.keys(data.peerDependencies).length;
    lines.push(`Peer Dependencies: ${peerCount}`);
    for (const [name, version] of Object.entries(data.peerDependencies)) {
      lines.push(`  ${name}: ${version}`);
    }
  }
  if (data.dependencies) {
    const depCount = Object.keys(data.dependencies).length;
    lines.push(`Dependencies: ${depCount}`);
    for (const [name, version] of Object.entries(data.dependencies)) {
      lines.push(`  ${name}: ${version}`);
    }
  }
  if (data.dist?.tarball) {
    lines.push(`Tarball: ${data.dist.tarball}`);
  }
  if (data.versions && data.versions.length > 0) {
    lines.push(`Published Versions: ${data.versions.length}`);
  }
  return lines.join("\n");
}

/** Compact info: drop dependencies, dist details, versions. */
export interface NpmInfoCompact {
  [key: string]: unknown;
  name: string;
  version: string;
  description: string;
  license?: string;
  homepage?: string;
  isDeprecated?: boolean;
}

export function compactInfoMap(data: NpmInfo): NpmInfoCompact {
  const result: NpmInfoCompact = {
    name: data.name,
    version: data.version,
    description: data.description,
  };
  if (data.license) result.license = data.license;
  if (data.homepage) result.homepage = data.homepage;
  if (data.isDeprecated) result.isDeprecated = data.isDeprecated;
  return result;
}

export function formatInfoCompact(data: NpmInfoCompact): string {
  const lines = [`${data.name}@${data.version}`];
  if (data.description) lines.push(data.description);
  if (data.isDeprecated) lines.push(`DEPRECATED`);
  if (data.license) lines.push(`License: ${data.license}`);
  if (data.homepage) lines.push(`Homepage: ${data.homepage}`);
  return lines.join("\n");
}

// ── Search formatters ────────────────────────────────────────────────

/** Formats structured npm search data into a human-readable results list. */
export function formatSearch(data: NpmSearch): string {
  const total = data.packages.length;
  if (total === 0) return "No packages found.";

  const lines = [`${total} packages found:`];
  for (const pkg of data.packages) {
    const author = pkg.author ? ` by ${pkg.author}` : "";
    const scope = pkg.scope ? ` [${pkg.scope}]` : "";
    lines.push(`  ${pkg.name}@${pkg.version}${scope} — ${pkg.description}${author}`);
  }
  return lines.join("\n");
}

/** Compact search: drop author, date, keywords, links, score fields. */
export interface NpmSearchCompact {
  [key: string]: unknown;
  packages: { name: string; version: string; description: string }[];
}

export function compactSearchMap(data: NpmSearch): NpmSearchCompact {
  return {
    packages: data.packages.map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
    })),
  };
}

export function formatSearchCompact(data: NpmSearchCompact): string {
  const total = data.packages.length;
  if (total === 0) return "No packages found.";

  const lines = [`${total} packages found:`];
  for (const pkg of data.packages) {
    lines.push(`  ${pkg.name}@${pkg.version} — ${pkg.description}`);
  }
  return lines.join("\n");
}

// ── Nvm formatters ───────────────────────────────────────────────────

/** Formats structured nvm data into a human-readable version summary. */
export function formatNvm(
  data: NvmResult,
  extra?: { aliases?: Record<string, string>; arch?: string },
): string {
  if (data.requestedVersion) {
    return formatNvmVersion(data);
  }

  const lines = [`Current: ${data.current}`];
  if (data.required) {
    lines.push(`Required (.nvmrc): ${data.required}`);
  }
  if (data.default) {
    lines.push(`Default: ${data.default}`);
  }
  if (data.which) {
    lines.push(`Path: ${data.which}`);
  }
  if (extra?.arch) {
    lines.push(`Architecture: ${extra.arch}`);
  }
  if (extra?.aliases && Object.keys(extra.aliases).length > 0) {
    lines.push("Aliases:");
    for (const [alias, target] of Object.entries(extra.aliases)) {
      lines.push(`  ${alias} -> ${target}`);
    }
  }
  if (data.versions.length > 0) {
    lines.push(`Installed (${data.versions.length}):`);
    for (const v of data.versions) {
      const marker = v.version === data.current ? " (current)" : "";
      const ltsTag = v.lts ? ` [LTS: ${v.lts}]` : "";
      lines.push(`  ${v.version}${ltsTag}${marker}`);
    }
  } else {
    lines.push("No versions installed.");
  }
  return lines.join("\n");
}

/** Formats nvm version-resolution output into a human-readable summary. */
export function formatNvmVersion(data: NvmResult): string {
  if (!data.requestedVersion) {
    return "No version query provided.";
  }
  if (!data.resolvedVersion || data.resolvedVersion === "N/A") {
    return `Could not resolve "${data.requestedVersion}"`;
  }
  return `Resolved "${data.requestedVersion}" -> ${data.resolvedVersion}`;
}

/** Formats nvm ls-remote output into a human-readable version list. */
export function formatNvmLsRemote(data: NvmLsRemote): string {
  const total = data.versions.length;
  if (total === 0) return "No remote versions found.";

  const lines = [`${total} available versions:`];
  for (const v of data.versions) {
    const ltsTag = v.lts ? ` (LTS: ${v.lts})` : "";
    lines.push(`  ${v.version}${ltsTag}`);
  }
  return lines.join("\n");
}

/** Formats nvm exec output into a human-readable execution summary. */
export function formatNvmExec(data: NvmExec): string {
  const status = data.success ? "completed successfully" : `failed (exit code ${data.exitCode})`;
  const lines = [`Command ${status} using Node.js ${data.version}`];
  if (data.stdout) {
    lines.push("", "stdout:", data.stdout);
  }
  if (data.stderr) {
    lines.push("", "stderr:", data.stderr);
  }
  return lines.join("\n");
}
