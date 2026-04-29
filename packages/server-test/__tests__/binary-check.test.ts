import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertNodeFrameworkAvailable } from "../src/lib/binary-check.js";

describe("assertNodeFrameworkAvailable", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "pare-test-binarycheck-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("throws a typed error when the framework binary is missing (vitest)", () => {
    expect(() => assertNodeFrameworkAvailable(tmp, "vitest")).toThrowError(
      /vitest binary not found at .*node_modules.*\.bin.*vitest.*— try running "pnpm install"/,
    );
  });

  it("throws for jest when missing", () => {
    expect(() => assertNodeFrameworkAvailable(tmp, "jest")).toThrowError(/jest binary not found/);
  });

  it("throws for mocha when missing", () => {
    expect(() => assertNodeFrameworkAvailable(tmp, "mocha")).toThrowError(/mocha binary not found/);
  });

  it("never throws for pytest (lives outside node_modules)", () => {
    expect(() => assertNodeFrameworkAvailable(tmp, "pytest")).not.toThrow();
  });

  it("succeeds when the binary exists in cwd's node_modules", () => {
    const binDir = join(tmp, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binPath = join(binDir, "vitest");
    writeFileSync(binPath, "#!/usr/bin/env node\n");
    chmodSync(binPath, 0o755);
    expect(() => assertNodeFrameworkAvailable(tmp, "vitest")).not.toThrow();
  });

  it("succeeds when the binary is hoisted to an ancestor (workspace setup)", () => {
    const binDir = join(tmp, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binPath = join(binDir, "vitest");
    writeFileSync(binPath, "#!/usr/bin/env node\n");
    chmodSync(binPath, 0o755);

    const nested = join(tmp, "packages", "child");
    mkdirSync(nested, { recursive: true });

    expect(() => assertNodeFrameworkAvailable(nested, "vitest")).not.toThrow();
  });
});
