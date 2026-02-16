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

import type { PackageManager } from "./detect-pm.js";

/** Shape of an npm audit vulnerability entry from `npm audit --json`. */
interface NpmAuditVulnEntry {
  severity?: string;
  title?: string;
  via?: Array<{ title?: string; url?: string; cwe?: string[] }> | unknown[];
  range?: string;
  fixAvailable?: boolean;
}

/** Shape of a pnpm/npm v6 audit advisory entry. */
interface NpmAuditAdvisory {
  module_name?: string;
  name?: string;
  severity?: string;
  title?: string;
  url?: string;
  vulnerable_versions?: string;
  range?: string;
  patched_versions?: string;
  cves?: string[];
  cwe?: string[];
}

/** Shape of an npm outdated entry from `npm outdated --json`. */
interface NpmOutdatedEntry {
  packageName?: string;
  name?: string;
  current?: string;
  wanted?: string;
  latest?: string;
  location?: string;
  type?: string;
  dependencyType?: string;
}

/** Shape of an npm list dependency entry from `npm list --json`. */
interface NpmListRawDep {
  version?: string;
  dependencies?: Record<string, NpmListRawDep>;
  devDependencies?: Record<string, NpmListRawDep>;
  optionalDependencies?: Record<string, NpmListRawDep>;
}

/** Shape of a yarn tree node from `yarn list --json`. */
interface YarnTreeNode {
  name?: string;
  children?: YarnTreeNode[];
}

/** Shape of an npm search result entry from `npm search --json`. */
interface NpmSearchEntry {
  name?: string;
  version?: string;
  description?: string;
  author?: { name?: string } | string;
  date?: string;
  keywords?: string[];
  score?: { final?: number; detail?: unknown };
  links?: { npm?: string; homepage?: string; repository?: string };
  scope?: string;
}

/**
 * Parses install package details from npm/pnpm/yarn install output (best-effort).
 *
 * npm output patterns:
 *   - "added: pkg@version"
 *   - Lines like "+ pkg@version" (yarn/pnpm)
 *   - pnpm: "packages/foo 1.0.0" or "+package@version" in verbose output
 */
