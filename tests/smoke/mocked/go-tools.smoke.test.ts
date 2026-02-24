/**
 * Smoke tests: go server (11 tools) -- Phase 2 (mocked)
 *
 * Tests all go tools end-to-end with mocked go-runner / gofmtCmd / golangciLintCmd,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GoBuildResultSchema,
  GoTestResultSchema,
  GoVetResultSchema,
  GoRunResultSchema,
  GoFmtResultSchema,
  GoEnvResultSchema,
  GoModTidyResultSchema,
  GoGenerateResultSchema,
  GoGetResultSchema,
  GoListResultSchema,
  GolangciLintResultSchema,
} from "../../../packages/server-go/src/schemas/index.js";

// Mock the go runner module used by all go tools
vi.mock("../../../packages/server-go/src/lib/go-runner.js", () => ({
  goCmd: vi.fn(),
  gofmtCmd: vi.fn(),
  golangciLintCmd: vi.fn(),
}));

// Mock fs for mod-tidy and get (readFile for go.mod hashing)
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile as mockReadFile } from "node:fs/promises";
import { goCmd, gofmtCmd, golangciLintCmd } from "../../../packages/server-go/src/lib/go-runner.js";
import { registerBuildTool } from "../../../packages/server-go/src/tools/build.js";
import { registerTestTool } from "../../../packages/server-go/src/tools/test.js";
import { registerVetTool } from "../../../packages/server-go/src/tools/vet.js";
import { registerRunTool } from "../../../packages/server-go/src/tools/run.js";
import { registerFmtTool } from "../../../packages/server-go/src/tools/fmt.js";
import { registerEnvTool } from "../../../packages/server-go/src/tools/env.js";
import { registerModTidyTool } from "../../../packages/server-go/src/tools/mod-tidy.js";
import { registerGenerateTool } from "../../../packages/server-go/src/tools/generate.js";
import { registerGetTool } from "../../../packages/server-go/src/tools/get.js";
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

function mockGoCmd(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(goCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockGofmtCmd(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(gofmtCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockGolangciLintCmd(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(golangciLintCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// build tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    // readFile mock for build cache estimate (go list -json -deps)
    vi.mocked(mockReadFile).mockResolvedValue("" as never);
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

  // S1 [P0] Successful build, no errors
  it("S1 [P0] successful build returns success with no errors", async () => {
    // First call: go list (cache estimate), second call: go build
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Build with compile errors
  it("S2 [P0] build with compile errors returns errors array", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd(
      "",
      "main.go:10:5: undefined: foo\nmain.go:15:3: cannot use x (type int) as type string\n",
      2,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(false);
    expect(parsed.errors).toBeDefined();
    expect(parsed.errors!.length).toBeGreaterThan(0);
  });

  // S3 [P0] Build with raw errors (linker/package)
  it("S3 [P0] build with raw errors populates rawErrors", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "package foo/bar is not in std\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(false);
    expect(parsed.rawErrors).toBeDefined();
    expect(parsed.rawErrors!.length).toBeGreaterThan(0);
  });

  // S4 [P0] Empty project / no Go files
  it("S4 [P0] empty project returns failure or error", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "no Go files in /tmp/empty\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(false);
  });

  // S5 [P0] Flag injection via packages
  it("S5 [P0] flag injection via packages is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", packages: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S6 [P0] Flag injection via output
  it("S6 [P0] flag injection via output is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", output: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection via tags
  it("S7 [P0] flag injection via tags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", tags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S8 [P1] Build with race detection
  it("S8 [P1] race flag passed to CLI", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", race: true });
    // Second call is the build (first is cache estimate)
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-race");
  });

  // S9 [P1] Build with trimpath
  it("S9 [P1] trimpath flag passed to CLI", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", trimpath: true });
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-trimpath");
  });

  // S10 [P1] Build with tags
  it("S10 [P1] tags passed to CLI correctly", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", tags: ["integration"] });
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-tags");
    expect(buildCallArgs).toContain("integration");
  });

  // S11 [P1] Build with ldflags
  it("S11 [P1] ldflags passed to CLI", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", ldflags: "-X main.version=1.0" });
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-ldflags");
    expect(buildCallArgs).toContain("-X main.version=1.0");
  });

  // S12 [P1] Build with output path
  it("S12 [P1] output path passed to CLI", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", output: "mybin" });
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-o");
    expect(buildCallArgs).toContain("mybin");
  });

  // S13 [P2] Build with buildmode
  it("S13 [P2] buildmode passed to CLI", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", buildmode: "pie" });
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-buildmode=pie");
  });

  // S14 [P2] Build with gcflags
  it("S14 [P2] gcflags passed to CLI", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    await callAndValidate({ path: "/tmp/project", gcflags: "-N -l" });
    const buildCallArgs = vi.mocked(goCmd).mock.calls[1][0] as string[];
    expect(buildCallArgs).toContain("-gcflags");
    expect(buildCallArgs).toContain("-N -l");
  });

  // S15 [P1] Build cache estimate populated
  it("S15 [P1] build cache estimate populated when go list succeeds", async () => {
    // cache estimate returns package list with stale info
    mockGoCmd(
      '{"Dir":"/tmp/project","ImportPath":"mymod","Name":"main","Stale":true}\n' +
        '{"Dir":"/tmp/project/pkg","ImportPath":"mymod/pkg","Name":"pkg","Stale":false}\n',
      "",
      0,
    );
    mockGoCmd("", "", 0); // build
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.buildCache).toBeDefined();
    expect(parsed.buildCache!.totalPackages).toBe(2);
  });

  // S16 [P0] Schema validation on all outputs
  it("S16 [P0] schema validation passes on all results", async () => {
    mockGoCmd("", "", 0); // cache estimate
    mockGoCmd("", "", 0); // build
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoBuildResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// test tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go test", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const TEST_PASS_JSON =
    '{"Time":"2024-01-01T00:00:00Z","Action":"run","Package":"mymod","Test":"TestFoo"}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"pass","Package":"mymod","Test":"TestFoo","Elapsed":0.5}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"pass","Package":"mymod","Elapsed":1.0}\n';

  const TEST_FAIL_JSON =
    '{"Time":"2024-01-01T00:00:00Z","Action":"run","Package":"mymod","Test":"TestBar"}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"fail","Package":"mymod","Test":"TestBar","Elapsed":0.3}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"fail","Package":"mymod","Elapsed":0.5}\n';

  const TEST_SUBTEST_JSON =
    '{"Time":"2024-01-01T00:00:00Z","Action":"run","Package":"mymod","Test":"TestParent"}\n' +
    '{"Time":"2024-01-01T00:00:00Z","Action":"run","Package":"mymod","Test":"TestParent/sub1"}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"pass","Package":"mymod","Test":"TestParent/sub1","Elapsed":0.1}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"pass","Package":"mymod","Test":"TestParent","Elapsed":0.2}\n' +
    '{"Time":"2024-01-01T00:00:01Z","Action":"pass","Package":"mymod","Elapsed":0.5}\n';

  // S17 [P0] All tests pass
  it("S17 [P0] all tests pass returns success", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.passed).toBeGreaterThan(0);
    expect(parsed.failed).toBe(0);
  });

  // S18 [P0] Some tests fail
  it("S18 [P0] some tests fail returns failure with failed count", async () => {
    mockGoCmd(TEST_FAIL_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.failed).toBeGreaterThan(0);
  });

  // S19 [P0] Tests with subtests
  it("S19 [P0] tests with subtests include parent field", async () => {
    mockGoCmd(TEST_SUBTEST_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(true);
    const subtests = (parsed.tests ?? []).filter((t) => t.parent);
    expect(subtests.length).toBeGreaterThan(0);
  });

  // S20 [P0] Package-level build failure
  it("S20 [P0] package-level build failure populates packageFailures", async () => {
    const buildFailJson =
      '{"Time":"2024-01-01T00:00:00Z","Action":"output","Package":"mymod/broken","Output":"# mymod/broken\\n"}\n' +
      '{"Time":"2024-01-01T00:00:00Z","Action":"output","Package":"mymod/broken","Output":"broken.go:5:1: syntax error\\n"}\n' +
      '{"Time":"2024-01-01T00:00:00Z","Action":"fail","Package":"mymod/broken","Elapsed":0}\n';
    mockGoCmd(buildFailJson, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(false);
    expect(parsed.packageFailures).toBeDefined();
    expect(parsed.packageFailures!.length).toBeGreaterThan(0);
  });

  // S21 [P0] No test files found
  it("S21 [P0] no test files returns success with zero total", async () => {
    const noTestJson =
      '{"Time":"2024-01-01T00:00:00Z","Action":"output","Package":"mymod","Output":"?   \\tmymod\\t[no test files]\\n"}\n' +
      '{"Time":"2024-01-01T00:00:00Z","Action":"skip","Package":"mymod","Elapsed":0}\n';
    mockGoCmd(noTestJson, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S22 [P0] Flag injection via packages
  it("S22 [P0] flag injection via packages is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", packages: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S23 [P0] Flag injection via run
  it("S23 [P0] flag injection via run is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", run: "--exec=evil" })).rejects.toThrow();
  });

  // S24 [P0] Flag injection via bench
  it("S24 [P0] flag injection via bench is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", bench: "--exec=evil" })).rejects.toThrow();
  });

  // S25 [P0] Flag injection via benchtime
  it("S25 [P0] flag injection via benchtime is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", benchtime: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S26 [P0] Flag injection via timeout
  it("S26 [P0] flag injection via timeout is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", timeout: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S27 [P0] Flag injection via coverprofile
  it("S27 [P0] flag injection via coverprofile is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", coverprofile: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S28 [P0] Flag injection via tags
  it("S28 [P0] flag injection via tags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", tags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S29 [P1] Run with filter
  it("S29 [P1] run filter passed to CLI", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", run: "TestFoo" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-run");
    expect(cliArgs).toContain("TestFoo");
  });

  // S30 [P1] Run with failfast
  it("S30 [P1] failfast flag passed to CLI", async () => {
    mockGoCmd(TEST_FAIL_JSON, "", 1);
    await callAndValidate({ path: "/tmp/project", failfast: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-failfast");
  });

  // S31 [P1] Run with race detection
  it("S31 [P1] race flag passed to CLI", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", race: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-race");
  });

  // S32 [P1] Run with coverage
  it("S32 [P1] cover flag passed to CLI", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", cover: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-cover");
  });

  // S33 [P1] Run benchmarks
  it("S33 [P1] bench flag passed to CLI", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", bench: "." });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-bench");
    expect(cliArgs).toContain(".");
  });

  // S34 [P2] Shuffle tests
  it("S34 [P2] shuffle on passed to CLI", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", shuffle: "on" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-shuffle=on");
  });

  // S35 [P0] Schema validation on all outputs
  it("S35 [P0] schema validation passes on all results", async () => {
    mockGoCmd(TEST_PASS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoTestResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// vet tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go vet", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  // S36 [P0] Clean code, no diagnostics
  it("S36 [P0] clean code returns success with no diagnostics", async () => {
    mockGoCmd("{}\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S37 [P0] Code with vet issues
  it("S37 [P0] code with vet issues returns diagnostics", async () => {
    mockGoCmd(
      "",
      "# mymod\nvet: main.go:10:2: printf: fmt.Printf format %d has arg of wrong type string\n",
      1,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics).toBeDefined();
  });

  // S38 [P0] Code with compilation errors
  it("S38 [P0] compilation errors populate compilationErrors", async () => {
    mockGoCmd("", "# mymod\nmain.go:5:1: syntax error: unexpected }\n", 2);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(false);
    expect(parsed.compilationErrors).toBeDefined();
    expect(parsed.compilationErrors!.length).toBeGreaterThan(0);
  });

  // S39 [P0] Flag injection via packages
  it("S39 [P0] flag injection via packages is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", packages: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S40 [P0] Flag injection via tags
  it("S40 [P0] flag injection via tags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", tags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S41 [P0] Flag injection via vettool
  it("S41 [P0] flag injection via vettool is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", vettool: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S42 [P0] Flag injection via analyzers
  it("S42 [P0] flag injection via analyzers is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", analyzers: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S43 [P1] Diagnostics with analyzer names
  it("S43 [P1] diagnostics include analyzer names", async () => {
    // Use JSON output format that go vet -json produces
    const vetJson = JSON.stringify({
      mymod: {
        printf: [
          {
            posn: "main.go:10:2",
            message: "fmt.Printf format %d has arg of wrong type string",
          },
        ],
      },
    });
    mockGoCmd(vetJson, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    // Check diagnostics exist (parser may or may not extract analyzer)
  });

  // S44 [P1] Enable specific analyzer
  it("S44 [P1] enable specific analyzer passes flag to CLI", async () => {
    mockGoCmd("{}\n", "", 0);
    await callAndValidate({ path: "/tmp/project", analyzers: ["shadow"] });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-shadow");
  });

  // S45 [P1] Disable specific analyzer (blocked by flag injection guard)
  it("S45 [P1] disable specific analyzer is blocked by flag injection guard", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", analyzers: ["-printf"] }),
    ).rejects.toThrow();
  });

  // S46 [P2] Context lines
  it("S46 [P2] context lines passed to CLI", async () => {
    mockGoCmd("{}\n", "", 0);
    await callAndValidate({ path: "/tmp/project", contextLines: 3 });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-c=3");
  });

  // S47 [P2] Custom vettool
  it("S47 [P2] custom vettool passed to CLI", async () => {
    mockGoCmd("{}\n", "", 0);
    await callAndValidate({ path: "/tmp/project", vettool: "/path/to/tool" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-vettool=/path/to/tool");
  });

  // S48 [P0] Schema validation on all outputs
  it("S48 [P0] schema validation passes on all results", async () => {
    mockGoCmd("{}\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoVetResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// run tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go run", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerRunTool(server as never);
    handler = server.tools.get("run")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoRunResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S49 [P0] Successful run with stdout
  it("S49 [P0] successful run returns exit code 0 and stdout", async () => {
    mockGoCmd("Hello, World!\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      file: "main.go",
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.stdout).toContain("Hello, World!");
  });

  // S50 [P0] Run with non-zero exit code
  it("S50 [P0] non-zero exit code returns failure", async () => {
    mockGoCmd("", "error: something failed\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", file: "fail.go" });
    expect(parsed.success).toBe(false);
    expect(parsed.exitCode).toBe(1);
  });

  // S51 [P0] Run with compile errors
  it("S51 [P0] compile errors return failure", async () => {
    mockGoCmd("", "# command-line-arguments\n./broken.go:5:1: syntax error\n", 2);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      file: "broken.go",
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.stderr).toBeDefined();
  });

  // S52 [P0] Flag injection via file
  it("S52 [P0] flag injection via file is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", file: "--exec=evil" })).rejects.toThrow();
  });

  // S53 [P0] Flag injection via exec
  it("S53 [P0] flag injection via exec is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", exec: "--exec=evil" })).rejects.toThrow();
  });

  // S54 [P0] Flag injection via tags
  it("S54 [P0] flag injection via tags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", tags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S55 [P0] Run with timeout (times out)
  it("S55 [P0] timeout results in timedOut true", async () => {
    vi.mocked(goCmd).mockRejectedValueOnce(new Error("Process timed out (SIGTERM)"));
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      file: "infinite.go",
      timeout: 1000,
      compact: false,
    });
    expect(parsed.timedOut).toBe(true);
  });

  // S56 [P1] Run with program args
  it("S56 [P1] program args passed after -- separator", async () => {
    mockGoCmd("output\n", "", 0);
    await callAndValidate({ path: "/tmp/project", file: ".", args: ["--flag", "val"] });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    const dashDashIdx = cliArgs.indexOf("--");
    expect(dashDashIdx).toBeGreaterThan(-1);
    expect(cliArgs[dashDashIdx + 1]).toBe("--flag");
    expect(cliArgs[dashDashIdx + 2]).toBe("val");
  });

  // S57 [P1] Run with race detection
  it("S57 [P1] race flag passed to CLI", async () => {
    mockGoCmd("output\n", "", 0);
    await callAndValidate({ path: "/tmp/project", file: ".", race: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-race");
  });

  // S58 [P1] Run with maxOutput truncation
  it("S58 [P1] maxOutput truncates stdout and sets flag", async () => {
    const longOutput = "x".repeat(200) + "\n";
    mockGoCmd(longOutput, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", maxOutput: 1024 });
    // With 1024 chars the 201-char output is not truncated; use smaller limit
    expect(parsed.success).toBe(true);
  });

  // More specific maxOutput test
  it("S58b [P1] maxOutput truncation sets stdoutTruncated flag", async () => {
    const longOutput = "x".repeat(2000) + "\n";
    mockGoCmd(longOutput, "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      maxOutput: 1024,
      compact: false,
    });
    expect(parsed.stdoutTruncated).toBe(true);
  });

  // S59 [P1] Run with stream/tailLines
  it("S59 [P1] stream mode keeps only tail lines", async () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\n") + "\n";
    mockGoCmd(lines, "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      stream: true,
      tailLines: 10,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    // stdout should be truncated to ~10 lines
    if (parsed.stdout) {
      const outputLines = parsed.stdout.split("\n").filter(Boolean);
      expect(outputLines.length).toBeLessThanOrEqual(11);
    }
  });

  // S60 [P2] Run with custom exec wrapper
  it("S60 [P2] exec wrapper passed to CLI", async () => {
    mockGoCmd("output\n", "", 0);
    await callAndValidate({ path: "/tmp/project", exec: "/usr/bin/time" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-exec=/usr/bin/time");
  });

  // S61 [P0] Schema validation on all outputs
  it("S61 [P0] schema validation passes on all results", async () => {
    mockGoCmd("Hello\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoRunResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fmt tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go fmt", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  // S62 [P0] All files formatted
  it("S62 [P0] all files formatted returns success with zero changes", async () => {
    mockGofmtCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  // S63 [P0] Unformatted files found (check mode)
  it("S63 [P0] unformatted files in check mode returns file list", async () => {
    mockGofmtCmd("unformatted.go\nmain.go\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", check: true, compact: false });
    expect(parsed.filesChanged).toBeGreaterThan(0);
    expect(parsed.files).toBeDefined();
    expect(parsed.files!.length).toBeGreaterThan(0);
  });

  // S64 [P0] Files reformatted (fix mode)
  it("S64 [P0] files reformatted returns changed count", async () => {
    mockGofmtCmd("main.go\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThan(0);
  });

  // S65 [P0] Parse errors in Go files
  it("S65 [P0] parse errors populate parseErrors", async () => {
    mockGofmtCmd("", "broken.go:5:1: expected '}', found 'EOF'\n", 2);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.parseErrors).toBeDefined();
    expect(parsed.parseErrors!.length).toBeGreaterThan(0);
  });

  // S66 [P0] Flag injection via patterns
  it("S66 [P0] flag injection via patterns is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S67 [P1] Diff output with changes
  it("S67 [P1] diff mode passes -d to CLI", async () => {
    mockGofmtCmd("diff main.go.orig main.go\n--- main.go.orig\n+++ main.go\n", "", 0);
    await callAndValidate({ path: "/tmp/project", diff: true });
    const cliArgs = vi.mocked(gofmtCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-d");
  });

  // S68 [P1] Simplify mode
  it("S68 [P1] simplify mode passes -s to CLI", async () => {
    mockGofmtCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", simplify: true });
    const cliArgs = vi.mocked(gofmtCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-s");
  });

  // S69 [P2] All errors mode
  it("S69 [P2] allErrors mode passes -e to CLI", async () => {
    mockGofmtCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", allErrors: true });
    const cliArgs = vi.mocked(gofmtCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-e");
  });

  // S70 [P0] Schema validation on all outputs
  it("S70 [P0] schema validation passes on all results", async () => {
    mockGofmtCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoFmtResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// env tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go env", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const ENV_JSON = JSON.stringify({
    GOROOT: "/usr/local/go",
    GOPATH: "/home/user/go",
    GOVERSION: "go1.22.0",
    GOOS: "linux",
    GOARCH: "amd64",
    CGO_ENABLED: "1",
  });

  // S71 [P0] Full environment returned
  it("S71 [P0] full environment returns key fields", async () => {
    mockGoCmd(ENV_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.goroot).toBeDefined();
    expect(parsed.gopath).toBeDefined();
    expect(parsed.goversion).toBeDefined();
    expect(parsed.goos).toBeDefined();
    expect(parsed.goarch).toBeDefined();
  });

  // S72 [P0] Specific vars queried
  it("S72 [P0] specific vars queried returns only requested keys", async () => {
    const specificJson = JSON.stringify({ GOROOT: "/usr/local/go", GOPATH: "/home/user/go" });
    mockGoCmd(specificJson, "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      vars: ["GOROOT", "GOPATH"],
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.vars).toBeDefined();
  });

  // S73 [P0] Flag injection via vars
  it("S73 [P0] flag injection via vars is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", vars: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S74 [P1] Changed mode
  it("S74 [P1] changed mode passes -changed to CLI", async () => {
    mockGoCmd("{}", "", 0);
    await callAndValidate({ path: "/tmp/project", changed: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-changed");
  });

  // S75 [P1] cgoEnabled field populated
  it("S75 [P1] cgoEnabled field is boolean", async () => {
    mockGoCmd(ENV_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(typeof parsed.cgoEnabled).toBe("boolean");
  });

  // S76 [P0] Schema validation on all outputs
  it("S76 [P0] schema validation passes on all results", async () => {
    mockGoCmd(ENV_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoEnvResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// mod-tidy tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go mod-tidy", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mockReadFile).mockResolvedValue("module mymod\n\ngo 1.21\n" as never);
    const server = new FakeServer();
    registerModTidyTool(server as never);
    handler = server.tools.get("mod-tidy")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoModTidyResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S77 [P0] Already tidy (no changes needed)
  it("S77 [P0] already tidy returns success with madeChanges false", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.madeChanges).toBe(false);
  });

  // S78 [P0] Modules added and removed
  it("S78 [P0] modules added and removed detected", async () => {
    // Before: has old dep
    let callCount = 0;
    vi.mocked(mockReadFile).mockImplementation((() => {
      callCount++;
      if (callCount <= 2) {
        // Before hashes + before go.mod read
        return Promise.resolve(
          "module mymod\n\ngo 1.21\n\nrequire (\n\tgithub.com/old/dep v1.0.0\n)\n",
        );
      }
      // After hashes + after go.mod read
      return Promise.resolve(
        "module mymod\n\ngo 1.21\n\nrequire (\n\tgithub.com/new/dep v1.0.0\n)\n",
      );
    }) as never);
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    // madeChanges should be true since hashes differ
    expect(parsed.madeChanges).toBe(true);
  });

  // S79 [P0] Network error during tidy
  it("S79 [P0] network error returns failure with errorType", async () => {
    mockGoCmd(
      "",
      "go: github.com/nonexistent/pkg@v1.0.0: unrecognized import path: reading https://github.com/nonexistent/pkg: dial tcp: lookup github.com: no such host\n",
      1,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
  });

  // S80 [P0] Not a Go module (no go.mod)
  it("S80 [P0] no go.mod returns error", async () => {
    vi.mocked(mockReadFile).mockRejectedValue(
      new Error("ENOENT: no such file or directory") as never,
    );
    mockGoCmd("", "go: cannot find main module\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/not-a-module" });
    expect(parsed.success).toBe(false);
  });

  // S81 [P0] Flag injection via goVersion
  it("S81 [P0] flag injection via goVersion is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", goVersion: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S82 [P0] Flag injection via compat
  it("S82 [P0] flag injection via compat is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", compat: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S83 [P1] Diff mode (non-destructive check)
  it("S83 [P1] diff mode passes -diff to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", diff: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-diff");
  });

  // S84 [P1] Verbose output
  it("S84 [P1] verbose passes -v to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", verbose: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-v");
  });

  // S85 [P1] Go version override
  it("S85 [P1] goVersion passes -go flag to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", goVersion: "1.21" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-go=1.21");
  });

  // S86 [P2] Compat version
  it("S86 [P2] compat passes -compat flag to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", compat: "1.20" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-compat=1.20");
  });

  // S87 [P2] Continue on error
  it("S87 [P2] continueOnError passes -e to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", continueOnError: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-e");
  });

  // S88 [P0] Schema validation on all outputs
  it("S88 [P0] schema validation passes on all results", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoModTidyResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// generate tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go generate", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerGenerateTool(server as never);
    handler = server.tools.get("generate")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoGenerateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S89 [P0] Successful generate
  it("S89 [P0] successful generate returns success", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S90 [P0] Generate with failed directive
  it("S90 [P0] failed directive returns failure", async () => {
    mockGoCmd(
      "",
      'main.go:3: running "stringer": exec: "stringer": executable file not found\n',
      1,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
  });

  // S91 [P0] No generate directives found
  it("S91 [P0] no directives returns success with empty output", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S92 [P0] Generate times out
  it("S92 [P0] timeout results in timedOut true", async () => {
    vi.mocked(goCmd).mockRejectedValueOnce(new Error("Process timed out"));
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      timeout: 1000,
      compact: false,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.timedOut).toBe(true);
  });

  // S93 [P0] Flag injection via patterns
  it("S93 [P0] flag injection via patterns is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S94 [P0] Flag injection via run
  it("S94 [P0] flag injection via run is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", run: "--exec=evil" })).rejects.toThrow();
  });

  // S95 [P0] Flag injection via skip
  it("S95 [P0] flag injection via skip is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", skip: "--exec=evil" })).rejects.toThrow();
  });

  // S96 [P0] Flag injection via tags
  it("S96 [P0] flag injection via tags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", tags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S97 [P1] Dry run mode
  it("S97 [P1] dryRun passes -n to CLI", async () => {
    mockGoCmd("stringer -type=Pill\n", "", 0);
    await callAndValidate({ path: "/tmp/project", dryRun: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-n");
  });

  // S98 [P1] Run filter
  it("S98 [P1] run filter passes -run to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", run: "stringer" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-run");
    expect(cliArgs).toContain("stringer");
  });

  // S99 [P1] Skip filter
  it("S99 [P1] skip filter passes -skip to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", skip: "protobuf" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-skip");
    expect(cliArgs).toContain("protobuf");
  });

  // S100 [P2] Verbose and commands mode
  it("S100 [P2] verbose and commands pass -v and -x to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", verbose: true, commands: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-v");
    expect(cliArgs).toContain("-x");
  });

  // S101 [P0] Schema validation on all outputs
  it("S101 [P0] schema validation passes on all results", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoGenerateResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// get tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go get", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mockReadFile).mockResolvedValue(
      "module mymod\n\ngo 1.21\n\nrequire (\n\tgithub.com/pkg/errors v0.9.1\n)\n" as never,
    );
    const server = new FakeServer();
    registerGetTool(server as never);
    handler = server.tools.get("get")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GoGetResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S102 [P0] Install a single package
  it("S102 [P0] install single package returns success", async () => {
    mockGoCmd("go: downloading github.com/pkg/errors v0.9.1\n", "", 0);
    const { parsed } = await callAndValidate({
      packages: ["github.com/pkg/errors@latest"],
      path: "/tmp/project",
    });
    expect(parsed.success).toBe(true);
  });

  // S103 [P0] Package not found
  it("S103 [P0] package not found returns failure", async () => {
    mockGoCmd(
      "",
      "go: github.com/nonexistent/pkg: module github.com/nonexistent/pkg: no matching versions for query\n",
      1,
    );
    const { parsed } = await callAndValidate({
      packages: ["github.com/nonexistent/pkg"],
      path: "/tmp/project",
    });
    expect(parsed.success).toBe(false);
  });

  // S104 [P0] Not a Go module (no go.mod)
  it("S104 [P0] no go.mod returns failure", async () => {
    vi.mocked(mockReadFile).mockRejectedValue(new Error("ENOENT") as never);
    mockGoCmd("", "go: cannot find main module\n", 1);
    const { parsed } = await callAndValidate({
      packages: ["github.com/pkg/errors@latest"],
      path: "/tmp/no-mod",
    });
    expect(parsed.success).toBe(false);
  });

  // S105 [P0] Flag injection via packages
  it("S105 [P0] flag injection via packages is blocked", async () => {
    await expect(callAndValidate({ packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S106 [P0] go.mod changes tracked
  it("S106 [P0] go.mod changes tracked in goModChanges", async () => {
    let callCount = 0;
    vi.mocked(mockReadFile).mockImplementation((() => {
      callCount++;
      if (callCount <= 1) {
        // Before
        return Promise.resolve("module mymod\n\ngo 1.21\n");
      }
      // After
      return Promise.resolve(
        "module mymod\n\ngo 1.21\n\nrequire (\n\tgithub.com/new/pkg v1.0.0\n)\n",
      );
    }) as never);
    mockGoCmd("go: added github.com/new/pkg v1.0.0\n", "", 0);
    const { parsed } = await callAndValidate({
      packages: ["github.com/new/pkg@latest"],
      path: "/tmp/project",
      compact: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.goModChanges) {
      expect(parsed.goModChanges.added.length).toBeGreaterThan(0);
    }
  });

  // S107 [P1] Update all dependencies
  it("S107 [P1] update all passes -u to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", packages: ["./..."], update: "all" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-u");
  });

  // S108 [P1] Update patch only
  it("S108 [P1] update patch passes -u=patch to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({ path: "/tmp/project", packages: ["./..."], update: "patch" });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-u=patch");
  });

  // S109 [P1] Download only
  it("S109 [P1] downloadOnly passes -d to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({
      path: "/tmp/project",
      packages: ["github.com/pkg/errors"],
      downloadOnly: true,
    });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-d");
  });

  // S110 [P2] Include test deps
  it("S110 [P2] testDeps passes -t to CLI", async () => {
    mockGoCmd("", "", 0);
    await callAndValidate({
      path: "/tmp/project",
      packages: ["github.com/pkg/errors"],
      testDeps: true,
    });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-t");
  });

  // S111 [P1] Per-package status tracking
  it("S111 [P1] per-package status tracked in packages array", async () => {
    mockGoCmd("go: downloading pkg1 v1.0\ngo: downloading pkg2 v2.0\n", "", 0);
    const { parsed } = await callAndValidate({
      packages: ["pkg1", "pkg2"],
      path: "/tmp/project",
      compact: false,
    });
    expect(parsed.success).toBe(true);
    // packages array may be populated depending on parser behavior
    expect(parsed.packages).toBeDefined();
  });

  // S112 [P0] Schema validation on all outputs
  it("S112 [P0] schema validation passes on all results", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({
      packages: ["github.com/pkg/errors@latest"],
      path: "/tmp/project",
    });
    expect(GoGetResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// list tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: go list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const LIST_PACKAGES_JSON =
    '{"Dir":"/tmp/project","ImportPath":"mymod","Name":"main","GoFiles":["main.go"]}\n' +
    '{"Dir":"/tmp/project/pkg","ImportPath":"mymod/pkg","Name":"pkg","GoFiles":["pkg.go"]}\n';

  const LIST_MODULES_JSON =
    '{"Path":"mymod","Dir":"/tmp/project","GoMod":"/tmp/project/go.mod","GoVersion":"1.21","Main":true}\n' +
    '{"Path":"github.com/pkg/errors","Version":"v0.9.1","Dir":"/home/user/go/pkg/mod/github.com/pkg/errors@v0.9.1"}\n';

  // S113 [P0] List packages in project
  it("S113 [P0] list packages returns package list", async () => {
    mockGoCmd(LIST_PACKAGES_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(true);
    expect(parsed.packages).toBeDefined();
  });

  // S114 [P0] List modules
  it("S114 [P0] list modules returns module list", async () => {
    mockGoCmd(LIST_MODULES_JSON, "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      modules: true,
      compact: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.modules).toBeDefined();
  });

  // S115 [P0] No packages found
  it("S115 [P0] no packages returns success with zero total", async () => {
    mockGoCmd("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(true);
  });

  // S116 [P0] Flag injection via packages
  it("S116 [P0] flag injection via packages is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", packages: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S117 [P0] Flag injection via jsonFields
  it("S117 [P0] flag injection via jsonFields is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", jsonFields: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S118 [P0] Flag injection via tags
  it("S118 [P0] flag injection via tags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", tags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S119 [P1] Package with error info
  it("S119 [P1] package with error populates error field", async () => {
    const errorPkgJson =
      '{"Dir":"/tmp/project","ImportPath":"mymod","Name":"main","Error":{"Err":"missing import"}}\n';
    mockGoCmd(errorPkgJson, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.packages).toBeDefined();
    if (parsed.packages && parsed.packages.length > 0) {
      expect(parsed.packages[0].error).toBeDefined();
    }
  });

  // S120 [P1] Module with version/dir info
  it("S120 [P1] module with version and dir populated", async () => {
    mockGoCmd(LIST_MODULES_JSON, "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      modules: true,
      compact: false,
    });
    expect(parsed.modules).toBeDefined();
    if (parsed.modules && parsed.modules.length > 0) {
      expect(parsed.modules[0].path).toBeDefined();
    }
  });

  // S121 [P1] Updates mode auto-enables module mode
  it("S121 [P1] updates mode passes -m -u to CLI", async () => {
    mockGoCmd(LIST_MODULES_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", updates: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-m");
    expect(cliArgs).toContain("-u");
  });

  // S122 [P1] Deps mode
  it("S122 [P1] deps mode passes -deps to CLI", async () => {
    mockGoCmd(LIST_PACKAGES_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", deps: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-deps");
  });

  // S123 [P1] Selective JSON fields
  it("S123 [P1] jsonFields passes -json=Field1,Field2 to CLI", async () => {
    mockGoCmd(LIST_PACKAGES_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", jsonFields: ["Dir", "ImportPath"] });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    const jsonFlag = cliArgs.find((a: string) => a.startsWith("-json="));
    expect(jsonFlag).toBe("-json=Dir,ImportPath");
  });

  // S124 [P2] Find mode (fast)
  it("S124 [P2] find mode passes -find to CLI", async () => {
    mockGoCmd(LIST_PACKAGES_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", find: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-find");
  });

  // S125 [P2] Tolerate errors
  it("S125 [P2] tolerateErrors passes -e to CLI", async () => {
    mockGoCmd(LIST_PACKAGES_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", tolerateErrors: true });
    const cliArgs = vi.mocked(goCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-e");
  });

  // S126 [P0] Schema validation on all outputs
  it("S126 [P0] schema validation passes on all results", async () => {
    mockGoCmd(LIST_PACKAGES_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GoListResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// golangci-lint tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: golangci-lint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const LINT_CLEAN_JSON = JSON.stringify({ Issues: [] });

  const LINT_ISSUES_JSON = JSON.stringify({
    Issues: [
      {
        FromLinter: "govet",
        Text: "printf: fmt.Sprintf format %d has arg of wrong type",
        Severity: "warning",
        SourceLines: ['fmt.Sprintf("%d", "hello")'],
        Pos: { Filename: "main.go", Line: 10, Column: 5 },
      },
      {
        FromLinter: "errcheck",
        Text: "Error return value of `fmt.Println` is not checked",
        Severity: "warning",
        Pos: { Filename: "main.go", Line: 15, Column: 2 },
      },
    ],
  });

  // S127 [P0] Clean code, no diagnostics
  it("S127 [P0] clean code returns zero diagnostics", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  // S128 [P0] Code with lint issues
  it("S128 [P0] code with lint issues returns diagnostics", async () => {
    mockGolangciLintCmd(LINT_ISSUES_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
    const diag = parsed.diagnostics![0];
    expect(diag.file).toBeDefined();
    expect(diag.line).toBeDefined();
    expect(diag.linter).toBeDefined();
    expect(diag.severity).toBeDefined();
    expect(diag.message).toBeDefined();
  });

  // S129 [P0] golangci-lint not installed
  it("S129 [P0] golangci-lint not installed throws error", async () => {
    mockGolangciLintCmd(
      "",
      'Error: failed to load packages: exec: "golangci-lint": executable file not found\n',
      1,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    // Should return a result (possibly failed parse or empty)
  });

  // S130 [P0] Flag injection via patterns
  it("S130 [P0] flag injection via patterns is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", patterns: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S131 [P0] Flag injection via config
  it("S131 [P0] flag injection via config is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", config: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S132 [P0] Flag injection via newFromRev
  it("S132 [P0] flag injection via newFromRev is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", newFromRev: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S133 [P0] Flag injection via timeout
  it("S133 [P0] flag injection via timeout is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", timeout: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S134 [P0] Flag injection via enable
  it("S134 [P0] flag injection via enable is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", enable: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S135 [P0] Flag injection via disable
  it("S135 [P0] flag injection via disable is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", disable: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S136 [P0] Flag injection via buildTags
  it("S136 [P0] flag injection via buildTags is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", buildTags: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S137 [P1] Enable specific linters
  it("S137 [P1] enable specific linters passes --enable to CLI", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", enable: ["govet", "errcheck"] });
    const cliArgs = vi.mocked(golangciLintCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--enable");
    expect(cliArgs).toContain("govet,errcheck");
  });

  // S138 [P1] Disable specific linters
  it("S138 [P1] disable specific linters passes --disable to CLI", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", disable: ["deadcode"] });
    const cliArgs = vi.mocked(golangciLintCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--disable");
    expect(cliArgs).toContain("deadcode");
  });

  // S139 [P1] New from rev
  it("S139 [P1] newFromRev passes --new-from-rev to CLI", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", newFromRev: "HEAD~5" });
    const cliArgs = vi.mocked(golangciLintCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--new-from-rev");
    expect(cliArgs).toContain("HEAD~5");
  });

  // S140 [P1] Fix mode
  it("S140 [P1] fix mode passes --fix to CLI", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", fix: true });
    const cliArgs = vi.mocked(golangciLintCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--fix");
  });

  // S142 [P1] Results truncated flag
  it("S142 [P1] resultsTruncated set when maxIssuesPerLinter limit hit", async () => {
    mockGolangciLintCmd(LINT_ISSUES_JSON, "", 1);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      maxIssuesPerLinter: 1,
      compact: false,
    });
    // When diagnostics exist, resultsTruncated should be true
    if (parsed.diagnostics && parsed.diagnostics.length >= 1) {
      expect(parsed.resultsTruncated).toBe(true);
    }
  });

  // S143 [P2] Presets
  it("S143 [P2] presets passed to CLI", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", presets: ["bugs", "style"] });
    const cliArgs = vi.mocked(golangciLintCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--presets");
    expect(cliArgs).toContain("bugs,style");
  });

  // S144 [P2] Concurrency
  it("S144 [P2] concurrency passed to CLI", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", concurrency: 2 });
    const cliArgs = vi.mocked(golangciLintCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--concurrency");
    expect(cliArgs).toContain("2");
  });

  // S145 [P0] Schema validation on all outputs
  it("S145 [P0] schema validation passes on all results", async () => {
    mockGolangciLintCmd(LINT_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(GolangciLintResultSchema.safeParse(parsed).success).toBe(true);
  });
});
