/**
 * Smoke tests: cargo tools — Phase 3 (recorded)
 *
 * Feeds realistic Cargo CLI output through each tool handler, validating
 * that the parser, formatter, and schema chain works with genuine output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  CargoBuildResultSchema,
  CargoTestResultSchema,
  CargoClippyResultSchema,
  CargoFmtResultSchema,
  CargoTreeResultSchema,
} from "../../../packages/server-cargo/src/schemas/index.js";

// Mock the cargo runner — single function used by all tools
vi.mock("../../../packages/server-cargo/src/lib/cargo-runner.js", () => ({
  cargo: vi.fn(),
}));

import { cargo } from "../../../packages/server-cargo/src/lib/cargo-runner.js";
import { registerBuildTool } from "../../../packages/server-cargo/src/tools/build.js";
import { registerTestTool } from "../../../packages/server-cargo/src/tools/test.js";
import { registerClippyTool } from "../../../packages/server-cargo/src/tools/clippy.js";
import { registerFmtTool } from "../../../packages/server-cargo/src/tools/fmt.js";
import { registerTreeTool } from "../../../packages/server-cargo/src/tools/tree.js";

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
  return readFileSync(resolve(__dirname, "../fixtures/cargo", dir, name), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// cargo build (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: cargo.build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(cargo).mockReset();
    const server = new FakeServer();
    registerBuildTool(server as never);
    handler = server.tools.get("build")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoBuildResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] successful build", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("build", "s01-success.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      release: false,
      keepGoing: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
    expect(parsed.total).toBe(0);
  });

  it("S2 [recorded] build with compile errors", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("build", "s02-errors.txt"),
      stderr: "",
      exitCode: 101,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      release: false,
      keepGoing: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.errors).toBe(1);
    expect(parsed.total).toBeGreaterThanOrEqual(1);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics![0].file).toBe("src/main.rs");
    expect(parsed.diagnostics![0].severity).toBe("error");
    expect(parsed.diagnostics![0].code).toBe("E0308");
    expect(parsed.diagnostics![0].suggestion).toBe(
      "try using a conversion method: `.parse::<i32>()`",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// cargo test (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: cargo.test", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(cargo).mockReset();
    const server = new FakeServer();
    registerTestTool(server as never);
    handler = server.tools.get("test")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoTestResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] all tests passing", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("test", "s01-pass.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      noFailFast: false,
      noRun: false,
      release: false,
      doc: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(3);
    expect(parsed.passed).toBe(3);
    expect(parsed.failed).toBe(0);
    expect(parsed.ignored).toBe(0);
    expect(parsed.duration).toBe("0.02s");
    expect(parsed.tests![0].name).toBe("tests::test_add");
    expect(parsed.tests![0].status).toBe("ok");
  });

  it("S2 [recorded] test with failures", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("test", "s02-failures.txt"),
      stderr: "",
      exitCode: 101,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      noFailFast: false,
      noRun: false,
      release: false,
      doc: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.total).toBe(3);
    expect(parsed.passed).toBe(2);
    expect(parsed.failed).toBe(1);
    expect(parsed.ignored).toBe(0);
    expect(parsed.duration).toBe("0.03s");
    const failedTest = parsed.tests!.find((t) => t.status === "FAILED");
    expect(failedTest).toBeDefined();
    expect(failedTest!.name).toBe("tests::test_sub");
    expect(failedTest!.output).toContain("assertion");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// cargo clippy (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: cargo.clippy", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(cargo).mockReset();
    const server = new FakeServer();
    registerClippyTool(server as never);
    handler = server.tools.get("clippy")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoClippyResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] clean — no warnings", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("clippy", "s01-clean.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      noDeps: false,
      allTargets: false,
      release: false,
      fix: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(0);
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  it("S2 [recorded] clippy with warnings", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("clippy", "s02-warnings.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      noDeps: false,
      allTargets: false,
      release: false,
      fix: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
    expect(parsed.warnings).toBe(1);
    expect(parsed.errors).toBe(0);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics![0].code).toBe("clippy::redundant_clone");
    expect(parsed.diagnostics![0].file).toBe("src/main.rs");
    expect(parsed.diagnostics![0].line).toBe(10);
    expect(parsed.diagnostics![0].suggestion).toBe("remove this `.clone()` call");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// cargo fmt (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: cargo.fmt", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(cargo).mockReset();
    const server = new FakeServer();
    registerFmtTool(server as never);
    handler = server.tools.get("fmt")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoFmtResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] already formatted — check mode", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("fmt", "s01-formatted.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      check: true,
      includeDiff: false,
      all: false,
      backup: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.needsFormatting).toBe(false);
    expect(parsed.filesChanged).toBe(0);
    expect(parsed.files).toEqual([]);
  });

  it("S2 [recorded] needs formatting — check mode with diff", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("fmt", "s02-needs-formatting.txt"),
      stderr: "",
      exitCode: 1,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      check: true,
      includeDiff: true,
      all: false,
      backup: false,
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.needsFormatting).toBe(true);
    expect(parsed.filesChanged).toBe(2);
    expect(parsed.files).toContain("/project/src/main.rs");
    expect(parsed.files).toContain("/project/src/lib.rs");
    expect(parsed.diff).toBeDefined();
    expect(parsed.diff).toContain("-    let x=1;");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// cargo tree (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: cargo.tree", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(cargo).mockReset();
    const server = new FakeServer();
    registerTreeTool(server as never);
    handler = server.tools.get("tree")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoTreeResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] dependency tree", async () => {
    vi.mocked(cargo).mockResolvedValueOnce({
      stdout: loadFixture("tree", "s01-tree.txt"),
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      duplicates: false,
      allFeatures: false,
      noDefaultFeatures: false,
      locked: false,
      frozen: false,
      offline: false,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.packages).toBeGreaterThan(0);
    expect(parsed.tree).toBeDefined();
    expect(parsed.tree).toContain("serde");
    expect(parsed.tree).toContain("tokio");
    expect(parsed.dependencies).toBeDefined();
    // Root package is my-app at depth 0
    const root = parsed.dependencies!.find((d) => d.name === "my-app");
    expect(root).toBeDefined();
    expect(root!.depth).toBe(0);
    // serde is at depth 1
    const serde = parsed.dependencies!.find((d) => d.name === "serde");
    expect(serde).toBeDefined();
    expect(serde!.depth).toBe(1);
    expect(serde!.version).toBe("1.0.200");
  });
});