export function parseInstallPackageDetails(stdout: string): NpmInstall["packageDetails"] {
  const details: NonNullable<NpmInstall["packageDetails"]> = [];

  // npm verbose: "add pkg 1.2.3" lines (from npm install --loglevel verbose/silly)
  // npm dry-run: "add pkg 1.2.3" lines
  const npmAddPattern = /^add\s+(\S+)\s+(\S+)/gm;
  let match: RegExpExecArray | null;
  match = npmAddPattern.exec(stdout);
  while (match !== null) {
    details.push({ name: match[1], version: match[2], action: "added" });
    match = npmAddPattern.exec(stdout);
  }

  // npm verbose: "remove pkg 1.2.3"
  const npmRemovePattern = /^remove\s+(\S+)\s+(\S+)/gm;
  match = npmRemovePattern.exec(stdout);
  while (match !== null) {
    details.push({ name: match[1], version: match[2], action: "removed" });
    match = npmRemovePattern.exec(stdout);
  }

  // npm verbose: "change pkg 1.2.3"
  const npmChangePattern = /^change\s+(\S+)\s+(\S+)/gm;
  match = npmChangePattern.exec(stdout);
  while (match !== null) {
    details.push({ name: match[1], version: match[2], action: "updated" });
    match = npmChangePattern.exec(stdout);
  }

  // pnpm: "+ pkg 1.2.3" or "- pkg 1.2.3" lines in verbose/reporter output
  const pnpmAddPattern = /^\+\s+(\S+)\s+(\S+)/gm;
  match = pnpmAddPattern.exec(stdout);
  while (match !== null) {
    // Avoid duplicates from npm add patterns
    if (!details.some((d) => d.name === match![1] && d.version === match![2])) {
      details.push({ name: match[1], version: match[2], action: "added" });
    }
    match = pnpmAddPattern.exec(stdout);
  }

  const pnpmRemovePattern = /^-\s+(\S+)\s+(\S+)/gm;
  match = pnpmRemovePattern.exec(stdout);
  while (match !== null) {
    if (!details.some((d) => d.name === match![1] && d.version === match![2])) {
      details.push({ name: match[1], version: match[2], action: "removed" });
    }
    match = pnpmRemovePattern.exec(stdout);
  }

  // yarn: "info ... - pkg@version" or "info ... + pkg@version"
  const yarnPattern = /(?:Added|Removed|Updated)\s+"?([^@"\s]+)@([^"\s]+)"?/gm;
  match = yarnPattern.exec(stdout);
  while (match !== null) {
    const line = match[0];
    let action: "added" | "removed" | "updated" = "added";
    if (line.startsWith("Removed")) action = "removed";
    else if (line.startsWith("Updated")) action = "updated";
    if (!details.some((d) => d.name === match![1] && d.version === match![2])) {
      details.push({ name: match[1], version: match[2], action });
    }
    match = yarnPattern.exec(stdout);
  }

  return details.length > 0 ? details : undefined;
}

/** Parses `npm install` or `pnpm install` summary output into structured data with package counts and vulnerability info. */
export function parseInstallOutput(stdout: string, duration: number): NpmInstall {
  // npm install doesn't have a great --json output, so we parse the summary line
  // "added X packages, removed Y packages, changed Z packages in Ns"
  const added = stdout.match(/added (\d+) package/)?.[1];
  const removed = stdout.match(/removed (\d+) package/)?.[1];
  const changed = stdout.match(/changed (\d+) package/)?.[1];
  const packages = stdout.match(/(\d+) packages? in/)?.[1];

  // Parse vulnerability summary if present
  const vulnMatch = stdout.match(/(\d+) vulnerabilit/);
  let vulnerabilities: NpmInstall["vulnerabilities"];
  if (vulnMatch) {
    const critical = parseInt(stdout.match(/(\d+) critical/)?.[1] ?? "0", 10);
    const high = parseInt(stdout.match(/(\d+) high/)?.[1] ?? "0", 10);
    const moderate = parseInt(stdout.match(/(\d+) moderate/)?.[1] ?? "0", 10);
    const low = parseInt(stdout.match(/(\d+) low/)?.[1] ?? "0", 10);
    const info = parseInt(stdout.match(/(\d+) info/)?.[1] ?? "0", 10);
    vulnerabilities = {
      total: parseInt(vulnMatch[1], 10),
      critical,
      high,
      moderate,
      low,
      info,
    };
  }

  const fundingMatch = stdout.match(/(\d+) packages? are looking for funding/);

  // Best-effort: parse specific package details
  const packageDetails = parseInstallPackageDetails(stdout);

  return {
    added: parseInt(added ?? "0", 10),
    removed: parseInt(removed ?? "0", 10),
    changed: parseInt(changed ?? "0", 10),
    duration,
    packages: parseInt(packages ?? "0", 10),
    ...(packageDetails ? { packageDetails } : {}),
    ...(vulnerabilities ? { vulnerabilities } : {}),
    ...(fundingMatch ? { funding: parseInt(fundingMatch[1], 10) } : {}),
  };
}

/**
 * Extracts CVE identifier from an npm audit advisory URL.
 * URLs typically look like: https://github.com/advisories/GHSA-xxx or
 * contain CVE references in the via array.
 */
function extractCve(via: NpmAuditVulnEntry["via"], url?: string): { cve?: string; cwe?: string[] } {
  const result: { cve?: string; cwe?: string[] } = {};

  if (url) {
    const cveMatch = url.match(/(CVE-\d{4}-\d+)/i);
    if (cveMatch) result.cve = cveMatch[1].toUpperCase();
  }

  if (Array.isArray(via)) {
    for (const v of via) {
      if (typeof v === "object" && v !== null) {
        const entry = v as { url?: string; cwe?: string[] };
        if (!result.cve && entry.url) {
          const cveMatch = entry.url.match(/(CVE-\d{4}-\d+)/i);
          if (cveMatch) result.cve = cveMatch[1].toUpperCase();
        }
        if (entry.cwe && Array.isArray(entry.cwe) && entry.cwe.length > 0) {
          result.cwe = entry.cwe;
        }
      }
    }
  }

  return result;
}

/** Parses `npm audit --json` output into structured vulnerability data with severity breakdown. */
export function parseAuditJson(jsonStr: string): NpmAudit {
  const data = JSON.parse(jsonStr);

  // npm audit --json returns { vulnerabilities: { [name]: { ... } }, metadata: { ... } }
  const vulns = data.vulnerabilities ?? {};
  const vulnerabilities = Object.entries(vulns).map(([name, raw]) => {
    const v = raw as NpmAuditVulnEntry;
    const url = (v.via?.[0] as { url?: string })?.url;
    const { cve, cwe } = extractCve(v.via, url);
    return {
      name,
      severity: (v.severity ?? "info") as NpmAudit["vulnerabilities"][number]["severity"],
      title: v.title ?? (v.via?.[0] as { title?: string })?.title ?? "Unknown",
      url,
      range: v.range,
      fixAvailable: !!v.fixAvailable,
      ...(cve ? { cve } : {}),
      ...(cwe ? { cwe } : {}),
    };
  });

  const meta = data.metadata?.vulnerabilities ?? {};
  const summary = {
    total: meta.total ?? vulnerabilities.length,
    critical: meta.critical ?? 0,
    high: meta.high ?? 0,
    moderate: meta.moderate ?? 0,
    low: meta.low ?? 0,
    info: meta.info ?? 0,
  };

  return { vulnerabilities, summary };
}

/**
 * Parses `pnpm audit --json` output into structured vulnerability data.
 * pnpm audit --json returns { advisories: { [id]: { ... } }, metadata: { ... } }
 * which differs from npm's { vulnerabilities: { [name]: { ... } } } format.
 */
export function parsePnpmAuditJson(jsonStr: string): NpmAudit {
  const data = JSON.parse(jsonStr);

  // pnpm audit --json may use the npm v7+ format OR the classic advisories format
  // Try npm-compatible format first (pnpm v8+ matches npm's format)
  if (data.vulnerabilities) {
    return parseAuditJson(jsonStr);
  }

  // Classic pnpm/npm v6 advisories format
  const advisories = data.advisories ?? {};
  const vulnerabilities = Object.values(advisories).map((a: unknown) => {
    const adv = a as NpmAuditAdvisory;
    return {
      name: adv.module_name ?? adv.name ?? "unknown",
      severity: (adv.severity ?? "info") as NpmAudit["vulnerabilities"][number]["severity"],
      title: adv.title ?? "Unknown",
      url: adv.url,
      range: adv.vulnerable_versions ?? adv.range,
      fixAvailable: !!adv.patched_versions && adv.patched_versions !== "<0.0.0",
      ...(adv.cves && adv.cves.length > 0 ? { cve: adv.cves[0] } : {}),
      ...(adv.cwe && adv.cwe.length > 0 ? { cwe: adv.cwe } : {}),
    };
  });

  const meta = data.metadata ?? {};
  const summary = {
    total: meta.totalDependencies ? vulnerabilities.length : vulnerabilities.length,
    critical: meta.vulnerabilities?.critical ?? 0,
    high: meta.vulnerabilities?.high ?? 0,
    moderate: meta.vulnerabilities?.moderate ?? 0,
    low: meta.vulnerabilities?.low ?? 0,
    info: meta.vulnerabilities?.info ?? 0,
  };

  return { vulnerabilities, summary };
}

/** Parses `npm outdated --json` or `pnpm outdated --json` output into structured data with current, wanted, and latest versions. */
export function parseOutdatedJson(jsonStr: string, _pm: PackageManager = "npm"): NpmOutdated {
  const data = JSON.parse(jsonStr);

  // pnpm outdated --json returns an object keyed by package name, same as npm
  // but may also return an array in some versions
  if (Array.isArray(data)) {
    // pnpm outdated --json may return an array of { name, current, wanted, latest }
    const packages = data.map((v: unknown) => {
      const entry = v as NpmOutdatedEntry;
      return {
        name: entry.packageName ?? entry.name ?? "unknown",
        current: entry.current ?? "N/A",
        wanted: entry.wanted ?? "N/A",
        latest: entry.latest ?? "N/A",
        ...(entry.dependencyType ? { type: entry.dependencyType } : {}),
      };
    });
    return { packages, total: packages.length };
  }

  // npm-style { [name]: { current, wanted, latest, ... } }
  const packages = Object.entries(data).map(([name, v]: [string, unknown]) => {
    const entry = v as NpmOutdatedEntry;
    return {
      name,
      current: entry.current ?? "N/A",
      wanted: entry.wanted ?? "N/A",
      latest: entry.latest ?? "N/A",
      ...(entry.location ? { location: entry.location } : {}),
      ...(entry.type
        ? { type: entry.type }
        : entry.dependencyType
          ? { type: entry.dependencyType }
          : {}),
    };
  });

  return { packages, total: packages.length };
}

/**
 * Parses `npm list --json` output into a structured dependency list with versions and types.
 * Gap #177: adds `type` field to distinguish dependency, devDependency, optionalDependency.
 */
export function parseListJson(jsonStr: string): NpmList {
  const data = JSON.parse(jsonStr);

  function parseDeps(
    raw: Record<string, unknown> | undefined,
    depType?: "dependency" | "devDependency" | "optionalDependency",
  ): Record<string, NpmListDep> {
    const deps: Record<string, NpmListDep> = {};
    for (const [name, v] of Object.entries(raw ?? {})) {
      const dep = v as NpmListRawDep;
      const entry: NpmListDep = {
        version: dep.version ?? "unknown",
      };
      if (depType) {
        entry.type = depType;
      }
      if (dep.dependencies && Object.keys(dep.dependencies).length > 0) {
        entry.dependencies = parseDeps(dep.dependencies as Record<string, unknown>);
      }
      deps[name] = entry;
    }
    return deps;
  }

  // npm list --json puts all deps under "dependencies" at depth=0
  // but when using --long or looking at the package.json structure, we can
  // distinguish types by checking devDependencies and optionalDependencies
  const allDeps: Record<string, NpmListDep> = {};

  // If the JSON has separate devDependencies/optionalDependencies keys (some formats do),
  // parse them with type annotations
  if (data.devDependencies && typeof data.devDependencies === "object") {
    const devDeps = parseDeps(data.devDependencies as Record<string, unknown>, "devDependency");
    Object.assign(allDeps, devDeps);
  }

  if (data.optionalDependencies && typeof data.optionalDependencies === "object") {
    const optDeps = parseDeps(
      data.optionalDependencies as Record<string, unknown>,
      "optionalDependency",
    );
    Object.assign(allDeps, optDeps);
  }

  // Parse main dependencies (these are production dependencies if devDependencies
  // is separately listed, otherwise we can't distinguish)
  if (data.dependencies) {
    const hasSeparateTypes = !!data.devDependencies || !!data.optionalDependencies;
    const mainDeps = parseDeps(
      data.dependencies as Record<string, unknown>,
      hasSeparateTypes ? "dependency" : undefined,
    );
    // Main deps override: if a dep already appeared in devDeps, keep the main classification
    Object.assign(allDeps, mainDeps);
  }

  // Count all deps including nested
  function countDeps(d: Record<string, NpmListDep>): number {
    let count = 0;
    for (const dep of Object.values(d)) {
      count++;
      if (dep.dependencies) {
        count += countDeps(dep.dependencies);
      }
    }
    return count;
  }

  return {
    name: data.name ?? "unknown",
    version: data.version ?? "0.0.0",
    dependencies: allDeps,
    total: countDeps(allDeps),
  };
}

/**
 * Parses pnpm workspace list output.
 * Gap #176: pnpm `list --json` returns an array of workspace projects.
 * Previously we only used parsed[0], discarding other workspace projects.
 * Now we merge dependencies from all workspace projects.
 */
export function parsePnpmListJson(jsonStr: string): NpmList {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return parseListJson(
      JSON.stringify(parsed ?? { name: "unknown", version: "0.0.0", dependencies: {} }),
    );
  }

  if (parsed.length === 1) {
    return parseListJson(JSON.stringify(parsed[0]));
  }

  // Multiple workspace projects: merge them all
  // Use the first project's name/version as the root, aggregate deps from all
  const root = parsed[0];
  const mergedDeps: Record<string, unknown> = {};
  const mergedDevDeps: Record<string, unknown> = {};
  const mergedOptDeps: Record<string, unknown> = {};

  for (const project of parsed) {
    if (project.dependencies) {
      for (const [name, dep] of Object.entries(project.dependencies as Record<string, unknown>)) {
        if (!mergedDeps[name]) {
          mergedDeps[name] = dep;
        }
      }
    }
    if (project.devDependencies) {
      for (const [name, dep] of Object.entries(
        project.devDependencies as Record<string, unknown>,
      )) {
        if (!mergedDevDeps[name]) {
          mergedDevDeps[name] = dep;
        }
      }
    }
    if (project.optionalDependencies) {
      for (const [name, dep] of Object.entries(
        project.optionalDependencies as Record<string, unknown>,
      )) {
        if (!mergedOptDeps[name]) {
          mergedOptDeps[name] = dep;
        }
      }
    }
  }

  const merged = {
    name: root.name ?? "workspace",
    version: root.version ?? "0.0.0",
    dependencies: mergedDeps,
    ...(Object.keys(mergedDevDeps).length > 0 ? { devDependencies: mergedDevDeps } : {}),
    ...(Object.keys(mergedOptDeps).length > 0 ? { optionalDependencies: mergedOptDeps } : {}),
  };

  return parseListJson(JSON.stringify(merged));
}

