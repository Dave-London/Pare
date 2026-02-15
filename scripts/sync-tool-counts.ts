#!/usr/bin/env npx tsx
/**
 * Sync tool/package counts across documentation files.
 *
 * Reads the actual tool registrations via `tool-meta.ts` and updates
 * hard-coded counts in docs.  Benchmark files and changelogs are
 * intentionally excluded — they are frozen snapshots.
 *
 * Usage:
 *   pnpm sync-tool-counts          # update files in place
 *   pnpm sync-tool-counts --check  # exit 1 if any file is stale (CI)
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TOTAL_TOOLS, TOTAL_PACKAGES } from "./tool-meta.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");

const check = process.argv.includes("--check");

// ---------------------------------------------------------------------------
// Replacement manifest
// ---------------------------------------------------------------------------

interface Rule {
  /** Glob patterns relative to ROOT. */
  files: string[];
  /** Regex to match the stale text. Must have capture groups for the numbers. */
  pattern: RegExp;
  /** Replacement string — use $1/$2 etc. for non-number groups. */
  replacement: string;
}

const rules: Rule[] = [
  {
    // ## Available Servers (N tools, N packages)
    files: ["README.md"],
    pattern: /## Available Servers \(\d+ tools, \d+ packages\)/g,
    replacement: `## Available Servers (${TOTAL_TOOLS} tools, ${TOTAL_PACKAGES} packages)`,
  },
  {
    // Pare MCP servers (N tools)
    files: ["README.md"],
    pattern: /Pare MCP servers \(\d+ tools\)/g,
    replacement: `Pare MCP servers (${TOTAL_TOOLS} tools)`,
  },
  {
    // N tools total)
    files: ["README.md"],
    pattern: /\d+ tools total\)/g,
    replacement: `${TOTAL_TOOLS} tools total)`,
  },
  {
    // All N packages (N tools)
    files: ["SECURITY-AUDIT.md"],
    pattern: /All \d+ packages \(\d+ tools\)/g,
    replacement: `All ${TOTAL_PACKAGES} packages (${TOTAL_TOOLS} tools)`,
  },
  {
    // N tools across N packages
    files: ["ROADMAP.md"],
    pattern: /\d+ tools across \d+ packages/g,
    replacement: `${TOTAL_TOOLS} tools across ${TOTAL_PACKAGES} packages`,
  },
  {
    // all N tools
    files: ["docs/FAQ.md"],
    pattern: /all \d+ tools/g,
    replacement: `all ${TOTAL_TOOLS} tools`,
  },
  {
    // ## All Pare Servers (N tools)
    files: ["packages/server-*/README.md"],
    pattern: /## All Pare Servers \(\d+ tools\)/g,
    replacement: `## All Pare Servers (${TOTAL_TOOLS} tools)`,
  },
];

// ---------------------------------------------------------------------------
// Expand globs & apply rules
// ---------------------------------------------------------------------------

function expandGlob(pattern: string): string[] {
  if (!pattern.includes("*")) {
    return [resolve(ROOT, pattern)];
  }

  const parts = pattern.split("/");
  let paths = [ROOT];

  for (const part of parts) {
    const next: string[] = [];
    for (const base of paths) {
      if (part.includes("*")) {
        const re = new RegExp("^" + part.replace(/\*/g, ".*") + "$");
        try {
          for (const entry of readdirSync(base)) {
            if (re.test(entry)) {
              next.push(resolve(base, entry));
            }
          }
        } catch {
          // directory doesn't exist — skip
        }
      } else {
        next.push(resolve(base, part));
      }
    }
    paths = next;
  }

  return paths;
}

let staleFiles: string[] = [];
let updatedFiles: string[] = [];

for (const rule of rules) {
  for (const glob of rule.files) {
    const paths = expandGlob(glob);
    for (const filePath of paths) {
      let content: string;
      try {
        content = readFileSync(filePath, "utf-8");
      } catch {
        continue; // file doesn't exist — skip
      }

      const updated = content.replace(rule.pattern, rule.replacement);

      if (updated !== content) {
        const rel = filePath.replace(ROOT + "/", "");
        if (check) {
          staleFiles.push(rel);
        } else {
          writeFileSync(filePath, updated, "utf-8");
          updatedFiles.push(rel);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Tool counts: ${TOTAL_TOOLS} tools across ${TOTAL_PACKAGES} packages\n`);

if (check) {
  if (staleFiles.length > 0) {
    console.error("Stale tool counts detected in:");
    for (const f of [...new Set(staleFiles)]) {
      console.error(`  ${f}`);
    }
    console.error("\nRun `pnpm sync-tool-counts` to fix.");
    process.exit(1);
  }
  console.log("All counts are up to date.");
} else {
  if (updatedFiles.length > 0) {
    console.log("Updated:");
    for (const f of [...new Set(updatedFiles)]) {
      console.log(`  ${f}`);
    }
  } else {
    console.log("All counts are up to date.");
  }
}
