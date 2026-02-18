/**
 * Smoke tests: Go server tools — Phase 3 (recorded)
 *
 * Feeds realistic Go CLI output captured as fixtures through the tool
 * handlers. Validates that the parser, formatter, and schema chain works
 * correctly for each tool.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  GoBuildResultSchema,
  GoTestResultSchema,
  GoVetResultSchema,
  GoFmtResultSchema,
  GoEnvResultSchema,
  GoListResultSchema,
  GolangciLintResultSchema,
} from "../../../packages/server-go/src/schemas/index.js";

// Mock the Go runner module used by all Go tools
vi.mock("../../../packages/server-go/src/lib/go-runner.js", () => ({
  goCmd: vi.fn(),
  gofmtCmd: vi.fn(),
  golangciLintCmd: vi.fn(),
}));

// Mock fs for mod-tidy and get tools (readFile for go.mod diffing)
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { goCmd, gofmtCmd, golangciLintCmd } from "../../../packages/server-go/src/lib/go-runner.js";
import { registerBuildTool } from "../../../packages/server-go/src/tools/build.js";
import { registerTestTool } from "../../../packages/server-go/src/tools/test.js";
import { registerVetTool } from "../../../packages/server-go/src/tools/vet.js";
import { registerFmtTool } from "../../../packages/server-go/src/tools/fmt.js";
import { registerEnvTool } from "../../../packages/server-go/src/tools/env.js";
import { registerListTool } from "../../../packages/server-go/src/tools/list.js";
import { registerGolangciLintTool } from "../../../packages/server-go/src/tools/golangci-lint.js";

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

const FIXTURE_DIR = resolve(__dirname, "../fixtures/go");

function loadFixture(subdir: string, name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, subdir, name), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// build tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerBuildTool(server as never);
    handler = server.tools.get("build")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoBuildResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] successful build", async () => {
    // First call: go list -json -deps (cache estimate)
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "",
      exitCode: 0,
    });
    // Second call: go build
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: loadFixture("build", "s01-success.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      race: false,
      trimpath: false,
      verbose: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(0);
    expect(parsed.errors).toEqual([]);
  });

  it("S2 [recorded] build errors", async () => {
    const fixture = loadFixture("build", "s02-errors.txt");
    // First call: go list -json -deps (cache estimate)
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "",
      exitCode: 0,
    });
    // Second call: go build — errors on stderr
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: fixture,
      exitCode: 1,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      race: false,
      trimpath: false,
      verbose: false,
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.errors!.length).toBe(2);
    expect(parsed.errors![0].file).toBe("./main.go");
    expect(parsed.errors![0].line).toBe(10);
    expect(parsed.errors![0].column).toBe(2);
    expect(parsed.errors![0].message).toBe("undefined: foo");
    expect(parsed.errors![1].file).toBe("./main.go");
    expect(parsed.errors![1].line).toBe(15);
    expect(parsed.total).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// test tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.test", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerTestTool(server as never);
    handler = server.tools.get("test")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoTestResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] all tests pass", async () => {
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: loadFixture("test", "s01-pass.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      failfast: false,
      short: false,
      race: false,
      benchmem: false,
      cover: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(2);
    expect(parsed.passed).toBe(2);
    expect(parsed.failed).toBe(0);
    expect(parsed.skipped).toBe(0);
    expect(parsed.tests![0].name).toBe("TestAdd");
    expect(parsed.tests![0].status).toBe("pass");
    expect(parsed.tests![1].name).toBe("TestSub");
    expect(parsed.tests![1].status).toBe("pass");
  });

  it("S2 [recorded] test failures", async () => {
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: loadFixture("test", "s02-failures.txt"),
      stderr: "",
      exitCode: 1,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      failfast: false,
      short: false,
      race: false,
      benchmem: false,
      cover: false,
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.total).toBe(2);
    expect(parsed.passed).toBe(1);
    expect(parsed.failed).toBe(1);
    expect(parsed.tests![0].name).toBe("TestAdd");
    expect(parsed.tests![0].status).toBe("pass");
    expect(parsed.tests![1].name).toBe("TestSub");
    expect(parsed.tests![1].status).toBe("fail");
    // Failed test should have output attached
    expect(parsed.tests![1].output).toBeDefined();
    expect(parsed.tests![1].output).toContain("expected 2, got 3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// vet tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.vet", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerVetTool(server as never);
    handler = server.tools.get("vet")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoVetResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] clean — no issues", async () => {
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: loadFixture("vet", "s01-clean.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("S2 [recorded] vet issues found", async () => {
    const fixture = loadFixture("vet", "s02-issues.txt");
    // vet issues come on stderr in text mode (fallback from -json)
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: fixture,
      exitCode: 1,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.total).toBe(2);
    expect(parsed.diagnostics!.length).toBe(2);
    expect(parsed.diagnostics![0].file).toBe("./main.go");
    expect(parsed.diagnostics![0].line).toBe(12);
    expect(parsed.diagnostics![0].message).toContain("Printf format");
    expect(parsed.diagnostics![1].file).toBe("./main.go");
    expect(parsed.diagnostics![1].line).toBe(20);
    expect(parsed.diagnostics![1].message).toContain("unreachable code");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fmt tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.fmt", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerFmtTool(server as never);
    handler = server.tools.get("fmt")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoFmtResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] all formatted — no changes", async () => {
    vi.mocked(gofmtCmd).mockResolvedValueOnce({
      stdout: loadFixture("fmt", "s01-formatted.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      patterns: ["."],
      check: true,
      diff: false,
      simplify: false,
      allErrors: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
    expect(parsed.files).toEqual([]);
  });

  it("S2 [recorded] unformatted files detected", async () => {
    vi.mocked(gofmtCmd).mockResolvedValueOnce({
      stdout: loadFixture("fmt", "s02-unformatted.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      patterns: ["."],
      check: true,
      diff: false,
      simplify: false,
      allErrors: false,
      compact: false,
    });
    // In check mode with files listed, success should be false
    expect(parsed.success).toBe(false);
    expect(parsed.filesChanged).toBe(2);
    expect(parsed.files).toContain("main.go");
    expect(parsed.files).toContain("internal/handler.go");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// env tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.env", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerEnvTool(server as never);
    handler = server.tools.get("env")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoEnvResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] full environment", async () => {
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: loadFixture("env", "s01-full.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      changed: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.goroot).toBe("/usr/local/go");
    expect(parsed.gopath).toBe("/home/user/go");
    expect(parsed.goversion).toBe("go1.22.0");
    expect(parsed.goos).toBe("linux");
    expect(parsed.goarch).toBe("amd64");
    expect(parsed.cgoEnabled).toBe(true);
    expect(parsed.vars).toBeDefined();
    expect(parsed.vars!["GOROOT"]).toBe("/usr/local/go");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// list tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerListTool(server as never);
    handler = server.tools.get("list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] list packages", async () => {
    vi.mocked(goCmd).mockResolvedValueOnce({
      stdout: loadFixture("list", "s01-packages.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["./..."],
      modules: false,
      updates: false,
      deps: false,
      tolerateErrors: false,
      versions: false,
      find: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(2);
    expect(parsed.packages!.length).toBe(2);
    expect(parsed.packages![0].importPath).toBe("my-app");
    expect(parsed.packages![0].name).toBe("main");
    expect(parsed.packages![0].goFiles).toContain("main.go");
    expect(parsed.packages![1].importPath).toBe("my-app/internal/handler");
    expect(parsed.packages![1].name).toBe("handler");
    expect(parsed.packages![1].imports).toContain("net/http");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// golangci-lint tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: go.golangci-lint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(goCmd).mockReset();
    vi.mocked(gofmtCmd).mockReset();
    vi.mocked(golangciLintCmd).mockReset();
    const server = new FakeServer();
    registerGolangciLintTool(server as never);
    handler = server.tools.get("golangci-lint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GolangciLintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] clean — no issues", async () => {
    vi.mocked(golangciLintCmd).mockResolvedValueOnce({
      stdout: loadFixture("golangci-lint", "s01-clean.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      patterns: ["./..."],
      fix: false,
      fast: false,
      new: false,
      sortResults: false,
      compact: false,
    });
    expect(parsed.total).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  it("S2 [recorded] lint issues found", async () => {
    vi.mocked(golangciLintCmd).mockResolvedValueOnce({
      stdout: loadFixture("golangci-lint", "s02-issues.txt"),
      stderr: "",
      exitCode: 1,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      patterns: ["./..."],
      fix: false,
      fast: false,
      new: false,
      sortResults: false,
      compact: false,
    });
    expect(parsed.total).toBe(2);
    expect(parsed.warnings).toBe(2);
    expect(parsed.errors).toBe(0);
    expect(parsed.diagnostics!.length).toBe(2);
    expect(parsed.diagnostics![0].linter).toBe("govet");
    expect(parsed.diagnostics![0].file).toBe("main.go");
    expect(parsed.diagnostics![0].line).toBe(12);
    expect(parsed.diagnostics![0].severity).toBe("warning");
    expect(parsed.diagnostics![0].category).toBe("bug-risk");
    expect(parsed.diagnostics![1].linter).toBe("errcheck");
    expect(parsed.diagnostics![1].file).toBe("main.go");
    expect(parsed.diagnostics![1].line).toBe(25);
    expect(parsed.diagnostics![1].category).toBe("bug-risk");
    // byLinter summary
    expect(parsed.byLinter!.length).toBe(2);
  });
});