/** Parses `npm run <script>` output into structured data with exit code, stdout/stderr, and duration. */
export function parseRunOutput(
  script: string,
  exitCode: number,
  stdout: string,
  stderr: string,
  duration: number,
  timedOut: boolean = false,
): NpmRun {
  return {
    script,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    success: exitCode === 0 && !timedOut,
    duration,
    timedOut,
  };
}

/**
 * Parses test framework output to extract test counts (best-effort).
 * Gap #182: Supports jest, vitest, mocha, and tap output patterns.
 */
export function parseTestResults(stdout: string, stderr: string): NpmTest["testResults"] {
  const combined = stdout + "\n" + stderr;

  // Jest/Vitest pattern: "Tests:  3 failed, 42 passed, 2 skipped, 47 total"
  // Also matches: "Tests:  42 passed, 42 total"
  const jestMatch = combined.match(
    /Tests:\s+(?:(\d+)\s+failed,?\s*)?(?:(\d+)\s+passed,?\s*)?(?:(\d+)\s+(?:skipped|pending|todo),?\s*)?(\d+)\s+total/,
  );
  if (jestMatch) {
    const failed = parseInt(jestMatch[1] ?? "0", 10);
    const passed = parseInt(jestMatch[2] ?? "0", 10);
    const skipped = parseInt(jestMatch[3] ?? "0", 10);
    const total = parseInt(jestMatch[4], 10);
    return { passed, failed, skipped, total };
  }

  // Vitest v2 pattern: "✓ 42 passed" / "× 3 failed" / "↓ 2 skipped" with summary
  // Or: "Test Files  1 passed (1)" and "Tests  42 passed | 3 failed (45)"
  const vitestTestsMatch = combined.match(
    /Tests\s+(?:(\d+)\s+passed)?\s*(?:\|\s*(\d+)\s+failed)?\s*(?:\|\s*(\d+)\s+skipped)?\s*\((\d+)\)/,
  );
  if (vitestTestsMatch) {
    const passed = parseInt(vitestTestsMatch[1] ?? "0", 10);
    const failed = parseInt(vitestTestsMatch[2] ?? "0", 10);
    const skipped = parseInt(vitestTestsMatch[3] ?? "0", 10);
    const total = parseInt(vitestTestsMatch[4], 10);
    return { passed, failed, skipped, total };
  }

  // Mocha pattern: "42 passing" / "3 failing" / "2 pending"
  const mochaPassingMatch = combined.match(/(\d+)\s+passing/);
  const mochaFailingMatch = combined.match(/(\d+)\s+failing/);
  const mochaPendingMatch = combined.match(/(\d+)\s+pending/);
  if (mochaPassingMatch || mochaFailingMatch) {
    const passed = parseInt(mochaPassingMatch?.[1] ?? "0", 10);
    const failed = parseInt(mochaFailingMatch?.[1] ?? "0", 10);
    const skipped = parseInt(mochaPendingMatch?.[1] ?? "0", 10);
    return { passed, failed, skipped, total: passed + failed + skipped };
  }

  // TAP pattern: "# tests 47" / "# pass 42" / "# fail 3" / "# skip 2"
  const tapTestsMatch = combined.match(/#\s+tests\s+(\d+)/);
  const tapPassMatch = combined.match(/#\s+pass\s+(\d+)/);
  const tapFailMatch = combined.match(/#\s+fail\s+(\d+)/);
  const tapSkipMatch = combined.match(/#\s+skip\s+(\d+)/);
  if (tapTestsMatch) {
    const total = parseInt(tapTestsMatch[1], 10);
    const passed = parseInt(tapPassMatch?.[1] ?? "0", 10);
    const failed = parseInt(tapFailMatch?.[1] ?? "0", 10);
    const skipped = parseInt(tapSkipMatch?.[1] ?? "0", 10);
    return { passed, failed, skipped, total };
  }

  return undefined;
}

/** Parses `npm test` output into structured data with exit code, stdout/stderr, and duration. */
export function parseTestOutput(
  exitCode: number,
  stdout: string,
  stderr: string,
  duration: number,
): NpmTest {
  const testResults = parseTestResults(stdout, stderr);

  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    success: exitCode === 0,
    duration,
    ...(testResults ? { testResults } : {}),
  };
}

/** Parses `npm init` result by reading the generated package.json. */
export function parseInitOutput(
  success: boolean,
  packageName: string,
  version: string,
  packageJsonPath: string,
  stderr?: string,
): NpmInit {
  const trimmed = stderr?.trim();
  return {
    success,
    packageName,
    version,
    path: packageJsonPath,
    ...(trimmed ? { stderr: trimmed } : {}),
  };
}

/** Parses `npm info <package> --json` output into structured package metadata. */
export function parseInfoJson(jsonStr: string): NpmInfo {
  const data = JSON.parse(jsonStr);

  const result: NpmInfo = {
    name: data.name ?? "unknown",
    version: data.version ?? "0.0.0",
    description: data.description ?? "",
  };

  if (data.homepage) result.homepage = data.homepage;
  if (data.license) result.license = data.license;
  if (data.dependencies && Object.keys(data.dependencies).length > 0) {
    result.dependencies = data.dependencies;
  }
  if (data.dist?.tarball) {
    result.dist = {
      tarball: data.dist.tarball,
      ...(data.dist.integrity ? { integrity: data.dist.integrity } : {}),
    };
  }
  if (data.engines && Object.keys(data.engines).length > 0) {
    result.engines = data.engines;
  }
  if (data.peerDependencies && Object.keys(data.peerDependencies).length > 0) {
    result.peerDependencies = data.peerDependencies;
  }
  if (data.deprecated) {
    result.deprecated =
      typeof data.deprecated === "string" ? data.deprecated : "This package is deprecated";
  }
  if (data.repository) {
    if (typeof data.repository === "string") {
      result.repository = { url: data.repository };
    } else if (typeof data.repository === "object") {
      result.repository = {
        ...(data.repository.type ? { type: data.repository.type } : {}),
        ...(data.repository.url ? { url: data.repository.url } : {}),
      };
    }
  }
  if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
    result.keywords = data.keywords;
  }
  if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
    result.versions = data.versions;
  }

  return result;
}

/**
 * Parses `yarn audit --json` output into structured vulnerability data.
 * Yarn Classic (v1) outputs NDJSON (one JSON object per line) with type "auditAdvisory" entries.
 * Yarn Berry (v2+) outputs a single JSON object similar to npm v7+ format.
 */
export function parseYarnAuditJson(jsonStr: string): NpmAudit {
  // Try single-object JSON first (Yarn Berry format, similar to npm v7+)
  try {
    const data = JSON.parse(jsonStr);
    if (data.vulnerabilities) {
      return parseAuditJson(jsonStr);
    }
    // Yarn Berry may use advisories format
    if (data.advisories) {
      return parsePnpmAuditJson(jsonStr);
    }
  } catch {
    // Not valid single JSON — likely Yarn Classic NDJSON
  }

  // Yarn Classic NDJSON: each line is a JSON object
  const vulnerabilities: NpmAudit["vulnerabilities"] = [];
  const seen = new Set<string>();
  let summaryTotal = 0;
  let critical = 0;
  let high = 0;
  let moderate = 0;
  let low = 0;
  let info = 0;

  for (const line of jsonStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.type === "auditAdvisory" && entry.data?.advisory) {
        const adv = entry.data.advisory;
        const name = adv.module_name ?? "unknown";
        // Deduplicate by advisory id
        const id = String(adv.id ?? name);
        if (seen.has(id)) continue;
        seen.add(id);

        vulnerabilities.push({
          name,
          severity: adv.severity ?? "info",
          title: adv.title ?? "Unknown",
          url: adv.url,
          range: adv.vulnerable_versions,
          fixAvailable: !!adv.patched_versions && adv.patched_versions !== "<0.0.0",
          ...(adv.cves && adv.cves.length > 0 ? { cve: adv.cves[0] } : {}),
          ...(adv.cwe && adv.cwe.length > 0 ? { cwe: adv.cwe } : {}),
        });
      } else if (entry.type === "auditSummary" && entry.data) {
        const v = entry.data.vulnerabilities ?? {};
        summaryTotal =
          (v.critical ?? 0) + (v.high ?? 0) + (v.moderate ?? 0) + (v.low ?? 0) + (v.info ?? 0);
        critical = v.critical ?? 0;
        high = v.high ?? 0;
        moderate = v.moderate ?? 0;
        low = v.low ?? 0;
        info = v.info ?? 0;
      }
    } catch {
      // skip non-JSON lines
    }
  }

  return {
    vulnerabilities,
    summary: {
      total: summaryTotal || vulnerabilities.length,
      critical,
      high,
      moderate,
      low,
      info,
    },
  };
}

