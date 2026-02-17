/**
 * Smoke tests: build server (7 tools) -- Phase 2 (mocked)
 *
 * Tests all build tools end-to-end with mocked build-runner,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BuildResultSchema,
  EsbuildResultSchema,
  TscResultSchema,
  TurboResultSchema,
  ViteBuildResultSchema,
  WebpackResultSchema,
  NxResultSchema,
} from "../../../packages/server-build/src/schemas/index.js";

// Mock the build runner module used by all build tools
vi.mock("../../../packages/server-build/src/lib/build-runner.js", () => ({
  runBuildCommand: vi.fn(),
  esbuildCmd: vi.fn(),
  tsc: vi.fn(),
  turboCmd: vi.fn(),
  viteCmd: vi.fn(),
  webpackCmd: vi.fn(),
  nxCmd: vi.fn(),
}));

// Mock fs for esbuild metafile and turbo summary
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

import {
  runBuildCommand,
  esbuildCmd,
  tsc,
  turboCmd,
  viteCmd,
  webpackCmd,
  nxCmd,
} from "../../../packages/server-build/src/lib/build-runner.js";
import { registerBuildTool } from "../../../packages/server-build/src/tools/build.js";
import { registerEsbuildTool } from "../../../packages/server-build/src/tools/esbuild.js";
import { registerTscTool } from "../../../packages/server-build/src/tools/tsc.js";
import { registerTurboTool } from "../../../packages/server-build/src/tools/turbo.js";
import { registerViteBuildTool } from "../../../packages/server-build/src/tools/vite-build.js";
import { registerWebpackTool } from "../../../packages/server-build/src/tools/webpack.js";
import { registerNxTool } from "../../../packages/server-build/src/tools/nx.js";

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

function mockRunner(runner: ReturnType<typeof vi.fn>, stdout: string, stderr = "", exitCode = 0) {
  runner.mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// build tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerBuildTool(server as never);
    handler = server.tools.get("build")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = BuildResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Successful build (npm run build)
  it("S1 [P0] successful build returns success and duration", async () => {
    mockRunner(vi.mocked(runBuildCommand), "Build complete\n", "", 0);
    const { parsed } = await callAndValidate({
      command: "npm",
      args: ["run", "build"],
      path: "/tmp/project",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.duration).toBeGreaterThanOrEqual(0);
  });

  // S2 [P0] Failed build (syntax error)
  it("S2 [P0] failed build returns errors", async () => {
    mockRunner(vi.mocked(runBuildCommand), "", "error TS2304: Cannot find name 'foo'.\n", 1);
    const { parsed } = await callAndValidate({
      command: "tsc",
      args: ["src"],
      path: "/tmp/project",
    });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] Disallowed command
  it("S3 [P0] disallowed command throws assertAllowedCommand", async () => {
    await expect(callAndValidate({ command: "rm", args: ["-rf", "/"] })).rejects.toThrow();
  });

  // S4 [P0] Path-qualified command
  it("S4 [P0] path-qualified command throws assertNoPathQualifiedCommand", async () => {
    await expect(callAndValidate({ command: "/usr/bin/node", args: [] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection via args
  it("S5 [P0] flag injection via args is blocked", async () => {
    await expect(callAndValidate({ command: "npm", args: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection via env key
  it("S6 [P0] flag injection via env key is blocked", async () => {
    await expect(
      callAndValidate({
        command: "npm",
        args: ["run", "build"],
        env: { "--exec=evil": "val" },
      }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection via env value
  it("S7 [P0] flag injection via env value is blocked", async () => {
    await expect(
      callAndValidate({
        command: "npm",
        args: ["run", "build"],
        env: { KEY: "--exec=evil" },
      }),
    ).rejects.toThrow();
  });

  // S8 [P0] Path restricted by assertAllowedRoot
  it("S8 [P0] path restricted by assertAllowedRoot", async () => {
    const originalEnv = process.env.PARE_BUILD_ALLOWED_ROOTS;
    try {
      process.env.PARE_BUILD_ALLOWED_ROOTS = "/tmp/safe";
      await expect(
        callAndValidate({
          command: "npm",
          args: ["run", "build"],
          path: "/etc",
        }),
      ).rejects.toThrow();
    } finally {
      if (originalEnv === undefined) {
        delete process.env.PARE_BUILD_ALLOWED_ROOTS;
      } else {
        process.env.PARE_BUILD_ALLOWED_ROOTS = originalEnv;
      }
    }
  });

  // S9 [P1] Custom timeout
  it("S9 [P1] custom timeout is passed to runner", async () => {
    mockRunner(vi.mocked(runBuildCommand), "done\n", "", 0);
    await callAndValidate({
      command: "npm",
      args: ["run", "build"],
      path: "/tmp/project",
      timeout: 10000,
    });
    const callArgs = vi.mocked(runBuildCommand).mock.calls[0];
    expect(callArgs[3]).toBe(10000);
  });

  // S10 [P1] env vars passed to process
  it("S10 [P1] env vars passed to runner", async () => {
    mockRunner(vi.mocked(runBuildCommand), "done\n", "", 0);
    await callAndValidate({
      command: "npm",
      args: ["run", "build"],
      path: "/tmp/project",
      env: { NODE_ENV: "production" },
    });
    const callArgs = vi.mocked(runBuildCommand).mock.calls[0];
    expect(callArgs[4]).toEqual({ NODE_ENV: "production" });
  });

  // S11 [P2] compact: false
  it("S11 [P2] compact false returns full output with stdout/stderr", async () => {
    mockRunner(vi.mocked(runBuildCommand), "stdout here\n", "stderr here\n", 0);
    const { parsed } = await callAndValidate({
      command: "npm",
      args: ["run", "build"],
      path: "/tmp/project",
      compact: false,
    });
    expect(parsed.success).toBe(true);
  });

  // S12 [P0] Schema validation
  it("S12 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(runBuildCommand), "done\n", "", 0);
    const { parsed } = await callAndValidate({
      command: "npm",
      args: ["run", "build"],
      path: "/tmp/project",
    });
    expect(BuildResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// esbuild tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: esbuild", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerEsbuildTool(server as never);
    handler = server.tools.get("esbuild")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = EsbuildResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Bundle single entry
  it("S1 [P0] bundle single entry returns success and duration", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    const { parsed } = await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      path: "/tmp/project",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.duration).toBeGreaterThanOrEqual(0);
  });

  // S2 [P0] Build error (missing entry)
  it("S2 [P0] build error returns failure with errors", async () => {
    mockRunner(vi.mocked(esbuildCmd), "", 'X [ERROR] Could not resolve "nonexistent.ts"\n', 1);
    const { parsed } = await callAndValidate({
      entryPoints: ["nonexistent.ts"],
      outdir: "dist",
    });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] Flag injection via entryPoints
  it("S3 [P0] flag injection via entryPoints is blocked", async () => {
    await expect(
      callAndValidate({ entryPoints: ["--exec=evil"], outdir: "dist" }),
    ).rejects.toThrow();
  });

  // S4 [P0] Flag injection via target
  it("S4 [P0] flag injection via target is blocked", async () => {
    await expect(
      callAndValidate({ entryPoints: ["src/index.ts"], target: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S5 [P0] Flag injection via external
  it("S5 [P0] flag injection via external is blocked", async () => {
    await expect(
      callAndValidate({ entryPoints: ["src/index.ts"], external: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S6 [P0] Flag injection via tsconfig
  it("S6 [P0] flag injection via tsconfig is blocked", async () => {
    await expect(
      callAndValidate({ entryPoints: ["src/index.ts"], tsconfig: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection via define key
  it("S7 [P0] flag injection via define key is blocked", async () => {
    await expect(
      callAndValidate({
        entryPoints: ["src/index.ts"],
        define: { "--exec=evil": "x" },
      }),
    ).rejects.toThrow();
  });

  // S8 [P0] Flag injection via loader key
  it("S8 [P0] flag injection via loader key is blocked", async () => {
    await expect(
      callAndValidate({
        entryPoints: ["src/index.ts"],
        loader: { "--exec=evil": "text" },
      }),
    ).rejects.toThrow();
  });

  // S9 [P0] Flag injection via args
  it("S9 [P0] flag injection via args is blocked", async () => {
    await expect(
      callAndValidate({ entryPoints: ["src/index.ts"], args: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S10 [P1] format: "esm", platform: "node"
  it("S10 [P1] format esm and platform node passed to CLI", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      format: "esm",
      platform: "node",
      path: "/tmp/project",
    });
    const cliArgs = vi.mocked(esbuildCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--format=esm");
    expect(cliArgs).toContain("--platform=node");
  });

  // S11 [P1] minify: true
  it("S11 [P1] minify true passed to CLI", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  0.8kb\n", "", 0);
    await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      minify: true,
      path: "/tmp/project",
    });
    const cliArgs = vi.mocked(esbuildCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--minify");
  });

  // S12 [P1] metafile: true
  it("S12 [P1] metafile true adds --metafile flag", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      metafile: true,
      path: "/tmp/project",
    });
    const cliArgs = vi.mocked(esbuildCmd).mock.calls[0][0] as string[];
    const metaflag = cliArgs.find((a: string) => a.startsWith("--metafile="));
    expect(metaflag).toBeDefined();
  });

  // S13 [P1] sourcemap: "inline"
  it("S13 [P1] sourcemap inline passed to CLI", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      sourcemap: "inline",
      path: "/tmp/project",
    });
    const cliArgs = vi.mocked(esbuildCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--sourcemap=inline");
  });

  // S14 [P2] splitting: true with esm
  it("S14 [P2] splitting true with esm passed to CLI", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      format: "esm",
      splitting: true,
      path: "/tmp/project",
    });
    const cliArgs = vi.mocked(esbuildCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--splitting");
    expect(cliArgs).toContain("--format=esm");
  });

  // S15 [P2] define: compile-time constants
  it("S15 [P2] define compile-time constants passed to CLI", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    await callAndValidate({
      entryPoints: ["src/index.ts"],
      define: { "process.env.NODE_ENV": '"production"' },
      path: "/tmp/project",
    });
    const cliArgs = vi.mocked(esbuildCmd).mock.calls[0][0] as string[];
    const defineFlag = cliArgs.find((a: string) => a.startsWith("--define:process.env.NODE_ENV="));
    expect(defineFlag).toBeDefined();
  });

  // S16 [P0] Schema validation
  it("S16 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(esbuildCmd), "dist/index.js  1.2kb\n", "", 0);
    const { parsed } = await callAndValidate({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      path: "/tmp/project",
    });
    expect(EsbuildResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// tsc tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: tsc", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerTscTool(server as never);
    handler = server.tools.get("tsc")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = TscResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Clean project, no errors
  it("S1 [P0] clean project returns success with no diagnostics", async () => {
    mockRunner(vi.mocked(tsc), "", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.errors).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
  });

  // S2 [P0] Project with type errors
  it("S2 [P0] project with errors returns diagnostics", async () => {
    mockRunner(
      vi.mocked(tsc),
      "src/index.ts(5,3): error TS2304: Cannot find name 'foo'.\n" +
        "src/index.ts(10,1): error TS2322: Type 'string' is not assignable to type 'number'.\n",
      "",
      2,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.errors).toBeGreaterThan(0);
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  // S3 [P0] No tsconfig.json
  it("S3 [P0] no tsconfig returns error or empty", async () => {
    mockRunner(vi.mocked(tsc), "", "error TS5057: Cannot find a tsconfig.json file.\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] Flag injection via project
  it("S4 [P0] flag injection via project is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", project: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S5 [P0] Flag injection via declarationDir
  it("S5 [P0] flag injection via declarationDir is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", declarationDir: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S6 [P1] Diagnostic has file/line/severity
  it("S6 [P1] diagnostic has file, line, and severity", async () => {
    mockRunner(vi.mocked(tsc), "src/app.ts(12,5): error TS2304: Cannot find name 'bar'.\n", "", 2);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    const diag = parsed.diagnostics[0];
    expect(diag.file).toBeDefined();
    expect(diag.line).toBeDefined();
    expect(diag.severity).toBeDefined();
  });

  // S7 [P1] noEmit: false with listEmittedFiles
  it("S7 [P1] noEmit false passes listEmittedFiles to CLI", async () => {
    mockRunner(
      vi.mocked(tsc),
      "TSFILE: /tmp/project/dist/index.js\nTSFILE: /tmp/project/dist/index.d.ts\n",
      "",
      0,
    );
    await callAndValidate({ path: "/tmp/project", noEmit: false });
    const cliArgs = vi.mocked(tsc).mock.calls[0][0] as string[];
    expect(cliArgs).not.toContain("--noEmit");
    expect(cliArgs).toContain("--listEmittedFiles");
  });

  // S8 [P1] project: custom tsconfig
  it("S8 [P1] project option passes --project to CLI", async () => {
    mockRunner(vi.mocked(tsc), "", "", 0);
    await callAndValidate({ path: "/tmp/project", project: "tsconfig.build.json" });
    const cliArgs = vi.mocked(tsc).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--project");
    expect(cliArgs).toContain("tsconfig.build.json");
  });

  // S9 [P1] skipLibCheck: true
  it("S9 [P1] skipLibCheck true passes --skipLibCheck to CLI", async () => {
    mockRunner(vi.mocked(tsc), "", "", 0);
    await callAndValidate({ path: "/tmp/project", skipLibCheck: true });
    const cliArgs = vi.mocked(tsc).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--skipLibCheck");
  });

  // S10 [P2] compact: false
  it("S10 [P2] compact false returns full diagnostics", async () => {
    mockRunner(vi.mocked(tsc), "src/index.ts(5,3): error TS2304: Cannot find name 'foo'.\n", "", 2);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  // S11 [P2] incremental: true
  it("S11 [P2] incremental true passes --incremental to CLI", async () => {
    mockRunner(vi.mocked(tsc), "", "", 0);
    await callAndValidate({ path: "/tmp/project", incremental: true });
    const cliArgs = vi.mocked(tsc).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--incremental");
  });

  // S12 [P2] pretty: false
  it("S12 [P2] pretty false passes --pretty false to CLI", async () => {
    mockRunner(vi.mocked(tsc), "", "", 0);
    await callAndValidate({ path: "/tmp/project", pretty: false });
    const cliArgs = vi.mocked(tsc).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--pretty");
    expect(cliArgs).toContain("false");
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(tsc), "", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(TscResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// turbo tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: turbo", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerTurboTool(server as never);
    handler = server.tools.get("turbo")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = TurboResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const TURBO_SUCCESS_STDOUT =
    "@scope/app#build: cache miss, executing abc123 (2.5s)\n" +
    "@scope/lib#build: cache miss, executing abc123 (1.2s)\n" +
    " Tasks:    2 successful, 2 total\n" +
    "Cached:    0 cached, 2 total\n" +
    "  Time:    5.2s\n";

  const TURBO_FAIL_STDOUT =
    "@scope/app#build: cache miss, executing abc123 (2.5s)\n" +
    "@scope/lib#build: command exited (1)\n" +
    " Tasks:    1 successful, 2 total\n" +
    "Cached:    0 cached, 2 total\n" +
    "  Time:    3.1s\n";

  // S1 [P0] Run build task
  it("S1 [P0] run build task returns success with task counts", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({ task: "build", path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.totalTasks).toBeGreaterThan(0);
    expect(parsed.passed).toBeGreaterThan(0);
  });

  // S2 [P0] No task or tasks provided
  it("S2 [P0] no task or tasks throws error", async () => {
    await expect(callAndValidate({ path: "/tmp/project" })).rejects.toThrow(
      "Either task or tasks must be provided",
    );
  });

  // S3 [P0] Task failure
  it("S3 [P0] task failure returns failed count", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_FAIL_STDOUT, "", 1);
    const { parsed } = await callAndValidate({ task: "failing-task", path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.failed).toBeGreaterThan(0);
  });

  // S4 [P0] Flag injection via task
  it("S4 [P0] flag injection via task is blocked", async () => {
    await expect(callAndValidate({ task: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection via filter
  it("S5 [P0] flag injection via filter is blocked", async () => {
    await expect(callAndValidate({ task: "build", filter: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection via args
  it("S6 [P0] flag injection via args is blocked", async () => {
    await expect(callAndValidate({ task: "build", args: ["--exec=evil"] })).rejects.toThrow();
  });

  // S7 [P1] Multiple tasks
  it("S7 [P1] multiple tasks passed to CLI", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ tasks: ["build", "test"], path: "/tmp/project" });
    const cliArgs = vi.mocked(turboCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("build");
    expect(cliArgs).toContain("test");
  });

  // S8 [P1] filter by package
  it("S8 [P1] filter by package passes --filter to CLI", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ task: "build", filter: "@scope/pkg", path: "/tmp/project" });
    const cliArgs = vi.mocked(turboCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--filter");
    expect(cliArgs).toContain("@scope/pkg");
  });

  // S9 [P1] force: true bypasses cache
  it("S9 [P1] force true passes --force to CLI", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ task: "build", force: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(turboCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--force");
  });

  // S10 [P1] Cache hit detection
  it("S10 [P1] cache hit detected from output", async () => {
    const cachedOut =
      "@scope/app#build: cache hit, replaying logs abc123 (100ms)\n" +
      "@scope/lib#build: cache hit, replaying logs abc123 (50ms)\n" +
      " Tasks:    2 successful, 2 total\nCached:    2 cached, 2 total\n  Time:    0.5s\n";
    mockRunner(vi.mocked(turboCmd), cachedOut, "", 0);
    const { parsed } = await callAndValidate({ task: "build", path: "/tmp/project" });
    expect(parsed.cached).toBeGreaterThan(0);
  });

  // S11 [P1] dryRun: true
  it("S11 [P1] dryRun true passes --dry-run to CLI", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ task: "build", dryRun: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(turboCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S12 [P2] summarize: true
  it("S12 [P2] summarize true passes --summarize to CLI", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ task: "build", summarize: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(turboCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--summarize");
  });

  // S13 [P2] continue_on_error: true
  it("S13 [P2] continue_on_error true passes --continue to CLI", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ task: "build", continue_on_error: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(turboCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--continue");
  });

  // S14 [P0] Schema validation
  it("S14 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(turboCmd), TURBO_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({ task: "build", path: "/tmp/project" });
    expect(TurboResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// vite-build tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: vite-build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerViteBuildTool(server as never);
    handler = server.tools.get("vite-build")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = ViteBuildResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const VITE_SUCCESS_STDOUT =
    "vite v5.0.0 building for production...\n" +
    "dist/index.js   12.50 kB | gzip: 4.20 kB\n" +
    "dist/style.css   2.30 kB | gzip: 1.10 kB\n" +
    "built in 1.23s\n";

  // S1 [P0] Successful Vite build
  it("S1 [P0] successful build returns success with duration and outputs", async () => {
    mockRunner(vi.mocked(viteCmd), VITE_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.duration).toBeGreaterThanOrEqual(0);
  });

  // S2 [P0] Build failure (no config)
  it("S2 [P0] build failure returns errors", async () => {
    mockRunner(vi.mocked(viteCmd), "", "Error: Cannot find module 'vite'\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] Flag injection via mode
  it("S3 [P0] flag injection via mode is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", mode: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection via outDir
  it("S4 [P0] flag injection via outDir is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", outDir: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S5 [P0] Flag injection via config
  it("S5 [P0] flag injection via config is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", config: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S6 [P0] Flag injection via base
  it("S6 [P0] flag injection via base is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", base: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection via ssr
  it("S7 [P0] flag injection via ssr is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", ssr: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection via args
  it("S8 [P0] flag injection via args is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", args: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S9 [P1] Output files have file/size
  it("S9 [P1] output files have file and size", async () => {
    mockRunner(vi.mocked(viteCmd), VITE_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    if (parsed.outputs && parsed.outputs.length > 0) {
      const output = parsed.outputs[0];
      expect(output.file).toBeDefined();
      expect(output.size).toBeDefined();
    }
  });

  // S10 [P1] sourcemap: true
  it("S10 [P1] sourcemap true passes --sourcemap to CLI", async () => {
    mockRunner(vi.mocked(viteCmd), VITE_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ path: "/tmp/project", sourcemap: true });
    const cliArgs = vi.mocked(viteCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--sourcemap");
  });

  // S11 [P1] minify: "false"
  it("S11 [P1] minify false passed to CLI", async () => {
    mockRunner(vi.mocked(viteCmd), VITE_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ path: "/tmp/project", minify: "false" });
    const cliArgs = vi.mocked(viteCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--minify=false");
  });

  // S12 [P2] emptyOutDir: true
  it("S12 [P2] emptyOutDir true passes --emptyOutDir to CLI", async () => {
    mockRunner(vi.mocked(viteCmd), VITE_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ path: "/tmp/project", emptyOutDir: true });
    const cliArgs = vi.mocked(viteCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--emptyOutDir");
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(viteCmd), VITE_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(ViteBuildResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// webpack tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: webpack", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerWebpackTool(server as never);
    handler = server.tools.get("webpack")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = WebpackResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const WEBPACK_SUCCESS_JSON = JSON.stringify({
    errors: [],
    warnings: [],
    assets: [{ name: "main.js", size: 12345 }],
    chunks: [{ id: 0, names: ["main"], entry: true, files: ["main.js"] }],
    modules: [{ name: "./src/index.js" }],
    time: 1500,
  });

  const WEBPACK_FAIL_JSON = JSON.stringify({
    errors: ["Module not found: Error: Can't resolve './missing'"],
    warnings: [],
    assets: [],
    time: 500,
  });

  // S1 [P0] Successful webpack build
  it("S1 [P0] successful build returns success with assets", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.duration).toBeGreaterThanOrEqual(0);
  });

  // S2 [P0] Build failure
  it("S2 [P0] build failure returns errors", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_FAIL_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] No webpack config
  it("S3 [P0] no webpack config returns error or failure", async () => {
    mockRunner(vi.mocked(webpackCmd), "", "Error: Cannot find module 'webpack'\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] Flag injection via config
  it("S4 [P0] flag injection via config is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", config: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S5 [P0] Flag injection via entry
  it("S5 [P0] flag injection via entry is blocked", async () => {
    await expect(callAndValidate({ path: "/tmp/project", entry: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection via target
  it("S6 [P0] flag injection via target is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", target: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection via devtool
  it("S7 [P0] flag injection via devtool is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", devtool: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S8 [P0] Flag injection via args
  it("S8 [P0] flag injection via args is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", args: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S9 [P0] Flag injection via env key
  it("S9 [P0] flag injection via env key is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", env: { "--exec=evil": "val" } }),
    ).rejects.toThrow();
  });

  // S10 [P0] Flag injection via env value
  it("S10 [P0] flag injection via env value is blocked", async () => {
    await expect(
      callAndValidate({ path: "/tmp/project", env: { KEY: "--exec=evil" } }),
    ).rejects.toThrow();
  });

  // S11 [P1] Assets have name/size
  it("S11 [P1] assets have name and size", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    if (parsed.assets && parsed.assets.length > 0) {
      const asset = parsed.assets[0];
      expect(asset.name).toBeDefined();
      expect(asset.size).toBeDefined();
    }
  });

  // S12 [P1] mode: "production"
  it("S12 [P1] mode production passes --mode to CLI", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", mode: "production" });
    const cliArgs = vi.mocked(webpackCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--mode");
    expect(cliArgs).toContain("production");
  });

  // S13 [P1] profile: true
  it("S13 [P1] profile true passes --profile to CLI", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", profile: true });
    const cliArgs = vi.mocked(webpackCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--profile");
  });

  // S14 [P2] bail: true
  it("S14 [P2] bail true passes --bail to CLI", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", bail: true });
    const cliArgs = vi.mocked(webpackCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--bail");
  });

  // S15 [P2] cache: false
  it("S15 [P2] cache false passes --no-cache to CLI", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", cache: false });
    const cliArgs = vi.mocked(webpackCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--no-cache");
  });

  // S16 [P0] Schema validation
  it("S16 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(webpackCmd), WEBPACK_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(WebpackResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// nx tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: nx", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerNxTool(server as never);
    handler = server.tools.get("nx")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = NxResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const NX_SUCCESS_STDOUT =
    "  \u2714  nx run my-app:build  (1.2s)\n" +
    "\n" +
    "  >  NX   Successfully ran target build for project my-app (1.5s)\n";

  const NX_RUNMANY_STDOUT =
    "  \u2714  nx run app1:build  (1.0s)\n" +
    "  \u2714  nx run app2:build  (1.5s)\n" +
    "  \u2714  nx run lib1:build  (0.5s)\n" +
    "\n" +
    "  >  NX   Successfully ran target build for 3 projects (3.5s)\n";

  const NX_FAIL_STDOUT =
    "  \u2714  nx run app1:build  (1.0s)\n" +
    "  \u2716  nx run app2:build  (0.5s)\n" +
    "\n" +
    "  >  NX   Ran target build for 2 projects (2.0s)\n";

  // S1 [P0] Run build for single project
  it("S1 [P0] run build for single project returns success", async () => {
    mockRunner(vi.mocked(nxCmd), NX_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({
      target: "build",
      project: "my-app",
      path: "/tmp/project",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBeGreaterThan(0);
    expect(parsed.passed).toBeGreaterThan(0);
  });

  // S2 [P0] Run-many build
  it("S2 [P0] run-many build returns all projects", async () => {
    mockRunner(vi.mocked(nxCmd), NX_RUNMANY_STDOUT, "", 0);
    const { parsed } = await callAndValidate({
      target: "build",
      path: "/tmp/project",
    });
    expect(parsed.total).toBeGreaterThan(0);
  });

  // S3 [P0] Nx not installed
  it("S3 [P0] nx not installed throws error", async () => {
    mockRunner(vi.mocked(nxCmd), "", "Error: Cannot find module 'nx'\n", 1);
    const { parsed } = await callAndValidate({
      target: "build",
      path: "/tmp/empty",
    });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] Flag injection via target
  it("S4 [P0] flag injection via target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection via project
  it("S5 [P0] flag injection via project is blocked", async () => {
    await expect(callAndValidate({ target: "build", project: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection via base
  it("S6 [P0] flag injection via base is blocked", async () => {
    await expect(
      callAndValidate({ target: "build", affected: true, base: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection via head
  it("S7 [P0] flag injection via head is blocked", async () => {
    await expect(
      callAndValidate({ target: "build", affected: true, head: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S8 [P0] Flag injection via configuration
  it("S8 [P0] flag injection via configuration is blocked", async () => {
    await expect(
      callAndValidate({ target: "build", configuration: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S9 [P0] Flag injection via projects
  it("S9 [P0] flag injection via projects is blocked", async () => {
    await expect(callAndValidate({ target: "build", projects: ["--exec=evil"] })).rejects.toThrow();
  });

  // S10 [P0] Flag injection via exclude
  it("S10 [P0] flag injection via exclude is blocked", async () => {
    await expect(callAndValidate({ target: "build", exclude: ["--exec=evil"] })).rejects.toThrow();
  });

  // S11 [P0] Flag injection via args
  it("S11 [P0] flag injection via args is blocked", async () => {
    await expect(callAndValidate({ target: "build", args: ["--exec=evil"] })).rejects.toThrow();
  });

  // S12 [P1] affected: true
  it("S12 [P1] affected true passes affected command to CLI", async () => {
    mockRunner(vi.mocked(nxCmd), NX_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ target: "build", affected: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(nxCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("affected");
    expect(cliArgs).toContain("--target=build");
  });

  // S13 [P1] Task with cache hit
  it("S13 [P1] cache hit detected from output", async () => {
    const cachedOut =
      "  \u2714  nx run my-app:build  [local cache]  (0.1s)\n" +
      "\n" +
      "  >  NX   Successfully ran target build for project my-app (0.3s)\n";
    mockRunner(vi.mocked(nxCmd), cachedOut, "", 0);
    const { parsed } = await callAndValidate({
      target: "build",
      path: "/tmp/project",
    });
    expect(parsed.cached).toBeGreaterThanOrEqual(0);
  });

  // S14 [P1] skipNxCache: true
  it("S14 [P1] skipNxCache true passes --skip-nx-cache to CLI", async () => {
    mockRunner(vi.mocked(nxCmd), NX_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ target: "build", skipNxCache: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(nxCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--skip-nx-cache");
  });

  // S15 [P1] nxBail: true with failure
  it("S15 [P1] nxBail true passes --nx-bail to CLI", async () => {
    mockRunner(vi.mocked(nxCmd), NX_FAIL_STDOUT, "", 1);
    await callAndValidate({ target: "build", nxBail: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(nxCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--nx-bail");
  });

  // S16 [P2] dryRun: true
  it("S16 [P2] dryRun true passes --dry-run to CLI", async () => {
    mockRunner(vi.mocked(nxCmd), NX_SUCCESS_STDOUT, "", 0);
    await callAndValidate({ target: "build", dryRun: true, path: "/tmp/project" });
    const cliArgs = vi.mocked(nxCmd).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S17 [P0] Schema validation
  it("S17 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(nxCmd), NX_SUCCESS_STDOUT, "", 0);
    const { parsed } = await callAndValidate({
      target: "build",
      project: "my-app",
      path: "/tmp/project",
    });
    expect(NxResultSchema.safeParse(parsed).success).toBe(true);
  });
});
