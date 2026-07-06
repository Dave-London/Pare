#!/usr/bin/env npx tsx
/**
 * Sync each package's `server.json` version to its `package.json` version.
 *
 * The MCP Registry publish (`mcp-publisher publish`) reads the version from
 * `server.json`, but `changeset version` only bumps `package.json`. Nothing
 * kept the two in sync, so every `server.json` drifted behind npm (by as much
 * as a dozen minor versions). Because the MCP Registry is immutable per
 * version, that silently either republishes stale metadata or fails the
 * publish outright.
 *
 * This aligns the top-level `version` and every `packages[].version` in each
 * `server.json` with its sibling `package.json`. It runs as part of
 * `version-packages` (so the "chore: version packages" PR carries the bump),
 * and `--check` guards against drift in CI.
 *
 * Only the version string is rewritten — all other bytes (descriptions,
 * schema URL, transport) are left untouched.
 *
 * Usage:
 *   pnpm sync-server-versions          # update files in place
 *   pnpm sync-server-versions --check  # exit 1 if any server.json is stale (CI)
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");
const PACKAGES_DIR = resolve(ROOT, "packages");

const check = process.argv.includes("--check");

// Matches `"version": "1.2.3"` (with optional pre-release/build metadata),
// capturing the key/quote prefix and the closing quote so only the value is
// rewritten. In an MCP server.json the `version` key appears only for the
// server and its package entries, so a global replace is safe.
const VERSION_RE = /("version":\s*")\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?(")/g;

const stale: string[] = [];
const updated: string[] = [];

for (const entry of readdirSync(PACKAGES_DIR)) {
  const dir = resolve(PACKAGES_DIR, entry);
  const serverJsonPath = resolve(dir, "server.json");
  const packageJsonPath = resolve(dir, "package.json");
  if (!existsSync(serverJsonPath) || !existsSync(packageJsonPath)) continue;

  const pkgVersion = JSON.parse(readFileSync(packageJsonPath, "utf-8")).version as string;
  if (!pkgVersion) continue;

  const content = readFileSync(serverJsonPath, "utf-8");
  const next = content.replace(VERSION_RE, `$1${pkgVersion}$2`);

  if (next !== content) {
    const rel = `packages/${entry}/server.json`;
    if (check) {
      stale.push(rel);
    } else {
      writeFileSync(serverJsonPath, next, "utf-8");
      updated.push(rel);
    }
  }
}

if (check) {
  if (stale.length > 0) {
    console.error("server.json versions out of sync with package.json:");
    for (const f of stale) console.error(`  ${f}`);
    console.error("\nRun `pnpm sync-server-versions` to fix.");
    process.exit(1);
  }
  console.log("All server.json versions are in sync.");
} else if (updated.length > 0) {
  console.log("Synced server.json versions:");
  for (const f of updated) console.log(`  ${f}`);
} else {
  console.log("All server.json versions are in sync.");
}