/**
 * Parses `yarn list --json` output into structured dependency data.
 * Yarn Classic outputs a JSON object with { type: "tree", data: { trees: [...] } }.
 * Yarn Berry outputs a different format — we handle both.
 */
export function parseYarnListJson(jsonStr: string): NpmList {
  // Yarn Classic NDJSON: may have multiple lines
  for (const line of jsonStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const data = JSON.parse(trimmed);
      // Yarn Classic: { type: "tree", data: { type: "list", trees: [...] } }
      if (data.type === "tree" && data.data?.trees) {
        const trees: YarnTreeNode[] = data.data.trees;
        const deps: Record<string, NpmListDep> = {};

        function parseTreeNode(node: YarnTreeNode): [string, NpmListDep] {
          // name is "pkg@version"
          const nameStr = node.name ?? "";
          const atIdx = nameStr.lastIndexOf("@");
          const name = atIdx > 0 ? nameStr.slice(0, atIdx) : nameStr;
          const version = atIdx > 0 ? nameStr.slice(atIdx + 1) : "unknown";
          const entry: NpmListDep = { version };
          if (node.children && node.children.length > 0) {
            entry.dependencies = {};
            for (const child of node.children) {
              const [childName, childDep] = parseTreeNode(child);
              entry.dependencies[childName] = childDep;
            }
          }
          return [name, entry];
        }

        for (const tree of trees) {
          const [name, dep] = parseTreeNode(tree);
          deps[name] = dep;
        }

        function countDeps(d: Record<string, NpmListDep>): number {
          let count = 0;
          for (const dep of Object.values(d)) {
            count++;
            if (dep.dependencies) count += countDeps(dep.dependencies);
          }
          return count;
        }

        return {
          name: "project",
          version: "0.0.0",
          dependencies: deps,
          total: countDeps(deps),
        };
      }

      // Yarn Berry / npm-compatible format
      if (data.name || data.dependencies) {
        return parseListJson(JSON.stringify(data));
      }
    } catch {
      // skip non-JSON lines
    }
  }

  // Fallback: try parsing as plain JSON (npm-compatible)
  try {
    return parseListJson(jsonStr);
  } catch {
    return { name: "unknown", version: "0.0.0", dependencies: {}, total: 0 };
  }
}

