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

/** Parses `npm install` summary output into structured data with package counts and vulnerability info. */
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

/** Parses `npm outdated --json` output into structured data with current, wanted, and latest versions. */
export function parseOutdatedJson(jsonStr: string): NpmOutdated {
  const data = JSON.parse(jsonStr);

  // npm outdated --json returns { [name]: { current, wanted, latest, ... } }
  const packages = Object.entries(data).map(([name, v]: [string, any]) => ({
    name,
    current: v.current ?? "N/A",
    wanted: v.wanted ?? "N/A",
    latest: v.latest ?? "N/A",
    ...(v.location ? { location: v.location } : {}),
    ...(v.type ? { type: v.type } : {}),
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
        ...(dep.resolved ? { resolved: dep.resolved } : {}),
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
  if (data.dist) {
    const dist: NpmInfo["dist"] = {};
    if (data.dist.tarball) dist.tarball = data.dist.tarball;
    if (data.dist.fileCount !== undefined) dist.fileCount = data.dist.fileCount;
    if (data.dist.unpackedSize !== undefined) dist.unpackedSize = data.dist.unpackedSize;
    if (Object.keys(dist).length > 0) result.dist = dist;
  }

  return result;
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
