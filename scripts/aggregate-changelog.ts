#!/usr/bin/env npx tsx
/**
 * Aggregate per-package CHANGELOGs into the root CHANGELOG.md.
 *
 * Reads each package's CHANGELOG.md, extracts version entries, groups them
 * by version number, and writes the combined result between the sentinel
 * markers in the root CHANGELOG.md.
 *
 * Usage: pnpm changelog
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");
const ROOT_CHANGELOG = resolve(ROOT, "CHANGELOG.md");

const BEGIN_MARKER = "<!-- BEGIN AGGREGATED CHANGELOG -->";
const END_MARKER = "<!-- END AGGREGATED CHANGELOG -->";
const TABLE_BEGIN_MARKER = "<!-- BEGIN PACKAGE TABLE -->";
const TABLE_END_MARKER = "<!-- END PACKAGE TABLE -->";

/**
 * Every published workspace package (non-private, under packages/), sorted by
 * name. Discovered rather than hard-coded: a fixed list went stale and left
 * 20 of 31 packages, including @paretools/github, out of the root changelog.
 */
function discoverPackages(): { dir: string; name: string }[] {
  const packagesDir = resolve(ROOT, "packages");
  const found: { dir: string; name: string }[] = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = resolve(packagesDir, entry.name, "package.json");
    if (!existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
      name?: string;
      private?: boolean;
    };
    if (!pkg.name || pkg.private) continue;
    found.push({ dir: `packages/${entry.name}`, name: pkg.name });
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Remove changesets' "- Updated dependencies [...]:" bullets (and their
 * indented sub-list) and "No changes in this release." placeholders, then any
 * "### <type> Changes" heading left with nothing
 * under it. With fixed versioning every package gets such a bullet on every
 * release, which buried the real changes in the aggregated view.
 */
function stripDependencyBumps(body: string): string {
  const out: string[] = [];
  let skippingDeps = false;
  for (const line of body.split("\n")) {
    if (/^- Updated dependencies\b/.test(line)) {
      skippingDeps = true;
      continue;
    }
    if (skippingDeps && /^\s+- /.test(line)) continue;
    skippingDeps = false;
    // Placeholder that changesets writes for a fixed-group package with no changeset.
    if (line.trim() === "No changes in this release.") continue;
    out.push(line);
  }

  // Drop "### X Changes" headings whose section is now empty.
  const result: string[] = [];
  for (let i = 0; i < out.length; i++) {
    if (/^### /.test(out[i])) {
      let j = i + 1;
      while (j < out.length && out[j].trim() === "") j++;
      if (j >= out.length || /^### /.test(out[j])) {
        i = j - 1;
        continue;
      }
    }
    result.push(out[i]);
  }
  return result.join("\n").trim();
}

interface VersionEntry {
  version: string;
  packageName: string;
  body: string;
}

/**
 * Parse a changesets-generated CHANGELOG.md into version entries.
 *
 * Each version section starts with `## <version>` (h2). Everything until the
 * next h2 (or EOF) is that version's body.
 */
function parseChangelog(content: string, packageName: string): VersionEntry[] {
  const entries: VersionEntry[] = [];
  const lines = content.split("\n");

  let currentVersion: string | null = null;
  let bodyLines: string[] = [];

  for (const line of lines) {
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+.*)$/);
    if (versionMatch) {
      // Save previous entry
      if (currentVersion) {
        entries.push({
          version: currentVersion,
          packageName,
          body: bodyLines.join("\n").trim(),
        });
      }
      currentVersion = versionMatch[1];
      bodyLines = [];
    } else if (currentVersion) {
      bodyLines.push(line);
    }
  }

  // Save last entry
  if (currentVersion) {
    entries.push({
      version: currentVersion,
      packageName,
      body: bodyLines.join("\n").trim(),
    });
  }

  return entries;
}

/**
 * Group entries by version, then format as markdown.
 *
 * Versions are sorted in descending semver order. Within each version,
 * packages are listed alphabetically.
 */
