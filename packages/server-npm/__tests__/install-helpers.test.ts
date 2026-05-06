import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  assertSafeRegistryUrl,
  composeInstallFlags,
  getLockfileHash,
} from "../src/tools/install.js";

describe("assertSafeRegistryUrl", () => {
  const ENV_KEY = "PARE_NPM_ALLOW_HTTP_REGISTRY";
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("accepts https:// URLs", () => {
    expect(() => assertSafeRegistryUrl("https://registry.npmjs.org")).not.toThrow();
  });

  it("accepts uppercase HTTPS:// (case-insensitive)", () => {
    expect(() => assertSafeRegistryUrl("HTTPS://registry.npmjs.org")).not.toThrow();
  });

  it("rejects http:// when PARE_NPM_ALLOW_HTTP_REGISTRY is unset", () => {
    expect(() => assertSafeRegistryUrl("http://internal.example.com")).toThrowError(
      /Registry URL scheme not allowed/,
    );
  });

  it("rejects http:// when PARE_NPM_ALLOW_HTTP_REGISTRY is not exactly 'true'", () => {
    process.env[ENV_KEY] = "1";
    expect(() => assertSafeRegistryUrl("http://internal.example.com")).toThrow();
    process.env[ENV_KEY] = "false";
    expect(() => assertSafeRegistryUrl("http://internal.example.com")).toThrow();
  });

  it("accepts http:// when PARE_NPM_ALLOW_HTTP_REGISTRY=true", () => {
    process.env[ENV_KEY] = "true";
    expect(() => assertSafeRegistryUrl("http://internal.example.com")).not.toThrow();
  });

  it("rejects non-http(s) schemes regardless of env", () => {
    expect(() => assertSafeRegistryUrl("ftp://example.com")).toThrow();
    expect(() => assertSafeRegistryUrl("file:///etc/passwd")).toThrow();
    process.env[ENV_KEY] = "true";
    expect(() => assertSafeRegistryUrl("ftp://example.com")).toThrow();
  });

  it("error message includes the rejected URL", () => {
    let caught: Error | undefined;
    try {
      assertSafeRegistryUrl("ftp://example.com");
    } catch (err) {
      caught = err as Error;
    }
    expect(caught?.message).toContain("ftp://example.com");
  });
});

describe("getLockfileHash", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "pare-npm-lockhash-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns sha256 of pnpm-lock.yaml when present", async () => {
    const body = "lockfileVersion: '9.0'\n";
    writeFileSync(join(tmp, "pnpm-lock.yaml"), body);
    const expected = createHash("sha256").update(body).digest("hex");
    expect(await getLockfileHash(tmp, "pnpm")).toBe(expected);
  });

  it("returns sha256 of yarn.lock when present", async () => {
    const body = "# yarn lockfile v1\n";
    writeFileSync(join(tmp, "yarn.lock"), body);
    const expected = createHash("sha256").update(body).digest("hex");
    expect(await getLockfileHash(tmp, "yarn")).toBe(expected);
  });

  it("returns sha256 of package-lock.json when present (npm)", async () => {
    const body = '{"lockfileVersion": 3}\n';
    writeFileSync(join(tmp, "package-lock.json"), body);
    const expected = createHash("sha256").update(body).digest("hex");
    expect(await getLockfileHash(tmp, "npm")).toBe(expected);
  });

  it("returns undefined when the lockfile is missing", async () => {
    expect(await getLockfileHash(tmp, "pnpm")).toBeUndefined();
    expect(await getLockfileHash(tmp, "yarn")).toBeUndefined();
    expect(await getLockfileHash(tmp, "npm")).toBeUndefined();
  });

  it("hash differs when lockfile contents differ", async () => {
    writeFileSync(join(tmp, "pnpm-lock.yaml"), "v1");
    const before = await getLockfileHash(tmp, "pnpm");
    writeFileSync(join(tmp, "pnpm-lock.yaml"), "v2");
    const after = await getLockfileHash(tmp, "pnpm");
    expect(before).not.toBe(after);
  });
});