/**
 * Parses `yarn outdated --json` output into structured outdated data.
 * Yarn Classic outputs NDJSON with { type: "table", data: { head: [...], body: [...] } }.
 * Yarn Berry may output npm-compatible JSON.
 */
export function parseYarnOutdatedJson(jsonStr: string): NpmOutdated {
  // Try npm-compatible format first
  try {
    const data = JSON.parse(jsonStr);
    // If it looks like npm format (object keyed by package name), reuse that parser
    if (!data.type && !Array.isArray(data)) {
      return parseOutdatedJson(jsonStr);
    }
    if (Array.isArray(data)) {
      return parseOutdatedJson(jsonStr);
    }
  } catch {
    // Not single JSON; likely NDJSON
  }

  // Yarn Classic NDJSON table format
  const packages: NpmOutdated["packages"] = [];
  for (const line of jsonStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.type === "table" && entry.data?.body) {
        // head: ["Package", "Current", "Wanted", "Latest", "Package Type", "URL"]
        // body: [["pkg", "1.0.0", "1.1.0", "2.0.0", "dependencies", "..."]]
        for (const row of entry.data.body) {
          packages.push({
            name: row[0] ?? "unknown",
            current: row[1] ?? "N/A",
            wanted: row[2] ?? "N/A",
            latest: row[3] ?? "N/A",
            ...(row[4] ? { type: row[4] } : {}),
          });
        }
      }
    } catch {
      // skip
    }
  }

  return { packages, total: packages.length };
}

