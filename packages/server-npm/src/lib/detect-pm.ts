import { access } from "node:fs/promises";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm";

/**
 * Detects the package manager for a given project directory by checking lock files.
 * Priority: pnpm-lock.yaml > package-lock.json > default (npm).
 * If `explicit` is provided, it is returned directly (user override).
 */
export async function detectPackageManager(
  cwd: string,
  explicit?: PackageManager,
): Promise<PackageManager> {
  if (explicit) return explicit;

  try {
    await access(join(cwd, "pnpm-lock.yaml"));
    return "pnpm";
  } catch {
    // no pnpm-lock.yaml
  }

  return "npm";
}
