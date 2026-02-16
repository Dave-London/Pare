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
    const cveInfo = v.cve ? ` [${v.cve}]` : "";
    lines.push(
      `  [${v.severity}] ${v.name}: ${v.title}${cveInfo}${v.fixAvailable ? " (fix available)" : ""}`,
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
  function formatDeps(deps: Record<string, NpmListDep>, indent: string) {
    for (const [name, dep] of Object.entries(deps)) {
      lines.push(`${indent}${name}@${dep.version}`);
      if (dep.dependencies) {
        formatDeps(dep.dependencies, indent + "  ");
      }
    }
  }
  formatDeps(data.dependencies ?? {}, "  ");
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
  total: number;
}

export function compactListMap(data: NpmList): NpmListCompact {
  return {
    name: data.name,
    version: data.version,
    total: data.total,
  };
}

export function formatListCompact(data: NpmListCompact): string {
  return `${data.name}@${data.version} (${data.total} dependencies)`;
}

// ── Info formatters ──────────────────────────────────────────────────

/** Formats structured npm info data into a human-readable package summary. */
export function formatInfo(data: NpmInfo): string {
  const lines = [`${data.name}@${data.version}`];
  if (data.description) lines.push(data.description);
  if (data.deprecated) lines.push(`DEPRECATED: ${data.deprecated}`);
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
  deprecated?: string;
}

export function compactInfoMap(data: NpmInfo): NpmInfoCompact {
  const result: NpmInfoCompact = {
    name: data.name,
    version: data.version,
    description: data.description,
  };
  if (data.license) result.license = data.license;
  if (data.homepage) result.homepage = data.homepage;
  if (data.deprecated) result.deprecated = data.deprecated;
  return result;
}

export function formatInfoCompact(data: NpmInfoCompact): string {
  const lines = [`${data.name}@${data.version}`];
  if (data.description) lines.push(data.description);
  if (data.deprecated) lines.push(`DEPRECATED: ${data.deprecated}`);
  if (data.license) lines.push(`License: ${data.license}`);
  if (data.homepage) lines.push(`Homepage: ${data.homepage}`);
  return lines.join("\n");
}

// ── Search formatters ────────────────────────────────────────────────

/** Formats structured npm search data into a human-readable results list. */
export function formatSearch(data: NpmSearch): string {
  if (data.total === 0) return "No packages found.";

  const lines = [`${data.total} packages found:`];
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
  total: number;
}

export function compactSearchMap(data: NpmSearch): NpmSearchCompact {
  return {
    packages: data.packages.map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
    })),
    total: data.total,
  };
}

export function formatSearchCompact(data: NpmSearchCompact): string {
  if (data.total === 0) return "No packages found.";

  const lines = [`${data.total} packages found:`];
  for (const pkg of data.packages) {
    lines.push(`  ${pkg.name}@${pkg.version} — ${pkg.description}`);
  }
  return lines.join("\n");
}

// ── Nvm formatters ───────────────────────────────────────────────────

/** Formats structured nvm data into a human-readable version summary. */
export function formatNvm(data: NvmResult): string {
  const lines = [`Current: ${data.current}`];
  if (data.default) {
    lines.push(`Default: ${data.default}`);
  }
  if (data.which) {
    lines.push(`Path: ${data.which}`);
  }
  if (data.arch) {
    lines.push(`Architecture: ${data.arch}`);
  }
  if (data.versions.length > 0) {
    lines.push(`Installed (${data.versions.length}):`);
    for (const v of data.versions) {
      const marker = v === data.current ? " (current)" : "";
      lines.push(`  ${v}${marker}`);
    }
  } else {
    lines.push("No versions installed.");
  }
  return lines.join("\n");
}
