/**
 * Smoke tests: npm tools (audit, list, outdated, info) — Phase 3 (recorded)
 *
 * Feeds REAL `npm audit/list/outdated/info --json` output captured from actual
 * projects through the tool handlers. Validates that the parser, formatter, and
 * schema chain works with genuine CLI output.
 *
 * Fixtures sourced from:
 * - audit/s01: Clean audit with 0 vulnerabilities
 * - audit/s02: Audit with 2 vulnerabilities (qs low, ajv moderate)
 * - list/s01: npm ls --json --depth=0 with deps
 * - outdated/s01: npm outdated --json with 3 outdated packages
 * - outdated/s02: All current (empty JSON object)
 * - info/s01: npm info express --json
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  NpmAuditSchema,
  NpmListSchema,
  NpmOutdatedSchema,
  NpmInfoSchema,
} from "../../../packages/server-npm/src/schemas/index.js";

// Mock the npm runner
vi.mock("../../../packages/server-npm/src/lib/npm-runner.js", () => ({
  runPm: vi.fn(),
  npm: vi.fn(),
  pnpm: vi.fn(),
  yarn: vi.fn(),
}));

// Mock detect-pm to always return npm
vi.mock("../../../packages/server-npm/src/lib/detect-pm.js", () => ({
  detectPackageManager: vi.fn().mockResolvedValue("npm"),
}));

// Mock node:fs/promises (used by detect-pm for lock file checks and list for readFile)
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
  access: vi.fn().mockRejectedValue(new Error("ENOENT")),
}));

import { runPm } from "../../../packages/server-npm/src/lib/npm-runner.js";
import { registerAuditTool } from "../../../packages/server-npm/src/tools/audit.js";
import { registerListTool } from "../../../packages/server-npm/src/tools/list.js";
import { registerOutdatedTool } from "../../../packages/server-npm/src/tools/outdated.js";
import { registerInfoTool } from "../../../packages/server-npm/src/tools/info.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

const FIXTURE_BASE = resolve(__dirname, "../fixtures/npm");

function loadFixture(subpath: string): string {
  return readFileSync(resolve(FIXTURE_BASE, subpath), "utf-8");
}

function mockRunPm(fixture: string, stderr = "", exitCode = 0) {
  vi.mocked(runPm).mockResolvedValueOnce({
    stdout: loadFixture(fixture),
    stderr,
    exitCode,
  });
}

function mockRunPmRaw(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(runPm).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// audit
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: npm.audit", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(runPm).mockReset();
    const server = new FakeServer();
    registerAuditTool(server as never);
    handler = server.tools.get("audit")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown> = {}) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = NpmAuditSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] clean — no vulnerabilities", async () => {
    mockRunPm("audit/s01-clean.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.summary.total).toBe(0);
    expect(parsed.vulnerabilities.length).toBe(0);
  });

  it("S2 [recorded] with vulnerabilities — qs low, ajv moderate", async () => {
    mockRunPm("audit/s02-with-vulns.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.summary.total).toBeGreaterThan(0);
    expect(parsed.vulnerabilities.length).toBeGreaterThanOrEqual(1);
    const names = parsed.vulnerabilities.map((v) => v.name);
    expect(names).toContain("qs");
    expect(names).toContain("ajv");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// list
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: npm.list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(runPm).mockReset();
    const server = new FakeServer();
    registerListTool(server as never);
    handler = server.tools.get("list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown> = {}) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = NpmListSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] depth 0 — lists top-level packages", async () => {
    mockRunPm("list/s01-depth0.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.dependencies).toBeDefined();
    expect(Object.keys(parsed.dependencies!).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// outdated
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: npm.outdated", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(runPm).mockReset();
    const server = new FakeServer();
    registerOutdatedTool(server as never);
    handler = server.tools.get("outdated")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown> = {}) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = NpmOutdatedSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] some outdated — exit code 1", async () => {
    mockRunPm("outdated/s01-some-outdated.txt", "", 1);
    const { parsed } = await callAndValidate({});
    expect(parsed.packages.length).toBeGreaterThanOrEqual(1);
    const names = parsed.packages.map((p) => p.name);
    expect(names).toContain("typescript");
    expect(names).toContain("eslint");
    expect(names).toContain("lodash");
  });

  it("S2 [recorded] all current — exit code 0, empty", async () => {
    mockRunPm("outdated/s02-all-current.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.packages.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// info
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: npm.info", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(runPm).mockReset();
    const server = new FakeServer();
    registerInfoTool(server as never);
    handler = server.tools.get("info")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = NpmInfoSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] package info — express metadata", async () => {
    mockRunPm("info/s01-package-info.txt", "", 0);
    const { parsed } = await callAndValidate({ package: "express" });
    expect(parsed.name).toBeDefined();
    expect(parsed.name).toBe("express");
    expect(parsed.version).toBe("4.21.2");
    expect(parsed.description).toBeDefined();
  });
});