/** Parses `npm search <query> --json` output into structured search results. */
export function parseSearchJson(jsonStr: string): NpmSearch {
  const data = JSON.parse(jsonStr);

  // npm search --json returns an array of package objects
  const arr = Array.isArray(data) ? data : [];
  const packages = arr.map((pkg: unknown) => {
    const p = pkg as NpmSearchEntry;
    const result: NpmSearch["packages"][number] = {
      name: p.name ?? "unknown",
      version: p.version ?? "0.0.0",
      description: p.description ?? "",
    };

    if (typeof p.author === "object" && p.author?.name) {
      result.author = p.author.name;
    } else if (p.author && typeof p.author === "string") {
      result.author = p.author;
    }

    if (p.date) result.date = p.date;
    if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
      result.keywords = p.keywords;
    }
    if (p.score?.final !== undefined) {
      result.score = p.score.final;
    }
    if (p.links) {
      const links: { npm?: string; homepage?: string; repository?: string } = {};
      if (p.links.npm) links.npm = p.links.npm;
      if (p.links.homepage) links.homepage = p.links.homepage;
      if (p.links.repository) links.repository = p.links.repository;
      if (Object.keys(links).length > 0) result.links = links;
    }
    if (p.scope && p.scope !== "unscoped") {
      result.scope = p.scope;
    }

    return result;
  });

  return { packages, total: packages.length };
}

