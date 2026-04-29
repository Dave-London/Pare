import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertBinaryAvailable } from "../src/lib/build-runner.js";

describe("assertBinaryAvailable (build)", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "pare-build-binarycheck-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("throws a typed error when node_modules/.bin/<binary> is missing", () => {
    expect(() => assertBinaryAvailable(tmp, "tsc")).toThrowError(
      /tsc binary not found at .*node_modules.*\.bin.*tsc.*— try running "pnpm install"/,
    );
  });

  it("includes the cwd in the error so the consumer can locate the workspace", () => {
    // Use string (substring match) rather than RegExp — Windows tmp paths
    // contain backslashes that would be interpreted as regex escapes.
    expect(() => assertBinaryAvailable(tmp, "tsc")).toThrowError(tmp);
  });

  it("succeeds when node_modules/.bin/<binary> exists in cwd", () => {
    const binDir = join(tmp, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binPath = join(binDir, "tsc");
    writeFileSync(binPath, "#!/usr/bin/env node\n");
    chmodSync(binPath, 0o755);
    expect(() => assertBinaryAvailable(tmp, "tsc")).not.toThrow();
  });

  it("succeeds when the binary lives in an ancestor's node_modules (workspace hoisting)", () => {
    const binDir = join(tmp, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binPath = join(binDir, "tsc");
    writeFileSync(binPath, "#!/usr/bin/env node\n");
    chmodSync(binPath, 0o755);

    const nested = join(tmp, "packages", "child");
    mkdirSync(nested, { recursive: true });

    expect(() => assertBinaryAvailable(nested, "tsc")).not.toThrow();
  });
});
