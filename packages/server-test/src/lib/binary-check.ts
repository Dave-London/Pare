import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import type { Framework } from "./detect.js";

/**
 * Walks up from `cwd` looking for `node_modules/.bin/<binary>` (or `<binary>.cmd`
 * / `<binary>.exe` on Windows). Returns the first match, or `undefined` when no
 * ancestor of `cwd` provides the binary.
 */
function findLocalBinary(cwd: string, binary: string): string | undefined {
  const isWin = process.platform === "win32";
  const candidates = isWin ? [`${binary}.cmd`, `${binary}.exe`, binary] : [binary];
  let current = cwd;
  const root = parse(current).root;
  while (true) {
    for (const name of candidates) {
      const candidate = join(current, "node_modules", ".bin", name);
      if (existsSync(candidate)) return candidate;
    }
    if (current === root) return undefined;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * Asserts that the JS-side test framework binary (jest, vitest, mocha) is
 * resolvable from `cwd`. Throws a typed, actionable error when it isn't —
 * this is the dominant failure mode when a fresh worktree has no
 * `node_modules/`. See #842.
 *
 * pytest is intentionally skipped because it's invoked via `python -m pytest`
 * and lives outside the npm `node_modules/.bin` resolution path.
 */
export function assertNodeFrameworkAvailable(cwd: string, framework: Framework): void {
  if (framework === "pytest") return;
  if (findLocalBinary(cwd, framework)) return;
  const expected = join(cwd, "node_modules", ".bin", framework);
  throw new Error(
    `${framework} binary not found at ${expected} — try running "pnpm install" (or "npm install" / "yarn install") in ${cwd}.`,
  );
}