describe("composeInstallFlags", () => {
  it("returns no flags for an empty options object on pnpm", () => {
    expect(composeInstallFlags("pnpm", {})).toEqual([]);
  });

  it("appends --json on npm", () => {
    expect(composeInstallFlags("npm", {})).toEqual(["--json"]);
  });

  it("returns no flags for empty options on yarn", () => {
    expect(composeInstallFlags("yarn", {})).toEqual([]);
  });

  it("ignoreScripts → --ignore-scripts (all PMs)", () => {
    expect(composeInstallFlags("pnpm", { ignoreScripts: true })).toContain("--ignore-scripts");
    expect(composeInstallFlags("npm", { ignoreScripts: true })).toContain("--ignore-scripts");
    expect(composeInstallFlags("yarn", { ignoreScripts: true })).toContain("--ignore-scripts");
  });

  it("filter → --filter=<value> only on pnpm", () => {
    expect(composeInstallFlags("pnpm", { filter: "@scope/pkg" })).toContain("--filter=@scope/pkg");
    expect(composeInstallFlags("npm", { filter: "@scope/pkg" })).not.toContain(
      "--filter=@scope/pkg",
    );
    expect(composeInstallFlags("yarn", { filter: "@scope/pkg" })).not.toContain(
      "--filter=@scope/pkg",
    );
  });

  it("saveDev → --save-dev (all PMs)", () => {
    expect(composeInstallFlags("pnpm", { saveDev: true })).toContain("--save-dev");
    expect(composeInstallFlags("npm", { saveDev: true })).toContain("--save-dev");
    expect(composeInstallFlags("yarn", { saveDev: true })).toContain("--save-dev");
  });

  it("frozenLockfile → --frozen-lockfile on pnpm/yarn but not npm (npm uses ci subcommand)", () => {
    expect(composeInstallFlags("pnpm", { frozenLockfile: true })).toContain("--frozen-lockfile");
    expect(composeInstallFlags("yarn", { frozenLockfile: true })).toContain("--frozen-lockfile");
    expect(composeInstallFlags("npm", { frozenLockfile: true })).not.toContain("--frozen-lockfile");
  });

  it("dryRun → --dry-run (all PMs)", () => {
    expect(composeInstallFlags("pnpm", { dryRun: true })).toContain("--dry-run");
    expect(composeInstallFlags("npm", { dryRun: true })).toContain("--dry-run");
    expect(composeInstallFlags("yarn", { dryRun: true })).toContain("--dry-run");
  });

  it("production → PM-specific flag", () => {
    expect(composeInstallFlags("npm", { production: true })).toContain("--omit=dev");
    expect(composeInstallFlags("pnpm", { production: true })).toContain("--prod");
    expect(composeInstallFlags("yarn", { production: true })).toContain("--production");
  });

  it("legacyPeerDeps → --legacy-peer-deps only on npm", () => {
    expect(composeInstallFlags("npm", { legacyPeerDeps: true })).toContain("--legacy-peer-deps");
    expect(composeInstallFlags("pnpm", { legacyPeerDeps: true })).not.toContain(
      "--legacy-peer-deps",
    );
    expect(composeInstallFlags("yarn", { legacyPeerDeps: true })).not.toContain(
      "--legacy-peer-deps",
    );
  });

  it("force → --force, noAudit → --no-audit, exact → --save-exact, global → --global", () => {
    const flags = composeInstallFlags("pnpm", {
      force: true,
      noAudit: true,
      exact: true,
      global: true,
    });
    expect(flags).toEqual(
      expect.arrayContaining(["--force", "--no-audit", "--save-exact", "--global"]),
    );
  });

  it("registry → --registry=<value>", () => {
    expect(composeInstallFlags("pnpm", { registry: "https://npm.pkg.github.com" })).toContain(
      "--registry=https://npm.pkg.github.com",
    );
  });

  it("composes multiple options in stable order", () => {
    expect(
      composeInstallFlags("pnpm", {
        ignoreScripts: true,
        filter: "@scope/pkg",
        saveDev: true,
        frozenLockfile: true,
        dryRun: true,
      }),
    ).toEqual([
      "--ignore-scripts",
      "--filter=@scope/pkg",
      "--save-dev",
      "--frozen-lockfile",
      "--dry-run",
    ]);
  });

  it("npm with frozenLockfile produces no --frozen-lockfile (caller uses ci subcommand instead)", () => {
    expect(composeInstallFlags("npm", { frozenLockfile: true })).toEqual(["--json"]);
  });
});
