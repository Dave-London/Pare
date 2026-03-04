import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads the `version` field from the nearest `package.json` relative to
 * the calling module's `import.meta.url`.
 *
 * Walks up directory tree from the given module URL until it finds a
 * `package.json` with a `version` field, or returns `"0.0.0"` as a
 * fallback.
 *
 * @example
 * ```ts
 * import { readPackageVersion } from "@paretools/shared";
 * const version = readPackageVersion(import.meta.url);
 * ```
 */
export function readPackageVersion(importMetaUrl: string): string {
  let dir = dirname(fileURLToPath(importMetaUrl));

  // Walk up to find the nearest package.json with a version field
  for (;;) {
    try {
      const pkgPath = join(dir, "package.json");
      const raw = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(raw) as { version?: string };
      if (pkg.version) {
        return pkg.version;
      }
    } catch {
      // No package.json in this directory, keep walking up
    }
    const parent = dirname(dir);
    if (parent === dir) {
      // Reached filesystem root
      break;
    }
    dir = parent;
  }

  return "0.0.0";
}
