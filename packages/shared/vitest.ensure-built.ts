import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Builds a package only when its `dist/index.js` is missing.
 *
 * Integration tests spawn `node dist/index.js`. They used to run `pnpm build` from
 * each test file's `beforeAll`, which rewrote an already-built `dist` while other
 * test workers (and, under turbo, other packages' test tasks) were starting servers
 * from it. `tsc` truncates each output file before writing it, so a server started
 * in that window loaded an empty entry module, exited 0 with no output, and the
 * client saw `MCP error -32000: Connection closed` (#1085).
 *
 * So this must never rewrite a `dist` that exists. Call it from a Vitest
 * `globalSetup`, which runs once in the main process before any test worker starts.
 * A fresh build is the job of `pnpm build` / turbo (`test` depends on `build`).
 */
export function ensureBuilt(packageDirs: string[]): void {
  for (const dir of packageDirs) {
    const dist = resolve(dir, "dist");
    if (existsSync(resolve(dist, "index.js"))) continue;
    try {
      execFileSync("pnpm", ["build"], {
        cwd: dir,
        encoding: "utf-8",
        shell: process.platform === "win32",
      });
    } catch (err) {
      // tsc emits even when type-checking fails. Drop the partial output so the
      // next run builds again instead of trusting a dist from a failed build.
      rmSync(dist, { recursive: true, force: true });
      throw err;
    }
  }
}
