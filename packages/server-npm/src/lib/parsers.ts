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
} from "../schemas/index.js";

import type { PackageManager } from "./detect-pm.js";

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
  const vulnerabilities = Object.entries(vulns).map(([name, v]: [string, any]) => ({
    name,
    severity: v.severity ?? "info",
    title: v.title ?? v.via?.[0]?.title ?? "Unknown",
    url: v.via?.[0]?.url,
    range: v.range,
    fixAvailable: !!v.fixAvailable,
  }));

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
  const vulnerabilities = Object.values(advisories).map((a: any) => ({
    name: a.module_name ?? a.name ?? "unknown",
    severity: a.severity ?? "info",
    title: a.title ?? "Unknown",
    url: a.url,
    range: a.vulnerable_versions ?? a.range,
    fixAvailable: !!a.patched_versions && a.patched_versions !== "<0.0.0",
  }));

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
    const packages = data.map((v: any) => ({
      name: v.packageName ?? v.name ?? "unknown",
      current: v.current ?? "N/A",
      wanted: v.wanted ?? "N/A",
      latest: v.latest ?? "N/A",
      ...(v.dependencyType ? { type: v.dependencyType } : {}),
    }));
    return { packages, total: packages.length };
  }

  // npm-style { [name]: { current, wanted, latest, ... } }
  const packages = Object.entries(data).map(([name, v]: [string, any]) => ({
    name,
    current: v.current ?? "N/A",
    wanted: v.wanted ?? "N/A",
    latest: v.latest ?? "N/A",
    ...(v.location ? { location: v.location } : {}),
    ...(v.type ? { type: v.type } : v.dependencyType ? { type: v.dependencyType } : {}),
  }));

  return { packages, total: packages.length };
}

/** Parses `npm list --json` output into a structured dependency list with versions. */
export function parseListJson(jsonStr: string): NpmList {
  const data = JSON.parse(jsonStr);

  function parseDeps(raw: Record<string, any> | undefined): Record<string, NpmListDep> {
    const deps: Record<string, NpmListDep> = {};
    for (const [name, v] of Object.entries(raw ?? {})) {
      const dep = v as any;
      const entry: NpmListDep = {
        version: dep.version ?? "unknown",
      };
      if (dep.dependencies && Object.keys(dep.dependencies).length > 0) {
        entry.dependencies = parseDeps(dep.dependencies);
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
        const trees: any[] = data.data.trees;
        const deps: Record<string, NpmListDep> = {};

        function parseTreeNode(node: any): [string, NpmListDep] {
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
  const packages = arr.map((pkg: any) => ({
    name: pkg.name ?? "unknown",
    version: pkg.version ?? "0.0.0",
    description: pkg.description ?? "",
    ...(pkg.author?.name
      ? { author: pkg.author.name }
      : pkg.author && typeof pkg.author === "string"
        ? { author: pkg.author }
        : {}),
    ...(pkg.date ? { date: pkg.date } : {}),
  }));

  return { packages, total: packages.length };
}
