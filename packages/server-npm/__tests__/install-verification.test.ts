import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertInstallActuallyHappened } from "../src/tools/install.js";

describe("assertInstallActuallyHappened", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "pare-npm-installverify-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("throws when node_modules/ does not exist after install", () => {
    expect(() =>
      assertInstallActuallyHappened({
        cwd: tmp,
        pm: "pnpm",
        subcommand: "install",
        exitCode: 0,
        stderr: "Already up to date\nDone in 1.0s",
      }),
    ).toThrowError(/no node_modules\/ was created/);
  });

  it("includes the pm, cwd, and exitCode in the diagnostic message", () => {
    let caught: Error | undefined;
    try {
      assertInstallActuallyHappened({
        cwd: tmp,
        pm: "pnpm",
        subcommand: "install",
        exitCode: 0,
        stderr: "Lockfile is up to date, resolution step is skipped",
      });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain("pm=pnpm");
    expect(caught!.message).toContain(`cwd=${tmp}`);
    expect(caught!.message).toContain("exitCode=0");
    expect(caught!.message).toContain("stderr (last 5 lines):");
    expect(caught!.message).toContain("Lockfile is up to date");
  });

  it("does NOT throw when node_modules/ exists after install", () => {
    mkdirSync(join(tmp, "node_modules"));
    expect(() =>
      assertInstallActuallyHappened({
        cwd: tmp,
        pm: "pnpm",
        subcommand: "install",
        exitCode: 0,
        stderr: "",
      }),
    ).not.toThrow();
  });

  it("works for npm too", () => {
    expect(() =>
      assertInstallActuallyHappened({
        cwd: tmp,
        pm: "npm",
        subcommand: "ci",
        exitCode: 0,
        stderr: "",
      }),
    ).toThrowError(/npm ci reported success but no node_modules\//);
  });

  it("omits the stderr block when stderr is empty", () => {
    let caught: Error | undefined;
    try {
      assertInstallActuallyHappened({
        cwd: tmp,
        pm: "yarn",
        subcommand: "install",
        exitCode: 0,
        stderr: "",
      });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).not.toContain("stderr (last 5 lines):");
  });
});
