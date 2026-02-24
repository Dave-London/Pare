/**
 * Smoke tests: lint server (9 tools) — Phase 2 (mocked)
 *
 * Tests all lint tools end-to-end with mocked runners,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  LintResultSchema,
  FormatCheckResultSchema,
  FormatWriteResultSchema,
} from "../../../packages/server-lint/src/schemas/index.js";

// ── Mock the lint runner module ──────────────────────────────────────────────
vi.mock("../../../packages/server-lint/src/lib/lint-runner.js", () => ({
  eslint: vi.fn(),
  prettier: vi.fn(),
  biome: vi.fn(),
  stylelintCmd: vi.fn(),
  oxlintCmd: vi.fn(),
  shellcheckCmd: vi.fn(),
  hadolintCmd: vi.fn(),
}));

// ── Mock resolveShellcheckPatterns and validateShellcheckPatterns ─────────────
// We need to partially mock parsers to control shellcheck pattern resolution
vi.mock("../../../packages/server-lint/src/lib/parsers.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolveShellcheckPatterns: vi.fn(),
    validateShellcheckPatterns: vi.fn().mockReturnValue(null),
  };
});

import {
  eslint,
  prettier,
  biome,
  stylelintCmd,
  oxlintCmd,
  shellcheckCmd,
  hadolintCmd,
} from "../../../packages/server-lint/src/lib/lint-runner.js";
import {
  resolveShellcheckPatterns,
  validateShellcheckPatterns,
} from "../../../packages/server-lint/src/lib/parsers.js";
import { registerLintTool } from "../../../packages/server-lint/src/tools/lint.js";
import { registerFormatCheckTool } from "../../../packages/server-lint/src/tools/format-check.js";
import { registerPrettierFormatTool } from "../../../packages/server-lint/src/tools/prettier-format.js";
import { registerBiomeCheckTool } from "../../../packages/server-lint/src/tools/biome-check.js";
import { registerBiomeFormatTool } from "../../../packages/server-lint/src/tools/biome-format.js";
import { registerOxlintTool } from "../../../packages/server-lint/src/tools/oxlint.js";
import { registerHadolintTool } from "../../../packages/server-lint/src/tools/hadolint.js";
import { registerShellcheckTool } from "../../../packages/server-lint/src/tools/shellcheck.js";
import { registerStylelintTool } from "../../../packages/server-lint/src/tools/stylelint.js";

// ── FakeServer and helpers ──────────────────────────────────────────────────

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

function mockRunner(runner: unknown, stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(runner as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    stdout,
    stderr,
    exitCode,
  });
}

// ── Sample ESLint JSON output ────────────────────────────────────────────────
const ESLINT_CLEAN = JSON.stringify([]);

const ESLINT_WITH_ERRORS = JSON.stringify([
  {
    filePath: "src/index.ts",
    messages: [
      {
        ruleId: "no-console",
        severity: 2,
        message: "Unexpected console statement.",
        line: 5,
        column: 3,
      },
      { ruleId: "semi", severity: 1, message: "Missing semicolon.", line: 10, column: 20 },
    ],
    errorCount: 1,
    warningCount: 1,
    fixableErrorCount: 0,
    fixableWarningCount: 1,
  },
]);

// ── Sample Biome JSON output ─────────────────────────────────────────────────
const BIOME_CLEAN = JSON.stringify({ summary: { changed: 0, unchanged: 5 }, diagnostics: [] });

const BIOME_WITH_ISSUES = JSON.stringify({
  summary: { changed: 0, unchanged: 3, errors: 1, warnings: 1 },
  diagnostics: [
    {
      severity: "error",
      category: "lint/suspicious/noDoubleEquals",
      description: "Use === instead of ==",
      location: { path: "src/app.ts", start: { line: 12, column: 5 } },
    },
    {
      severity: "warning",
      category: "lint/style/useConst",
      description: "Use const instead of let",
      location: { path: "src/util.ts", start: { line: 3, column: 1 } },
    },
  ],
});

// ── Sample Biome format JSON output ──────────────────────────────────────────
const BIOME_FORMAT_CHANGED = JSON.stringify({
  summary: { changed: 2, unchanged: 3 },
  diagnostics: [
    { category: "format", location: { path: "src/index.ts" } },
    { category: "format", location: { path: "src/app.ts" } },
  ],
});

const BIOME_FORMAT_CLEAN = JSON.stringify({
  summary: { changed: 0, unchanged: 5 },
  diagnostics: [],
});

// ── Sample Oxlint NDJSON output ──────────────────────────────────────────────
const OXLINT_CLEAN = "";

const OXLINT_WITH_ISSUES = [
  JSON.stringify({
    file: "src/index.ts",
    line: 5,
    column: 10,
    message: "Unused variable",
    severity: "warning",
    ruleId: "no-unused-vars",
  }),
  JSON.stringify({
    file: "src/app.ts",
    line: 12,
    column: 1,
    message: "Unexpected console",
    severity: "error",
    ruleId: "no-console",
  }),
].join("\n");

// ── Sample Hadolint JSON output ──────────────────────────────────────────────
const HADOLINT_CLEAN = JSON.stringify([]);

const HADOLINT_WITH_ISSUES = JSON.stringify([
  {
    file: "Dockerfile",
    line: 3,
    code: "DL3008",
    level: "warning",
    message: "Pin versions in apt-get install",
  },
  {
    file: "Dockerfile",
    line: 7,
    code: "DL3009",
    level: "info",
    message: "Delete the apt-get lists after installing",
  },
]);

// ── Sample ShellCheck JSON output ────────────────────────────────────────────
const SHELLCHECK_CLEAN = JSON.stringify([]);

const SHELLCHECK_WITH_ISSUES = JSON.stringify([
  {
    file: "script.sh",
    line: 5,
    column: 3,
    level: "warning",
    code: 2086,
    message: "Double quote to prevent globbing and word splitting.",
  },
  {
    file: "script.sh",
    line: 10,
    column: 1,
    level: "error",
    code: 2034,
    message: "x appears unused.",
  },
]);

// ── Sample Stylelint JSON output ─────────────────────────────────────────────
const STYLELINT_CLEAN = JSON.stringify([
  { source: "src/styles.css", warnings: [], deprecations: [], invalidOptionWarnings: [] },
]);

const STYLELINT_WITH_ISSUES = JSON.stringify([
  {
    source: "src/styles.css",
    warnings: [
      {
        line: 5,
        column: 3,
        rule: "color-no-invalid-hex",
        severity: "error",
        text: "Unexpected invalid hex color",
      },
      {
        line: 10,
        column: 1,
        rule: "declaration-no-important",
        severity: "warning",
        text: "Unexpected !important",
      },
    ],
    deprecations: [],
    invalidOptionWarnings: [],
  },
]);

// =============================================================================
// lint (ESLint)
// =============================================================================
describe("Smoke: lint (ESLint)", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  it("S1 [P0] clean project, no lint errors", async () => {
    mockRunner(eslint, ESLINT_CLEAN);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  it("S2 [P0] project with lint errors", async () => {
    mockRunner(eslint, ESLINT_WITH_ERRORS);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
    expect(parsed.errors).toBeGreaterThan(0);
  });

  it("S3 [P0] ESLint not installed throws error", async () => {
    vi.mocked(eslint).mockRejectedValueOnce(new Error("ENOENT: eslint not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via config", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection via rule", async () => {
    await expect(callAndValidate({ path: "/project", rule: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S7 [P1] diagnostic has file/line/rule/severity", async () => {
    mockRunner(eslint, ESLINT_WITH_ERRORS);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    for (const diag of parsed.diagnostics!) {
      expect(diag.file).toBeDefined();
      expect(typeof diag.line).toBe("number");
      expect(diag.rule).toBeDefined();
      expect(["error", "warning", "info"]).toContain(diag.severity);
    }
  });

  it("S8 [P1] fix: true passes --fix flag", async () => {
    mockRunner(eslint, ESLINT_CLEAN);
    await callAndValidate({ path: "/project", fix: true });
    const args = vi.mocked(eslint).mock.calls[0][0];
    expect(args).toContain("--fix");
  });

  it("S9 [P1] quiet: true passes --quiet flag", async () => {
    mockRunner(eslint, ESLINT_CLEAN);
    await callAndValidate({ path: "/project", quiet: true });
    const args = vi.mocked(eslint).mock.calls[0][0];
    expect(args).toContain("--quiet");
  });

  it("S10 [P1] maxWarnings: 0 passes --max-warnings=0", async () => {
    mockRunner(eslint, ESLINT_CLEAN);
    await callAndValidate({ path: "/project", maxWarnings: 0 });
    const args = vi.mocked(eslint).mock.calls[0][0];
    expect(args).toContain("--max-warnings=0");
  });

  it("S11 [P2] cache: true passes --cache flag", async () => {
    mockRunner(eslint, ESLINT_CLEAN);
    await callAndValidate({ path: "/project", cache: true });
    const args = vi.mocked(eslint).mock.calls[0][0];
    expect(args).toContain("--cache");
  });

  it("S12 [P2] fixDryRun: true passes --fix-dry-run", async () => {
    mockRunner(eslint, ESLINT_CLEAN);
    await callAndValidate({ path: "/project", fixDryRun: true });
    const args = vi.mocked(eslint).mock.calls[0][0];
    expect(args).toContain("--fix-dry-run");
  });

  it("S13 [P0] schema validation", async () => {
    mockRunner(eslint, ESLINT_WITH_ERRORS);
    const { parsed } = await callAndValidate({ path: "/project" });
    // If we got here, Zod parse succeeded
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// format-check (Prettier)
// =============================================================================
describe("Smoke: format-check (Prettier)", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  it("S1 [P0] all files formatted", async () => {
    mockRunner(prettier, "", "", 0);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.formatted).toBe(true);
  });

  it("S2 [P0] unformatted files exist", async () => {
    mockRunner(prettier, "src/index.ts\nsrc/app.ts\n", "", 1);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    expect(parsed.formatted).toBe(false);
    expect(parsed.files!.length).toBeGreaterThan(0);
  });

  it("S3 [P0] Prettier not installed throws error", async () => {
    vi.mocked(prettier).mockRejectedValueOnce(new Error("ENOENT: prettier not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via config", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection via ignorePath", async () => {
    await expect(
      callAndValidate({ path: "/project", ignorePath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P0] flag injection via parser", async () => {
    await expect(callAndValidate({ path: "/project", parser: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P1] ignoreUnknown: true passes --ignore-unknown", async () => {
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", ignoreUnknown: true });
    const args = vi.mocked(prettier).mock.calls[0][0];
    expect(args).toContain("--ignore-unknown");
  });

  it("S9 [P1] custom config path passes --config", async () => {
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", config: ".prettierrc.json" });
    const args = vi.mocked(prettier).mock.calls[0][0];
    expect(args).toContain("--config=.prettierrc.json");
  });

  it("S10 [P2] tabWidth: 4 passes --tab-width=4", async () => {
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", tabWidth: 4 });
    const args = vi.mocked(prettier).mock.calls[0][0];
    expect(args).toContain("--tab-width=4");
  });

  it("S11 [P2] singleQuote: true passes --single-quote=true", async () => {
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", singleQuote: true });
    const args = vi.mocked(prettier).mock.calls[0][0];
    expect(args).toContain("--single-quote=true");
  });

  it("S12 [P0] schema validation", async () => {
    mockRunner(prettier, "src/index.ts\n", "", 1);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// prettier-format
// =============================================================================
describe("Smoke: prettier-format", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrettierFormatTool(server as never);
    handler = server.tools.get("prettier-format")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = FormatWriteResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] format files (some need formatting)", async () => {
    // First call: --list-different
    mockRunner(prettier, "src/index.ts\nsrc/app.ts\n", "", 1);
    // Second call: --write
    mockRunner(prettier, "src/index.ts\nsrc/app.ts\nsrc/util.ts\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThan(0);
    expect(parsed.files!.length).toBeGreaterThan(0);
  });

  it("S2 [P0] all already formatted", async () => {
    // First call: --list-different (no files need formatting)
    mockRunner(prettier, "", "", 0);
    // Second call: --write
    mockRunner(prettier, "src/index.ts\nsrc/app.ts\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  it("S3 [P0] Prettier not installed throws error", async () => {
    vi.mocked(prettier).mockRejectedValueOnce(new Error("ENOENT: prettier not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via config", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P1] ignoreUnknown: true passes --ignore-unknown", async () => {
    mockRunner(prettier, "", "", 0);
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", ignoreUnknown: true });
    // Check --list-different call args
    const firstCallArgs = vi.mocked(prettier).mock.calls[0][0];
    expect(firstCallArgs).toContain("--ignore-unknown");
  });

  it("S7 [P1] endOfLine: 'lf' passes --end-of-line=lf", async () => {
    mockRunner(prettier, "", "", 0);
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", endOfLine: "lf" });
    const writeArgs = vi.mocked(prettier).mock.calls[1][0];
    expect(writeArgs).toContain("--end-of-line=lf");
  });

  it("S8 [P2] cache: true passes --cache", async () => {
    mockRunner(prettier, "", "", 0);
    mockRunner(prettier, "", "", 0);
    await callAndValidate({ path: "/project", cache: true });
    const writeArgs = vi.mocked(prettier).mock.calls[1][0];
    expect(writeArgs).toContain("--cache");
  });

  it("S9 [P0] schema validation", async () => {
    mockRunner(prettier, "src/index.ts\n", "", 1);
    mockRunner(prettier, "src/index.ts\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// biome-check
// =============================================================================
describe("Smoke: biome-check", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerBiomeCheckTool(server as never);
    handler = server.tools.get("biome-check")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] clean project", async () => {
    mockRunner(biome, BIOME_CLEAN);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  it("S2 [P0] project with issues", async () => {
    mockRunner(biome, BIOME_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  it("S3 [P0] Biome not installed throws error", async () => {
    vi.mocked(biome).mockRejectedValueOnce(new Error("ENOENT: biome not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via since", async () => {
    await expect(callAndValidate({ path: "/project", since: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection via configPath", async () => {
    await expect(
      callAndValidate({ path: "/project", configPath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P0] flag injection via skip", async () => {
    await expect(callAndValidate({ path: "/project", skip: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S8 [P1] apply: true passes --apply", async () => {
    mockRunner(biome, BIOME_CLEAN);
    await callAndValidate({ path: "/project", apply: true });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--apply");
  });

  it("S9 [P1] diagnosticLevel: 'error' passes --diagnostic-level=error", async () => {
    mockRunner(biome, BIOME_CLEAN);
    await callAndValidate({ path: "/project", diagnosticLevel: "error" });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--diagnostic-level=error");
  });

  it("S10 [P1] changed: true passes --changed", async () => {
    mockRunner(biome, BIOME_CLEAN);
    await callAndValidate({ path: "/project", changed: true });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--changed");
  });

  it("S11 [P1] linterEnabled: false passes --linter-enabled=false", async () => {
    mockRunner(biome, BIOME_CLEAN);
    await callAndValidate({ path: "/project", linterEnabled: false });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--linter-enabled=false");
  });

  it("S12 [P2] maxDiagnostics: 5 passes --max-diagnostics=5", async () => {
    mockRunner(biome, BIOME_CLEAN);
    await callAndValidate({ path: "/project", maxDiagnostics: 5 });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--max-diagnostics=5");
  });

  it("S13 [P0] schema validation", async () => {
    mockRunner(biome, BIOME_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// biome-format
// =============================================================================
describe("Smoke: biome-format", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerBiomeFormatTool(server as never);
    handler = server.tools.get("biome-format")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = FormatWriteResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] format files (changes needed)", async () => {
    mockRunner(biome, BIOME_FORMAT_CHANGED, "", 0);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThan(0);
  });

  it("S2 [P0] all already formatted", async () => {
    mockRunner(biome, BIOME_FORMAT_CLEAN, "", 0);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  it("S3 [P0] Biome not installed throws error", async () => {
    vi.mocked(biome).mockRejectedValueOnce(new Error("ENOENT: biome not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via since", async () => {
    await expect(callAndValidate({ path: "/project", since: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection via configPath", async () => {
    await expect(
      callAndValidate({ path: "/project", configPath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P1] indentStyle: 'tab' passes --indent-style=tab", async () => {
    mockRunner(biome, BIOME_FORMAT_CLEAN, "", 0);
    await callAndValidate({ path: "/project", indentStyle: "tab" });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--indent-style=tab");
  });

  it("S8 [P1] quoteStyle: 'single' passes --quote-style=single", async () => {
    mockRunner(biome, BIOME_FORMAT_CLEAN, "", 0);
    await callAndValidate({ path: "/project", quoteStyle: "single" });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--quote-style=single");
  });

  it("S9 [P1] changed: true passes --changed", async () => {
    mockRunner(biome, BIOME_FORMAT_CLEAN, "", 0);
    await callAndValidate({ path: "/project", changed: true });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--changed");
  });

  it("S10 [P2] lineWidth: 120 passes --line-width=120", async () => {
    mockRunner(biome, BIOME_FORMAT_CLEAN, "", 0);
    await callAndValidate({ path: "/project", lineWidth: 120 });
    const args = vi.mocked(biome).mock.calls[0][0];
    expect(args).toContain("--line-width=120");
  });

  it("S11 [P0] schema validation", async () => {
    mockRunner(biome, BIOME_FORMAT_CHANGED, "", 0);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// oxlint
// =============================================================================
describe("Smoke: oxlint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerOxlintTool(server as never);
    handler = server.tools.get("oxlint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] clean project", async () => {
    mockRunner(oxlintCmd, OXLINT_CLEAN);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.errors).toBe(0);
  });

  it("S2 [P0] project with issues", async () => {
    mockRunner(oxlintCmd, OXLINT_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  it("S3 [P0] Oxlint not installed throws error", async () => {
    vi.mocked(oxlintCmd).mockRejectedValueOnce(new Error("ENOENT: oxlint not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via config", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection via deny", async () => {
    await expect(callAndValidate({ path: "/project", deny: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S7 [P0] flag injection via warn", async () => {
    await expect(callAndValidate({ path: "/project", warn: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S8 [P0] flag injection via allow", async () => {
    await expect(callAndValidate({ path: "/project", allow: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S9 [P0] flag injection via plugins", async () => {
    await expect(callAndValidate({ path: "/project", plugins: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S10 [P0] flag injection via tsconfig", async () => {
    await expect(callAndValidate({ path: "/project", tsconfig: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P0] flag injection via ignorePath", async () => {
    await expect(
      callAndValidate({ path: "/project", ignorePath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S12 [P1] fix: true passes --fix", async () => {
    mockRunner(oxlintCmd, OXLINT_CLEAN);
    await callAndValidate({ path: "/project", fix: true });
    const args = vi.mocked(oxlintCmd).mock.calls[0][0];
    expect(args).toContain("--fix");
  });

  it("S13 [P1] quiet: true passes --quiet", async () => {
    mockRunner(oxlintCmd, OXLINT_CLEAN);
    await callAndValidate({ path: "/project", quiet: true });
    const args = vi.mocked(oxlintCmd).mock.calls[0][0];
    expect(args).toContain("--quiet");
  });

  it("S14 [P1] deny specific rules passes -D flags", async () => {
    mockRunner(oxlintCmd, OXLINT_CLEAN);
    await callAndValidate({ path: "/project", deny: ["no-console"] });
    const args = vi.mocked(oxlintCmd).mock.calls[0][0];
    expect(args).toContain("-D");
    expect(args).toContain("no-console");
  });

  it("S15 [P0] schema validation", async () => {
    mockRunner(oxlintCmd, OXLINT_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// hadolint
// =============================================================================
describe("Smoke: hadolint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerHadolintTool(server as never);
    handler = server.tools.get("hadolint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] clean Dockerfile", async () => {
    mockRunner(hadolintCmd, HADOLINT_CLEAN);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.errors).toBe(0);
  });

  it("S2 [P0] Dockerfile with issues", async () => {
    mockRunner(hadolintCmd, HADOLINT_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project", compact: false });
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  it("S3 [P0] Hadolint not installed throws error", async () => {
    vi.mocked(hadolintCmd).mockRejectedValueOnce(new Error("ENOENT: hadolint not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] no Dockerfile found throws error", async () => {
    vi.mocked(hadolintCmd).mockRejectedValueOnce(new Error("Dockerfile not found"));
    await expect(callAndValidate({ path: "/project" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S6 [P0] flag injection via trustedRegistries", async () => {
    await expect(
      callAndValidate({ path: "/project", trustedRegistries: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S7 [P0] flag injection via ignoreRules", async () => {
    await expect(
      callAndValidate({ path: "/project", ignoreRules: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S8 [P0] flag injection via config", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection via requireLabel", async () => {
    await expect(
      callAndValidate({ path: "/project", requireLabel: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S10 [P0] flag injection via shell", async () => {
    await expect(callAndValidate({ path: "/project", shell: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P0] flag injection via errorRules", async () => {
    await expect(
      callAndValidate({ path: "/project", errorRules: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S12 [P0] flag injection via warningRules", async () => {
    await expect(
      callAndValidate({ path: "/project", warningRules: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S13 [P0] flag injection via infoRules", async () => {
    await expect(
      callAndValidate({ path: "/project", infoRules: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S14 [P1] ignoreRules: ['DL3008'] passes --ignore=DL3008", async () => {
    mockRunner(hadolintCmd, HADOLINT_CLEAN);
    await callAndValidate({ path: "/project", ignoreRules: ["DL3008"] });
    const args = vi.mocked(hadolintCmd).mock.calls[0][0];
    expect(args).toContain("--ignore=DL3008");
  });

  it("S15 [P1] failureThreshold: 'error' passes --failure-threshold=error", async () => {
    mockRunner(hadolintCmd, HADOLINT_CLEAN);
    await callAndValidate({ path: "/project", failureThreshold: "error" });
    const args = vi.mocked(hadolintCmd).mock.calls[0][0];
    expect(args).toContain("--failure-threshold=error");
  });

  it("S16 [P2] noFail: true passes --no-fail", async () => {
    mockRunner(hadolintCmd, HADOLINT_CLEAN);
    await callAndValidate({ path: "/project", noFail: true });
    const args = vi.mocked(hadolintCmd).mock.calls[0][0];
    expect(args).toContain("--no-fail");
  });

  it("S17 [P0] schema validation", async () => {
    mockRunner(hadolintCmd, HADOLINT_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// shellcheck
// =============================================================================
describe("Smoke: shellcheck", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerShellcheckTool(server as never);
    handler = server.tools.get("shellcheck")!.handler;
    // Default: resolveShellcheckPatterns returns the patterns as-is
    vi.mocked(resolveShellcheckPatterns).mockResolvedValue(["script.sh"]);
    vi.mocked(validateShellcheckPatterns).mockReturnValue(null);
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] clean shell script", async () => {
    mockRunner(shellcheckCmd, SHELLCHECK_CLEAN);
    const { parsed } = await callAndValidate({ path: "/project", patterns: ["script.sh"] });
    expect(parsed.errors).toBe(0);
  });

  it("S2 [P0] script with issues", async () => {
    mockRunner(shellcheckCmd, SHELLCHECK_WITH_ISSUES);
    const { parsed } = await callAndValidate({
      path: "/project",
      patterns: ["bad.sh"],
      compact: false,
    });
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  it("S3 [P0] no shell files found returns empty result", async () => {
    vi.mocked(resolveShellcheckPatterns).mockResolvedValue([]);
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.filesChecked).toBe(0);
  });

  it("S4 [P0] ShellCheck not installed throws error", async () => {
    vi.mocked(shellcheckCmd).mockRejectedValueOnce(new Error("ENOENT: shellcheck not found"));
    await expect(callAndValidate({ path: "/project", patterns: ["script.sh"] })).rejects.toThrow();
  });

  it("S5 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S6 [P0] flag injection via exclude", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["script.sh"], exclude: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S7 [P0] flag injection via enable", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["script.sh"], enable: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S8 [P0] flag injection via include", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["script.sh"], include: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S9 [P0] flag injection via rcfile", async () => {
    await expect(callAndValidate({ path: "/project", rcfile: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P0] flag injection via sourcePath", async () => {
    await expect(
      callAndValidate({ path: "/project", sourcePath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S11 [P1] severity: 'error' passes --severity=error", async () => {
    mockRunner(shellcheckCmd, SHELLCHECK_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["bad.sh"], severity: "error" });
    const args = vi.mocked(shellcheckCmd).mock.calls[0][0];
    expect(args).toContain("--severity=error");
  });

  it("S12 [P1] shell: 'bash' passes --shell=bash", async () => {
    mockRunner(shellcheckCmd, SHELLCHECK_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["script.sh"], shell: "bash" });
    const args = vi.mocked(shellcheckCmd).mock.calls[0][0];
    expect(args).toContain("--shell=bash");
  });

  it("S13 [P1] exclude: ['SC2086'] passes --exclude=SC2086", async () => {
    mockRunner(shellcheckCmd, SHELLCHECK_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["script.sh"], exclude: ["SC2086"] });
    const args = vi.mocked(shellcheckCmd).mock.calls[0][0];
    expect(args).toContain("--exclude=SC2086");
  });

  it("S14 [P1] directory expansion via resolveShellcheckPatterns", async () => {
    vi.mocked(resolveShellcheckPatterns).mockResolvedValue([
      "/project/scripts/build.sh",
      "/project/scripts/deploy.sh",
    ]);
    mockRunner(shellcheckCmd, SHELLCHECK_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["."] });
    const args = vi.mocked(shellcheckCmd).mock.calls[0][0];
    expect(args).toContain("/project/scripts/build.sh");
    expect(args).toContain("/project/scripts/deploy.sh");
  });

  it("S15 [P0] schema validation", async () => {
    mockRunner(shellcheckCmd, SHELLCHECK_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project", patterns: ["bad.sh"] });
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// stylelint
// =============================================================================
describe("Smoke: stylelint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerStylelintTool(server as never);
    handler = server.tools.get("stylelint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] clean CSS files", async () => {
    mockRunner(stylelintCmd, STYLELINT_CLEAN);
    const { parsed } = await callAndValidate({ path: "/project", patterns: ["*.css"] });
    expect(parsed.errors).toBe(0);
  });

  it("S2 [P0] CSS with issues", async () => {
    mockRunner(stylelintCmd, STYLELINT_WITH_ISSUES);
    const { parsed } = await callAndValidate({
      path: "/project",
      patterns: ["*.css"],
      compact: false,
    });
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  it("S3 [P0] Stylelint not installed throws error", async () => {
    vi.mocked(stylelintCmd).mockRejectedValueOnce(new Error("ENOENT: stylelint not found"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection via patterns", async () => {
    await expect(
      callAndValidate({ path: "/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection via config", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection via ignorePath", async () => {
    await expect(
      callAndValidate({ path: "/project", ignorePath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P1] fix: true passes --fix", async () => {
    mockRunner(stylelintCmd, STYLELINT_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["*.css"], fix: true });
    const args = vi.mocked(stylelintCmd).mock.calls[0][0];
    expect(args).toContain("--fix");
  });

  it("S8 [P1] quiet: true passes --quiet", async () => {
    mockRunner(stylelintCmd, STYLELINT_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["*.css"], quiet: true });
    const args = vi.mocked(stylelintCmd).mock.calls[0][0];
    expect(args).toContain("--quiet");
  });

  it("S9 [P1] allowEmptyInput: true passes --allow-empty-input", async () => {
    mockRunner(stylelintCmd, STYLELINT_CLEAN);
    await callAndValidate({
      path: "/project",
      patterns: ["*.nonexistent"],
      allowEmptyInput: true,
    });
    const args = vi.mocked(stylelintCmd).mock.calls[0][0];
    expect(args).toContain("--allow-empty-input");
  });

  it("S10 [P1] maxWarnings: 0 passes --max-warnings=0", async () => {
    mockRunner(stylelintCmd, STYLELINT_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["*.css"], maxWarnings: 0 });
    const args = vi.mocked(stylelintCmd).mock.calls[0][0];
    expect(args).toContain("--max-warnings=0");
  });

  it("S11 [P2] cache: true passes --cache", async () => {
    mockRunner(stylelintCmd, STYLELINT_CLEAN);
    await callAndValidate({ path: "/project", patterns: ["*.css"], cache: true });
    const args = vi.mocked(stylelintCmd).mock.calls[0][0];
    expect(args).toContain("--cache");
  });

  it("S12 [P0] schema validation", async () => {
    mockRunner(stylelintCmd, STYLELINT_WITH_ISSUES);
    const { parsed } = await callAndValidate({ path: "/project", patterns: ["*.css"] });
    expect(parsed).toBeDefined();
  });
});
