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

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");
const ROOT_CHANGELOG = resolve(ROOT, "CHANGELOG.md");

const BEGIN_MARKER = "<!-- BEGIN AGGREGATED CHANGELOG -->";
const END_MARKER = "<!-- END AGGREGATED CHANGELOG -->";

/** Package directories that may contain a CHANGELOG.md. */
const PACKAGES: { dir: string; name: string }[] = [
  { dir: "packages/server-build", name: "@paretools/build" },
  { dir: "packages/server-cargo", name: "@paretools/cargo" },
  { dir: "packages/server-docker", name: "@paretools/docker" },
  { dir: "packages/server-git", name: "@paretools/git" },
  { dir: "packages/server-go", name: "@paretools/go" },
  { dir: "packages/server-lint", name: "@paretools/lint" },
  { dir: "packages/server-npm", name: "@paretools/npm" },
  { dir: "packages/server-python", name: "@paretools/python" },
  { dir: "packages/server-test", name: "@paretools/test" },
  { dir: "packages/shared", name: "@paretools/shared" },
];

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
  // Group by version
  const byVersion = new Map<string, VersionEntry[]>();
  for (const entry of allEntries) {
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
      lines.push(`#### ${entry.packageName}`, "");
      if (entry.body) {
        lines.push(entry.body, "");
      }
    }

    sections.push(lines.join("\n"));
  }

  return sections.join("\n---\n\n");
}

function main() {
  // Read all package changelogs
  const allEntries: VersionEntry[] = [];
  let found = 0;
  let skipped = 0;

  for (const pkg of PACKAGES) {
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

  const rootContent = readFileSync(ROOT_CHANGELOG, "utf-8");
  const beginIdx = rootContent.indexOf(BEGIN_MARKER);
  const endIdx = rootContent.indexOf(END_MARKER);

  if (beginIdx === -1 || endIdx === -1) {
    console.error(`Error: Could not find sentinel markers in ${ROOT_CHANGELOG}.`);
    console.error(`Expected: ${BEGIN_MARKER} and ${END_MARKER}`);
    process.exit(1);
  }

  const before = rootContent.slice(0, beginIdx + BEGIN_MARKER.length);
  const after = rootContent.slice(endIdx);
  const newContent = `${before}\n\n${aggregated}\n\n${after}`;

  writeFileSync(ROOT_CHANGELOG, newContent, "utf-8");

  console.log(`\nAggregated ${allEntries.length} entries from ${found} packages into CHANGELOG.md`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} packages without changelogs.`);
  }
}

main();
