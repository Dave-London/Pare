/**
 * Single source of truth for tool and package counts.
 *
 * Scans every `packages/server-*\/src/tools/index.ts` file, extracts tool
 * names from the uniform `if (s("toolName"))` registration pattern, and
 * exports computed totals.  No external dependencies — stdlib only.
 *
 * Usage:
 *   import { TOTAL_TOOLS, TOTAL_PACKAGES, PACKAGES } from "./tool-meta.js";
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");
const PACKAGES_DIR = resolve(ROOT, "packages");

export interface PackageMeta {
  /** Directory name, e.g. "server-git" */
  dir: string;
  /** Short name extracted from `shouldRegisterTool("git", …)`, e.g. "git" */
  name: string;
  /** Tool names registered via `if (s("toolName"))` */
  tools: string[];
}

/**
 * Match tool names in TOOL_DEFS arrays: `name: "toolName"`.
 * Also falls back to the legacy `if (s("toolName"))` guard pattern.
 */
const TOOL_DEFS_RE = /^\s+\{?\s*name:\s*"([^"]+)"/gm;
const LEGACY_TOOL_RE = /if\s*\(\s*s\(\s*"([^"]+)"\s*\)\s*\)/g;

function scanPackage(dir: string): PackageMeta | null {
  const indexPath = resolve(PACKAGES_DIR, dir, "src/tools/index.ts");
  let src: string;
  try {
    src = readFileSync(indexPath, "utf-8");
  } catch {
    return null;
  }

  const tools: string[] = [];
  // Prefer TOOL_DEFS-style declarations; fall back to legacy pattern
  for (const m of src.matchAll(TOOL_DEFS_RE)) {
    tools.push(m[1]);
  }
  if (tools.length === 0) {
    for (const m of src.matchAll(LEGACY_TOOL_RE)) {
      tools.push(m[1]);
    }
  }

  // Extract the package short name from `shouldRegisterTool("name", …)`
  const nameMatch = src.match(/shouldRegisterTool\(\s*"([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : dir.replace(/^server-/, "");

  return { dir, name, tools };
}

function scan(): PackageMeta[] {
  return readdirSync(PACKAGES_DIR)
    .filter((d) => d.startsWith("server-"))
    .sort()
    .map(scanPackage)
    .filter((p): p is PackageMeta => p !== null && p.tools.length > 0);
}

/** Per-package metadata (sorted alphabetically by directory name). */
export const PACKAGES: PackageMeta[] = scan();

/** Total number of registered tools across all packages. */
export const TOTAL_TOOLS: number = PACKAGES.reduce((sum, p) => sum + p.tools.length, 0);

/** Total number of server packages. */
export const TOTAL_PACKAGES: number = PACKAGES.length;
