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

import type { PackageManager } from "./detect-pm.js";

/** Shape of an npm audit vulnerability entry from `npm audit --json`. */
interface NpmAuditVulnEntry {
  severity?: string;
  title?: string;
  via?: Array<{ title?: string; url?: string }> | unknown[];
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

  return {
    added: parseInt(added ?? "0", 10),
    removed: parseInt(removed ?? "0", 10),
    changed: parseInt(changed ?? "0", 10),
    duration,
    packages: parseInt(packages ?? "0", 10),
    ...(vulnerabilities ? { vulnerabilities } : {}),
    ...(fundingMatch ? { funding: parseInt(fundingMatch[1], 10) } : {}),
  };
}

/** Parses `npm audit --json` output into structured vulnerability data with severity breakdown. */
export function parseAuditJson(jsonStr: string): NpmAudit {
  const data = JSON.parse(jsonStr);

  // npm audit --json returns { vulnerabilities: { [name]: { ... } }, metadata: { ... } }
  const vulns = data.vulnerabilities ?? {};
  const vulnerabilities = Object.entries(vulns).map(([name, raw]) => {
    const v = raw as NpmAuditVulnEntry;
    return {
      name,
      severity: (v.severity ?? "info") as NpmAudit["vulnerabilities"][number]["severity"],
      title: v.title ?? (v.via?.[0] as { title?: string })?.title ?? "Unknown",
      url: (v.via?.[0] as { url?: string })?.url,
      range: v.range,
      fixAvailable: !!v.fixAvailable,
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

/** Parses `npm list --json` output into a structured dependency list with versions. */
export function parseListJson(jsonStr: string): NpmList {
  const data = JSON.parse(jsonStr);

  function parseDeps(raw: Record<string, unknown> | undefined): Record<string, NpmListDep> {
    const deps: Record<string, NpmListDep> = {};
    for (const [name, v] of Object.entries(raw ?? {})) {
      const dep = v as NpmListRawDep;
      const entry: NpmListDep = {
        version: dep.version ?? "unknown",
      };
      if (dep.dependencies && Object.keys(dep.dependencies).length > 0) {
        entry.dependencies = parseDeps(dep.dependencies as Record<string, unknown>);
      }
      deps[name] = entry;
    }
    return deps;
  }

  const deps = parseDeps(data.dependencies);

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
    dependencies: deps,
    total: countDeps(deps),
  };
}

/** Parses `npm run <script>` output into structured data with exit code, stdout/stderr, and duration. */
export function parseRunOutput(
  script: string,
  exitCode: number,
  stdout: string,
  stderr: string,
  duration: number,
): NpmRun {
  return {
    script,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    success: exitCode === 0,
    duration,
  };
}

/** Parses `npm test` output into structured data with exit code, stdout/stderr, and duration. */
export function parseTestOutput(
  exitCode: number,
  stdout: string,
  stderr: string,
  duration: number,
): NpmTest {
  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    success: exitCode === 0,
    duration,
  };
}

/** Parses `npm init` result by reading the generated package.json. */
export function parseInitOutput(
  success: boolean,
  packageName: string,
  version: string,
  packageJsonPath: string,
): NpmInit {
  return {
    success,
    packageName,
    version,
    path: packageJsonPath,
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
    result.dist = { tarball: data.dist.tarball };
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
    return {
      name: p.name ?? "unknown",
      version: p.version ?? "0.0.0",
      description: p.description ?? "",
      ...(typeof p.author === "object" && p.author?.name
        ? { author: p.author.name }
        : p.author && typeof p.author === "string"
          ? { author: p.author }
          : {}),
      ...(p.date ? { date: p.date } : {}),
    };
  });

  return { packages, total: packages.length };
}

/**
 * Parses `nvm list` output into structured data.
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
 *
 * @param listOutput - stdout from `nvm list`
 * @param currentOutput - stdout from `nvm current` (used as fallback for current version)
 */
export function parseNvmOutput(listOutput: string, currentOutput: string): NvmResult {
  const versions: string[] = [];
  let current = "";
  let defaultVersion: string | undefined;

  for (const line of listOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "No installations recognized.") continue;

    // nvm-windows: "* 20.11.1 (Currently using ...)" marks the current version
    const winCurrentMatch = trimmed.match(/^\*\s+([\d.]+)/);
    if (winCurrentMatch) {
      const ver = normalizeVersion(winCurrentMatch[1]);
      current = ver;
      versions.push(ver);
      continue;
    }

    // Unix nvm: "->     v20.11.1" marks the current version
    const unixCurrentMatch = trimmed.match(/^->\s+v?([\d.]+)/);
    if (unixCurrentMatch) {
      const ver = normalizeVersion(unixCurrentMatch[1]);
      current = ver;
      versions.push(ver);
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
      versions.push(normalizeVersion(versionMatch[1]));
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

/** Ensures version strings have a "v" prefix. */
function normalizeVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