function formatAggregated(allEntries: VersionEntry[]): string {
  // Group by version, keeping only entries with a real change. Changesets'
  // "### Patch Changes" headings sit under our "#### <package>" headings, so
  // demote them to h5 to keep the outline nested.
  const byVersion = new Map<string, VersionEntry[]>();
  for (const raw of allEntries) {
    const body = stripDependencyBumps(raw.body).replace(/^### /gm, "##### ");
    if (!body) continue;
    const entry = { ...raw, body };
    const group = byVersion.get(entry.version) ?? [];
    group.push(entry);
    byVersion.set(entry.version, group);
  }

  // Sort versions descending (simple semver sort)
  const sortedVersions = [...byVersion.keys()].sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
    }
    return 0;
  });

  const sections: string[] = [];

  for (const version of sortedVersions) {
    const entries = byVersion.get(version)!;
    entries.sort((a, b) => a.packageName.localeCompare(b.packageName));

    const lines: string[] = [`### ${version}`, ""];

    for (const entry of entries) {
      lines.push(`#### ${entry.packageName}`, "", entry.body, "");
    }

    sections.push(lines.join("\n"));
  }

  return sections.join("\n---\n\n");
}

/** Markdown table linking each package's npm page and per-package changelog. */
function formatPackageTable(packages: { dir: string; name: string }[]): string {
  const rows = packages.map((p) => [
    `[\`${p.name}\`](https://www.npmjs.com/package/${p.name})`,
    `[${p.dir}/CHANGELOG.md](${p.dir}/CHANGELOG.md)`,
  ]);
  const w0 = Math.max("Package".length, ...rows.map((r) => r[0].length));
  const w1 = Math.max("Changelog".length, ...rows.map((r) => r[1].length));
  const line = (a: string, b: string) => `| ${a.padEnd(w0)} | ${b.padEnd(w1)} |`;
  return [
    line("Package", "Changelog"),
    `| ${"-".repeat(w0)} | ${"-".repeat(w1)} |`,
    ...rows.map((r) => line(r[0], r[1])),
  ].join("\n");
}

/** Replace the text between two markers, or exit with an error if either is missing. */
function replaceBetween(content: string, begin: string, end: string, inner: string): string {
  const beginIdx = content.indexOf(begin);
  const endIdx = content.indexOf(end);
  if (beginIdx === -1 || endIdx === -1) {
    console.error(`Error: Could not find sentinel markers in ${ROOT_CHANGELOG}.`);
    console.error(`Expected: ${begin} and ${end}`);
    process.exit(1);
  }
  return `${content.slice(0, beginIdx + begin.length)}\n\n${inner}\n\n${content.slice(endIdx)}`;
}

function main() {
  // Read all package changelogs
  const allEntries: VersionEntry[] = [];
  let found = 0;
  let skipped = 0;

  const packages = discoverPackages();
  for (const pkg of packages) {
    const changelogPath = resolve(ROOT, pkg.dir, "CHANGELOG.md");
    if (!existsSync(changelogPath)) {
      console.log(`  skip: ${pkg.name} (no CHANGELOG.md)`);
      skipped++;
      continue;
    }

    const content = readFileSync(changelogPath, "utf-8");
    const entries = parseChangelog(content, pkg.name);
    allEntries.push(...entries);
    found++;
    console.log(`  read: ${pkg.name} (${entries.length} version(s))`);
  }

  if (allEntries.length === 0) {
    console.log("\nNo changelog entries found. Nothing to aggregate.");
    return;
  }

  // Format the aggregated content
  const aggregated = formatAggregated(allEntries);

  // Read root CHANGELOG.md and replace between markers
  if (!existsSync(ROOT_CHANGELOG)) {
    console.error(`Error: ${ROOT_CHANGELOG} not found.`);
    process.exit(1);
  }

  let content = readFileSync(ROOT_CHANGELOG, "utf-8");
  content = replaceBetween(
    content,
    TABLE_BEGIN_MARKER,
    TABLE_END_MARKER,
    formatPackageTable(packages),
  );
  content = replaceBetween(content, BEGIN_MARKER, END_MARKER, aggregated);
  writeFileSync(ROOT_CHANGELOG, content, "utf-8");

  console.log(`\nAggregated ${allEntries.length} entries from ${found} packages into CHANGELOG.md`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} packages without changelogs.`);
  }
}

main();