/**
 * Parses `nvm list` output into structured data.
 * Gap #179: Now includes LTS tags per version.
 *
 * nvm-windows output looks like:
 *   * 20.11.1 (Currently using 64-bit executable)
 *     18.19.0
 *     16.20.2
 *
 * Unix nvm output looks like:
 *   ->     v20.11.1
 *          v18.19.0
 *          v16.20.2
 *   default -> 20.11.1 (-> v20.11.1)
 *   lts/* -> lts/iron (-> v20.11.1)
 *   lts/hydrogen -> v18.19.0
 *   lts/iron -> v20.11.1
 *
 * @param listOutput - stdout from `nvm list`
 * @param currentOutput - stdout from `nvm current` (used as fallback for current version)
 */
export function parseNvmOutput(listOutput: string, currentOutput: string): NvmResult {
  const versions: NvmResult["versions"] = [];
  let current = "";
  let defaultVersion: string | undefined;

  // First pass: collect LTS mappings from alias lines
  const ltsMap = new Map<string, string>(); // version -> lts name
  for (const line of listOutput.split("\n")) {
    const trimmed = line.trim();
    // Match "lts/hydrogen -> v18.19.0" or "lts/iron -> v20.11.1 (-> v20.11.1)"
    const ltsMatch = trimmed.match(/^lts\/(\w+)\s+->\s+v?([\d.]+)/);
    if (ltsMatch) {
      const ltsName = ltsMatch[1];
      const ver = normalizeVersion(ltsMatch[2]);
      ltsMap.set(ver, ltsName);
    }
  }

  for (const line of listOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "No installations recognized.") continue;

    // nvm-windows: "* 20.11.1 (Currently using ...)" marks the current version
    const winCurrentMatch = trimmed.match(/^\*\s+([\d.]+)/);
    if (winCurrentMatch) {
      const ver = normalizeVersion(winCurrentMatch[1]);
      current = ver;
      const lts = ltsMap.get(ver);
      versions.push({ version: ver, ...(lts ? { lts } : {}) });
      continue;
    }

    // Unix nvm: "->     v20.11.1" marks the current version
    const unixCurrentMatch = trimmed.match(/^->\s+v?([\d.]+)/);
    if (unixCurrentMatch) {
      const ver = normalizeVersion(unixCurrentMatch[1]);
      current = ver;
      const lts = ltsMap.get(ver);
      versions.push({ version: ver, ...(lts ? { lts } : {}) });
      continue;
    }

    // Unix nvm: "default -> 20.11.1 (-> v20.11.1)" or "default -> 20.11.1"
    const defaultMatch = trimmed.match(/^default\s+->\s+v?([\d.]+)/);
    if (defaultMatch) {
      defaultVersion = normalizeVersion(defaultMatch[1]);
      continue;
    }

    // Skip other alias lines like "node -> stable", "lts/* -> ...", etc.
    if (trimmed.includes("->")) continue;

    // Plain version line: "  18.19.0" or "  v18.19.0" or "system"
    const versionMatch = trimmed.match(/^v?([\d.]+)$/);
    if (versionMatch) {
      const ver = normalizeVersion(versionMatch[1]);
      const lts = ltsMap.get(ver);
      versions.push({ version: ver, ...(lts ? { lts } : {}) });
    }
  }

  // Fallback: use `nvm current` output if we didn't detect current from list
  if (!current && currentOutput) {
    const currentMatch = currentOutput.trim().match(/v?([\d.]+)/);
    if (currentMatch) {
      current = normalizeVersion(currentMatch[1]);
    }
  }

  return {
    current: current || "none",
    versions,
    ...(defaultVersion ? { default: defaultVersion } : {}),
  };
}

