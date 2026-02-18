/**
 * Smoke tests: lint tools (eslint, prettier format-check) — Phase 3 (recorded)
 *
 * Feeds REAL CLI output captured from actual projects through the tool
 * handlers. Validates that the parser, formatter, and schema chain works
 * with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  LintResultSchema,
  FormatCheckResultSchema,
} from "../../../packages/server-lint/src/schemas/index.js";

// Mock the lint runner module used by all lint tools
vi.mock("../../../packages/server-lint/src/lib/lint-runner.js", () => ({
  eslint: vi.fn(),
  prettier: vi.fn(),
  biome: vi.fn(),
  stylelintCmd: vi.fn(),
  oxlintCmd: vi.fn(),
  shellcheckCmd: vi.fn(),
  hadolintCmd: vi.fn(),
}));

vi.mock("../../../packages/server-lint/src/lib/parsers.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolveShellcheckPatterns: vi.fn(),
    validateShellcheckPatterns: vi.fn().mockReturnValue(null),
  };
});

import { eslint, prettier } from "../../../packages/server-lint/src/lib/lint-runner.js";
import { registerLintTool } from "../../../packages/server-lint/src/tools/lint.js";
import { registerFormatCheckTool } from "../../../packages/server-lint/src/tools/format-check.js";

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

function loadFixture(dir: string, name: string): string {
  return readFileSync(resolve(__dirname, "../fixtures/lint", dir, name), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// eslint (lint tool) — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: lint.eslint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(eslint).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerLintTool(server as never);
    handler = server.tools.get("lint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockEslintWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(eslint).mockResolvedValueOnce({
      stdout: loadFixture("eslint", name),
      stderr,
      exitCode,
    });
  }

  it("S1 [recorded] clean project", async () => {
    mockEslintWithFixture("s01-clean.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.total).toBe(0);
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  it("S2 [recorded] with errors and warnings", async () => {
    mockEslintWithFixture("s02-with-errors.txt", "", 1);
    const { parsed } = await callAndValidate({});
    expect(parsed.total).toBeGreaterThan(0);
    expect(parsed.errors).toBeGreaterThanOrEqual(1);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// prettier (format-check tool) — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: lint.format-check", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(prettier).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerFormatCheckTool(server as never);
    handler = server.tools.get("format-check")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = FormatCheckResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockPrettierWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(prettier).mockResolvedValueOnce({
      stdout: loadFixture("prettier", name),
      stderr,
      exitCode,
    });
  }

  it("S1 [recorded] all formatted", async () => {
    mockPrettierWithFixture("s01-clean.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.formatted).toBe(true);
  });

  it("S2 [recorded] unformatted files", async () => {
    mockPrettierWithFixture("s02-dirty.txt", "", 1);
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.formatted).toBe(false);
    expect(parsed.files).toBeDefined();
    expect(parsed.files!.length).toBeGreaterThanOrEqual(1);
  });
});
