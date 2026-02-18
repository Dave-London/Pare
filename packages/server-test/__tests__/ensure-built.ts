import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

let built = false;

/**
 * Integration-style tests execute dist entrypoints; ensure they are freshly built.
 * Also builds server-git because server-test integration calls run vitest there.
 */
export function ensureBuiltArtifacts(testDir: string): void {
  if (built) return;

  const shell = process.platform === "win32";
  const serverTestPkg = resolve(testDir, "..");
  const serverGitPkg = resolve(testDir, "../../server-git");

  execFileSync("pnpm", ["build"], { cwd: serverGitPkg, shell, encoding: "utf-8" });
  execFileSync("pnpm", ["build"], { cwd: serverTestPkg, shell, encoding: "utf-8" });

  built = true;
}