/**
 * Parses `nvm ls-remote` output into structured data.
 * Gap #178: New parser for listing available remote Node.js versions.
 *
 * Unix nvm ls-remote output looks like:
 *   v18.0.0
 *   v18.1.0
 *   ...
 *   v18.19.0   (LTS: Hydrogen)
 *   v20.0.0
 *   v20.11.1   (Latest LTS: Iron)
 *
 * We limit to the last N major versions by default.
 */
export function parseNvmLsRemoteOutput(
  stdout: string,
  majorVersionsLimit: number = 4,
): NvmLsRemote {
  const allVersions: NvmLsRemote["versions"] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match version with optional LTS tag: "v20.11.1   (LTS: Iron)" or "v20.11.1   (Latest LTS: Iron)"
    const match = trimmed.match(/^v?([\d.]+)\s*(?:\((?:Latest )?LTS:\s*(\w+)\))?/);
    if (match) {
      const version = normalizeVersion(match[1]);
      const lts = match[2]?.toLowerCase();
      allVersions.push({ version, ...(lts ? { lts } : {}) });
    }
  }

  // Filter to last N major versions
  if (majorVersionsLimit > 0 && allVersions.length > 0) {
    const majors = new Set<number>();
    for (const v of allVersions) {
      const majorMatch = v.version.match(/^v?(\d+)\./);
      if (majorMatch) {
        majors.add(parseInt(majorMatch[1], 10));
      }
    }
    const sortedMajors = [...majors].sort((a, b) => b - a);
    const allowedMajors = new Set(sortedMajors.slice(0, majorVersionsLimit));

    const filtered = allVersions.filter((v) => {
      const majorMatch = v.version.match(/^v?(\d+)\./);
      return majorMatch ? allowedMajors.has(parseInt(majorMatch[1], 10)) : false;
    });

    return { versions: filtered, total: filtered.length };
  }

  return { versions: allVersions, total: allVersions.length };
}

/**
 * Parses `nvm exec` output into structured data.
 * Gap #180: New parser for running commands with a specific Node.js version.
 */
export function parseNvmExecOutput(
  version: string,
  exitCode: number,
  stdout: string,
  stderr: string,
): NvmExec {
  return {
    version: normalizeVersion(version.replace(/^v/, "")),
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    success: exitCode === 0,
  };
}

/** Ensures version strings have a "v" prefix. */
function normalizeVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
