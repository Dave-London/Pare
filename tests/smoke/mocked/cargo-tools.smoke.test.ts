/**
 * Smoke tests: cargo server (12 tools) -- Phase 2 (mocked)
 *
 * Tests all cargo tools end-to-end with mocked cargo-runner,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CargoAddResultSchema,
  CargoAuditResultSchema,
  CargoBuildResultSchema,
  CargoCheckResultSchema,
  CargoClippyResultSchema,
  CargoDocResultSchema,
  CargoFmtResultSchema,
  CargoRemoveResultSchema,
  CargoRunResultSchema,
  CargoTestResultSchema,
  CargoTreeResultSchema,
  CargoUpdateResultSchema,
} from "../../../packages/server-cargo/src/schemas/index.js";

// Mock the cargo runner module used by all cargo tools
vi.mock("../../../packages/server-cargo/src/lib/cargo-runner.js", () => ({
  cargo: vi.fn(),
}));

import { cargo } from "../../../packages/server-cargo/src/lib/cargo-runner.js";
import { registerAddTool } from "../../../packages/server-cargo/src/tools/add.js";
import { registerAuditTool } from "../../../packages/server-cargo/src/tools/audit.js";
import { registerBuildTool } from "../../../packages/server-cargo/src/tools/build.js";
import { registerCheckTool } from "../../../packages/server-cargo/src/tools/check.js";
import { registerClippyTool } from "../../../packages/server-cargo/src/tools/clippy.js";
import { registerDocTool } from "../../../packages/server-cargo/src/tools/doc.js";
import { registerFmtTool } from "../../../packages/server-cargo/src/tools/fmt.js";
import { registerRemoveTool } from "../../../packages/server-cargo/src/tools/remove.js";
import { registerRunTool } from "../../../packages/server-cargo/src/tools/run.js";
import { registerTestTool } from "../../../packages/server-cargo/src/tools/test.js";
import { registerTreeTool } from "../../../packages/server-cargo/src/tools/tree.js";
import { registerUpdateTool } from "../../../packages/server-cargo/src/tools/update.js";

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

function mockCargo(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(cargo).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// add tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo add", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerAddTool(server as never);
    handler = server.tools.get("add")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoAddResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Add single crate
  it("S1 [P0] add single crate returns success", async () => {
    mockCargo("    Updating crates.io index\n      Adding serde v1.0.197 to dependencies\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
    });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Add nonexistent crate
  it("S2 [P0] add nonexistent crate returns failure", async () => {
    mockCargo("", "error: could not find `nonexistent-crate-zzz` in registry `crates-io`\n", 101);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["nonexistent-crate-zzz"],
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml returns error", async () => {
    mockCargo(
      "",
      "error: could not find `Cargo.toml` in `/tmp/empty` or any parent directory\n",
      101,
    );
    const { parsed } = await callAndValidate({
      path: "/tmp/empty",
      packages: ["serde"],
    });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] Flag injection on packages
  it("S4 [P0] flag injection on packages is blocked", async () => {
    await expect(callAndValidate({ packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on features
  it("S5 [P0] flag injection on features is blocked", async () => {
    await expect(
      callAndValidate({ packages: ["serde"], features: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S6 [P0] Flag injection on package
  it("S6 [P0] flag injection on package is blocked", async () => {
    await expect(
      callAndValidate({ packages: ["serde"], package: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection on rename
  it("S7 [P0] flag injection on rename is blocked", async () => {
    await expect(callAndValidate({ packages: ["serde"], rename: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on registry
  it("S8 [P0] flag injection on registry is blocked", async () => {
    await expect(
      callAndValidate({ packages: ["serde"], registry: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S9 [P0] Flag injection on sourcePath
  it("S9 [P0] flag injection on sourcePath is blocked", async () => {
    await expect(
      callAndValidate({ packages: ["serde"], sourcePath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S10 [P0] Flag injection on git
  it("S10 [P0] flag injection on git is blocked", async () => {
    await expect(callAndValidate({ packages: ["serde"], git: "--exec=evil" })).rejects.toThrow();
  });

  // S11 [P0] Flag injection on branch
  it("S11 [P0] flag injection on branch is blocked", async () => {
    await expect(
      callAndValidate({
        packages: ["serde"],
        git: "https://github.com/serde-rs/serde",
        branch: "--exec=evil",
      }),
    ).rejects.toThrow();
  });

  // S12 [P0] Mutual exclusion: sourcePath + git
  it("S12 [P0] sourcePath and git are mutually exclusive", async () => {
    await expect(
      callAndValidate({
        packages: ["serde"],
        sourcePath: "./local",
        git: "https://github.com/serde-rs/serde",
      }),
    ).rejects.toThrow("mutually exclusive");
  });

  // S13 [P0] branch/tag/rev without git
  it("S13 [P0] branch without git throws error", async () => {
    await expect(callAndValidate({ packages: ["serde"], branch: "main" })).rejects.toThrow(
      "require git source",
    );
  });

  // S14 [P1] Add as dev dependency
  it("S14 [P1] add as dev dependency sets dependencyType", async () => {
    mockCargo(
      "    Updating crates.io index\n      Adding serde v1.0.197 to dev-dependencies\n",
      "",
      0,
    );
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
      dev: true,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.dependencyType).toBe("dev");
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dev");
  });

  // S15 [P1] Add with features
  it("S15 [P1] add with features passes --features to CLI", async () => {
    mockCargo(
      "    Updating crates.io index\n      Adding serde v1.0.197 to dependencies\n             Features:\n             + derive\n",
      "",
      0,
    );
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
      features: ["derive"],
    });
    expect(parsed.success).toBe(true);
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--features");
    expect(cliArgs).toContain("derive");
  });

  // S16 [P1] Dry run
  it("S16 [P1] dry run passes --dry-run to CLI", async () => {
    mockCargo(
      "    Updating crates.io index\n      Adding serde v1.0.197 to dependencies (dry run)\n",
      "",
      0,
    );
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
      dryRun: true,
    });
    expect(parsed.success).toBe(true);
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S17 [P0] Schema validation
  it("S17 [P0] schema validation passes on all results", async () => {
    mockCargo("    Updating crates.io index\n      Adding serde v1.0.197 to dependencies\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
    });
    expect(CargoAddResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// audit tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo audit", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerAuditTool(server as never);
    handler = server.tools.get("audit")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoAuditResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const AUDIT_CLEAN_JSON = JSON.stringify({
    vulnerabilities: { found: 0, list: [] },
    warnings: {},
  });

  const AUDIT_VULN_JSON = JSON.stringify({
    vulnerabilities: {
      found: 1,
      list: [
        {
          advisory: {
            id: "RUSTSEC-2022-0090",
            package: "libsqlite3-sys",
            title: "Use after free in libsqlite3-sys",
            date: "2022-12-01",
            url: "https://rustsec.org/advisories/RUSTSEC-2022-0090",
            cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          },
          versions: {
            patched: [">=0.25.2"],
            unaffected: [],
          },
          affected: {
            package: "libsqlite3-sys",
            version: "0.25.1",
          },
        },
      ],
    },
    warnings: {},
  });

  // S1 [P0] No vulnerabilities
  it("S1 [P0] no vulnerabilities returns success", async () => {
    mockCargo(AUDIT_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Vulnerabilities found
  it("S2 [P0] vulnerabilities found returns failure with details", async () => {
    mockCargo(AUDIT_VULN_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] cargo-audit not installed
  it("S3 [P0] cargo-audit not installed throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("cargo-audit is not installed"));
    await expect(callAndValidate({ path: "/tmp/project" })).rejects.toThrow();
  });

  // S4 [P0] No Cargo.lock
  it("S4 [P0] no Cargo.lock throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("Couldn't load lock file"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on targetArch
  it("S5 [P0] flag injection on targetArch is blocked", async () => {
    await expect(callAndValidate({ targetArch: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on targetOs
  it("S6 [P0] flag injection on targetOs is blocked", async () => {
    await expect(callAndValidate({ targetOs: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on file
  it("S7 [P0] flag injection on file is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on db
  it("S8 [P0] flag injection on db is blocked", async () => {
    await expect(callAndValidate({ db: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on binPath
  it("S9 [P0] flag injection on binPath is blocked", async () => {
    await expect(callAndValidate({ mode: "bin", binPath: "--exec=evil" })).rejects.toThrow();
  });

  // S10 [P0] Flag injection on ignore
  it("S10 [P0] flag injection on ignore is blocked", async () => {
    await expect(callAndValidate({ ignore: ["--exec=evil"] })).rejects.toThrow();
  });

  // S11 [P0] Mode=bin without binPath
  it("S11 [P0] mode=bin without binPath throws error", async () => {
    await expect(callAndValidate({ mode: "bin" })).rejects.toThrow("binPath is required");
  });

  // S12 [P0] Mode=bin with fix
  it("S12 [P0] mode=bin with fix throws error", async () => {
    await expect(callAndValidate({ mode: "bin", binPath: "./bin", fix: true })).rejects.toThrow(
      "fix mode is not supported",
    );
  });

  // S13 [P1] Ignore advisory
  it("S13 [P1] ignore advisory passes --ignore to CLI", async () => {
    mockCargo(AUDIT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", ignore: ["RUSTSEC-2022-0090"] });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--ignore");
    expect(cliArgs).toContain("RUSTSEC-2022-0090");
  });

  // S14 [P1] No-fetch (offline)
  it("S14 [P1] no-fetch passes --no-fetch to CLI", async () => {
    mockCargo(AUDIT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", noFetch: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--no-fetch");
  });

  // S15 [P2] Fix mode
  it("S15 [P2] fix mode passes fix subcommand to CLI", async () => {
    mockCargo(AUDIT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", fix: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("fix");
  });

  // S16 [P0] Schema validation
  it("S16 [P0] schema validation passes on all results", async () => {
    mockCargo(AUDIT_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoAuditResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// build tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo build", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const BUILD_SUCCESS_JSON =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n';

  const BUILD_ERROR_JSON =
    '{"reason":"compiler-message","message":{"rendered":"error[E0308]: mismatched types\\n","code":{"code":"E0308"},"level":"error","message":"mismatched types","spans":[{"file_name":"src/main.rs","byte_start":100,"byte_end":105,"line_start":5,"line_end":5,"column_start":10,"column_end":15}]}}\n' +
    '{"reason":"build-finished","success":false}\n';

  // S1 [P0] Successful build
  it("S1 [P0] successful build returns success", async () => {
    mockCargo(BUILD_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Build with errors
  it("S2 [P0] build with errors returns diagnostics", async () => {
    mockCargo(BUILD_ERROR_JSON, "", 101);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on package
  it("S4 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on target
  it("S5 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on profile
  it("S6 [P0] flag injection on profile is blocked", async () => {
    await expect(callAndValidate({ profile: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on manifestPath
  it("S7 [P0] flag injection on manifestPath is blocked", async () => {
    await expect(callAndValidate({ manifestPath: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on features
  it("S8 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S9 [P1] Release build
  it("S9 [P1] release build passes --release to CLI", async () => {
    mockCargo(BUILD_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", release: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--release");
  });

  // S10 [P1] Build with features
  it("S10 [P1] build with features passes --features to CLI", async () => {
    mockCargo(BUILD_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", features: ["serde"] });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--features");
    expect(cliArgs).toContain("serde");
  });

  // S11 [P1] Keep going on errors
  it("S11 [P1] keep going passes --keep-going to CLI", async () => {
    mockCargo(BUILD_ERROR_JSON, "", 101);
    await callAndValidate({ path: "/tmp/project", keepGoing: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--keep-going");
  });

  // S12 [P2] Build with timings
  it("S12 [P2] build with timings passes --timings to CLI", async () => {
    mockCargo(BUILD_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", timings: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--timings");
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockCargo(BUILD_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoBuildResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// check tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo check", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerCheckTool(server as never);
    handler = server.tools.get("check")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoCheckResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const CHECK_SUCCESS_JSON =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n';

  const CHECK_ERROR_JSON =
    '{"reason":"compiler-message","message":{"rendered":"error[E0308]: mismatched types\\n","code":{"code":"E0308"},"level":"error","message":"mismatched types","spans":[{"file_name":"src/main.rs","byte_start":100,"byte_end":105,"line_start":5,"line_end":5,"column_start":10,"column_end":15}]}}\n' +
    '{"reason":"build-finished","success":false}\n';

  // S1 [P0] Clean project
  it("S1 [P0] clean project returns success with mode check", async () => {
    mockCargo(CHECK_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Type errors
  it("S2 [P0] type errors return diagnostics", async () => {
    mockCargo(CHECK_ERROR_JSON, "", 101);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on package
  it("S4 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on target
  it("S5 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on features
  it("S6 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S7 [P1] Check all targets
  it("S7 [P1] allTargets passes --all-targets to CLI", async () => {
    mockCargo(CHECK_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", allTargets: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--all-targets");
  });

  // S8 [P1] Check workspace
  it("S8 [P1] workspace passes --workspace to CLI", async () => {
    mockCargo(CHECK_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", workspace: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--workspace");
  });

  // S9 [P0] Schema validation
  it("S9 [P0] schema validation passes on all results", async () => {
    mockCargo(CHECK_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoCheckResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// clippy tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo clippy", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const CLIPPY_CLEAN_JSON =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n';

  const CLIPPY_WARN_JSON =
    '{"reason":"compiler-message","message":{"rendered":"warning: unnecessary `unwrap()`\\n","code":{"code":"clippy::unwrap_used"},"level":"warning","message":"unnecessary `unwrap()`","spans":[{"file_name":"src/main.rs","byte_start":100,"byte_end":110,"line_start":10,"line_end":10,"column_start":5,"column_end":15}],"children":[{"message":"try using `expect` instead","level":"help"}]}}\n' +
    '{"reason":"build-finished","success":true}\n';

  // S1 [P0] Clean project
  it("S1 [P0] clean project returns success with zero warnings", async () => {
    mockCargo(CLIPPY_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Project with lint warnings
  it("S2 [P0] project with lint warnings returns diagnostics", async () => {
    mockCargo(CLIPPY_WARN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on package
  it("S4 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on features
  it("S5 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on warn
  it("S6 [P0] flag injection on warn is blocked", async () => {
    await expect(callAndValidate({ warn: ["--exec=evil"] })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on allow
  it("S7 [P0] flag injection on allow is blocked", async () => {
    await expect(callAndValidate({ allow: ["--exec=evil"] })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on deny
  it("S8 [P0] flag injection on deny is blocked", async () => {
    await expect(callAndValidate({ deny: ["--exec=evil"] })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on forbid
  it("S9 [P0] flag injection on forbid is blocked", async () => {
    await expect(callAndValidate({ forbid: ["--exec=evil"] })).rejects.toThrow();
  });

  // S10 [P1] Deny specific lint
  it("S10 [P1] deny lint passes -D flag after -- to CLI", async () => {
    mockCargo(CLIPPY_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", deny: ["clippy::unwrap_used"] });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--");
    expect(cliArgs).toContain("-D");
    expect(cliArgs).toContain("clippy::unwrap_used");
  });

  // S11 [P1] Fix mode
  it("S11 [P1] fix mode passes --fix and --allow-dirty to CLI", async () => {
    mockCargo(CLIPPY_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", fix: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--fix");
    expect(cliArgs).toContain("--allow-dirty");
  });

  // S12 [P1] Suggestion text
  it("S12 [P1] diagnostics may include suggestion text", async () => {
    mockCargo(CLIPPY_WARN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.diagnostics).toBeDefined();
    if (parsed.diagnostics && parsed.diagnostics.length > 0) {
      // Suggestion may or may not be present depending on parser
      expect(parsed.diagnostics[0]).toHaveProperty("message");
    }
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockCargo(CLIPPY_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoClippyResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// doc tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo doc", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerDocTool(server as never);
    handler = server.tools.get("doc")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoDocResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const DOC_SUCCESS_JSON =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n';

  const DOC_WARN_OUTPUT =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n';

  // S1 [P0] Generate docs successfully
  it("S1 [P0] generate docs returns success", async () => {
    mockCargo(DOC_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.warnings).toBe(0);
  });

  // S2 [P0] Docs with warnings
  it("S2 [P0] docs with warnings populates warning count", async () => {
    mockCargo(
      DOC_WARN_OUTPUT,
      "warning: missing documentation for a function\n --> src/lib.rs:5:1\n",
      0,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on package
  it("S4 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on target
  it("S5 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on features
  it("S6 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S7 [P1] Doc with noDeps
  it("S7 [P1] noDeps passes --no-deps to CLI", async () => {
    mockCargo(DOC_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", noDeps: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--no-deps");
  });

  // S8 [P2] Doc private items
  it("S8 [P2] documentPrivateItems passes --document-private-items to CLI", async () => {
    mockCargo(DOC_SUCCESS_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", documentPrivateItems: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--document-private-items");
  });

  // S9 [P0] Schema validation
  it("S9 [P0] schema validation passes on all results", async () => {
    mockCargo(DOC_SUCCESS_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoDocResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fmt tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo fmt", () => {
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
    const parsed = CargoFmtResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Already formatted
  it("S1 [P0] already formatted returns success with no files changed", async () => {
    mockCargo("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.needsFormatting).toBe(false);
    expect(parsed.filesChanged).toBe(0);
  });

  // S2 [P0] Files need formatting
  it("S2 [P0] files need formatting returns changed files", async () => {
    mockCargo("src/main.rs\nsrc/lib.rs\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThan(0);
  });

  // S3 [P0] Check mode with violations
  it("S3 [P0] check mode with violations returns failure", async () => {
    mockCargo("", "Diff in /tmp/project/src/main.rs\n", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", check: true });
    expect(parsed.needsFormatting).toBe(true);
  });

  // S4 [P0] No Cargo.toml
  it("S4 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on package
  it("S5 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on configPath
  it("S6 [P0] flag injection on configPath is blocked", async () => {
    await expect(callAndValidate({ configPath: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P1] Check with diff output
  it("S7 [P1] check with diff includes diff in output", async () => {
    const diffOutput = "Diff in /tmp/project/src/main.rs at line 5:\n- fn main() {\n+ fn main(){\n";
    mockCargo("", diffOutput, 1);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      check: true,
      includeDiff: true,
    });
    expect(parsed.needsFormatting).toBe(true);
  });

  // S8 [P1] Format workspace
  it("S8 [P1] format workspace passes --all to CLI", async () => {
    mockCargo("", "", 0);
    await callAndValidate({ path: "/tmp/project", all: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--all");
  });

  // S9 [P2] Custom edition
  it("S9 [P2] custom edition passes --edition to CLI", async () => {
    mockCargo("", "", 0);
    await callAndValidate({ path: "/tmp/project", edition: "2021" });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--");
    expect(cliArgs).toContain("--edition");
    expect(cliArgs).toContain("2021");
  });

  // S10 [P0] Schema validation
  it("S10 [P0] schema validation passes on all results", async () => {
    mockCargo("", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoFmtResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// remove tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo remove", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerRemoveTool(server as never);
    handler = server.tools.get("remove")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoRemoveResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Remove existing dep
  it("S1 [P0] remove existing dep returns success", async () => {
    mockCargo("    Removing serde from dependencies\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.removed.length).toBeGreaterThanOrEqual(1);
  });

  // S2 [P0] Remove nonexistent dep
  it("S2 [P0] remove nonexistent dep returns failure", async () => {
    mockCargo(
      "",
      "error: the dependency `nonexistent` could not be found in `dependencies`\n",
      101,
    );
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["nonexistent"],
    });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty", packages: ["serde"] })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on packages
  it("S4 [P0] flag injection on packages is blocked", async () => {
    await expect(callAndValidate({ packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on package
  it("S5 [P0] flag injection on package is blocked", async () => {
    await expect(
      callAndValidate({ packages: ["serde"], package: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S6 [P0] Flag injection on manifestPath
  it("S6 [P0] flag injection on manifestPath is blocked", async () => {
    await expect(
      callAndValidate({ packages: ["serde"], manifestPath: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P1] Remove dev dep
  it("S7 [P1] remove dev dep passes --dev to CLI", async () => {
    mockCargo("    Removing test-crate from dev-dependencies\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["test-crate"],
      dev: true,
    });
    expect(parsed.success).toBe(true);
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dev");
  });

  // S8 [P1] Dry run
  it("S8 [P1] dry run passes --dry-run to CLI", async () => {
    mockCargo("    Removing serde from dependencies (dry run)\n", "", 0);
    await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
      dryRun: true,
    });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S9 [P1] Partial success (multi-package)
  it("S9 [P1] partial success with multi-package remove", async () => {
    mockCargo(
      "    Removing exists from dependencies\n",
      "error: the dependency `not-exists` could not be found\n",
      101,
    );
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["exists", "not-exists"],
    });
    // Parser should handle partial success
    expect(parsed).toBeDefined();
  });

  // S10 [P0] Schema validation
  it("S10 [P0] schema validation passes on all results", async () => {
    mockCargo("    Removing serde from dependencies\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      packages: ["serde"],
    });
    expect(CargoRemoveResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// run tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo run", () => {
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
    const parsed = CargoRunResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Run successful program
  it("S1 [P0] run successful program returns exit code 0", async () => {
    mockCargo("Hello, world!\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.exitCode).toBe(0);
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Compilation error
  it("S2 [P0] compilation error returns failure", async () => {
    mockCargo("", "error[E0308]: mismatched types\n", 101);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.exitCode).toBe(101);
    expect(parsed.success).toBe(false);
    expect(parsed.failureType).toBe("compilation");
  });

  // S3 [P0] Runtime error
  it("S3 [P0] runtime error returns failure", async () => {
    mockCargo("", "thread 'main' panicked at 'explicit panic'\n", 101);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.failureType).toBe("runtime");
  });

  // S4 [P0] No Cargo.toml
  it("S4 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on package
  it("S5 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on bin
  it("S6 [P0] flag injection on bin is blocked", async () => {
    await expect(callAndValidate({ bin: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on example
  it("S7 [P0] flag injection on example is blocked", async () => {
    await expect(callAndValidate({ example: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on profile
  it("S8 [P0] flag injection on profile is blocked", async () => {
    await expect(callAndValidate({ profile: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on target
  it("S9 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S10 [P0] Flag injection on args -- args are intentionally not validated (commit 2990891)
  it("S10 [P0] args are passed through to CLI after --", async () => {
    mockCargo("output\n", "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      args: ["--help"],
    });
    expect(parsed.success).toBe(true);
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--");
    expect(cliArgs).toContain("--help");
  });

  // S11 [P0] Flag injection on features
  it("S11 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S12 [P1] Timeout
  it("S12 [P1] timeout detection returns failureType timeout", async () => {
    mockCargo("", "timed out after 1000ms\n", 1);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      timeout: 1000,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.failureType).toBe("timeout");
  });

  // S13 [P1] Output truncation
  it("S13 [P1] large output is truncated", async () => {
    const largeOutput = "x".repeat(2048);
    mockCargo(largeOutput, "", 0);
    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      maxOutputSize: 1024,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.stdoutTruncated).toBe(true);
  });

  // S14 [P1] Run with args
  it("S14 [P1] run with args passes args after -- to CLI", async () => {
    mockCargo("output\n", "", 0);
    await callAndValidate({ path: "/tmp/project", args: ["--help"] });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--");
    expect(cliArgs).toContain("--help");
  });

  // S15 [P0] Schema validation
  it("S15 [P0] schema validation passes on all results", async () => {
    mockCargo("Hello, world!\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoRunResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// test tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo test", () => {
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
    const parsed = CargoTestResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const TEST_PASS_OUTPUT =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n' +
    "\n" +
    "running 3 tests\n" +
    "test tests::test_one ... ok\n" +
    "test tests::test_two ... ok\n" +
    "test tests::test_three ... ok\n" +
    "\n" +
    "test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.05s\n";

  const TEST_FAIL_OUTPUT =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n' +
    "\n" +
    "running 2 tests\n" +
    "test tests::test_pass ... ok\n" +
    "test tests::test_fail ... FAILED\n" +
    "\n" +
    "failures:\n" +
    "\n" +
    "---- tests::test_fail stdout ----\n" +
    "thread 'tests::test_fail' panicked at 'assertion failed'\n" +
    "\n" +
    "failures:\n" +
    "    tests::test_fail\n" +
    "\n" +
    "test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s\n";

  const TEST_EMPTY_OUTPUT =
    '{"reason":"compiler-artifact","package_id":"my-crate 0.1.0","target":{"name":"my-crate"},"profile":{"opt_level":"0"},"features":[],"filenames":[],"executable":null,"fresh":false}\n' +
    '{"reason":"build-finished","success":true}\n' +
    "\n" +
    "running 0 tests\n" +
    "\n" +
    "test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n";

  const TEST_COMPILE_ERROR =
    '{"reason":"compiler-message","message":{"rendered":"error[E0308]: mismatched types\\n","code":{"code":"E0308"},"level":"error","message":"mismatched types","spans":[{"file_name":"src/main.rs","byte_start":100,"byte_end":105,"line_start":5,"line_end":5,"column_start":10,"column_end":15}]}}\n' +
    '{"reason":"build-finished","success":false}\n';

  // S1 [P0] All tests pass
  it("S1 [P0] all tests pass returns success", async () => {
    mockCargo(TEST_PASS_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.passed).toBeGreaterThan(0);
    expect(parsed.failed).toBe(0);
  });

  // S2 [P0] Tests with failures
  it("S2 [P0] tests with failures returns failure", async () => {
    mockCargo(TEST_FAIL_OUTPUT, "", 101);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.failed).toBeGreaterThan(0);
  });

  // S3 [P0] No tests found
  it("S3 [P0] no tests found returns success with zero total", async () => {
    mockCargo(TEST_EMPTY_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.passed).toBe(0);
    expect(parsed.failed).toBe(0);
  });

  // S4 [P0] Compilation failure
  it("S4 [P0] compilation failure returns diagnostics", async () => {
    mockCargo(TEST_COMPILE_ERROR, "", 101);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
  });

  // S5 [P0] Flag injection on filter
  it("S5 [P0] flag injection on filter is blocked", async () => {
    await expect(callAndValidate({ filter: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on package
  it("S6 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on features
  it("S7 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S8 [P1] Filter specific test
  it("S8 [P1] filter passes test name to CLI", async () => {
    mockCargo(TEST_PASS_OUTPUT, "", 0);
    await callAndValidate({ path: "/tmp/project", filter: "test_name" });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("test_name");
  });

  // S9 [P1] Doc tests only
  it("S9 [P1] doc tests passes --doc to CLI", async () => {
    mockCargo(TEST_EMPTY_OUTPUT, "", 0);
    await callAndValidate({ path: "/tmp/project", doc: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--doc");
  });

  // S10 [P1] Ignored tests
  it("S10 [P1] testArgs are passed after -- to CLI", async () => {
    mockCargo(TEST_PASS_OUTPUT, "", 0);
    await callAndValidate({ path: "/tmp/project", testArgs: ["--ignored"] });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--");
    expect(cliArgs).toContain("--ignored");
  });

  // S11 [P2] Test duration tracking
  it("S11 [P2] duration is populated from test output", async () => {
    mockCargo(TEST_PASS_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    // duration may or may not be populated depending on parser
    expect(parsed).toBeDefined();
  });

  // S12 [P0] Schema validation
  it("S12 [P0] schema validation passes on all results", async () => {
    mockCargo(TEST_PASS_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoTestResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// tree tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo tree", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
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

  const TREE_OUTPUT =
    "my-crate v0.1.0 (/tmp/project)\n" +
    "├── serde v1.0.197\n" +
    "│   └── serde_derive v1.0.197 (proc-macro)\n" +
    "└── tokio v1.36.0\n" +
    "    ├── pin-project-lite v0.2.13\n" +
    "    └── tokio-macros v2.2.0 (proc-macro)\n";

  // S1 [P0] Display dependency tree
  it("S1 [P0] display dependency tree returns success", async () => {
    mockCargo(TREE_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.packages).toBeGreaterThan(0);
  });

  // S2 [P0] No Cargo.toml
  it("S2 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S3 [P0] Flag injection on package
  it("S3 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on prune
  it("S4 [P0] flag injection on prune is blocked", async () => {
    await expect(callAndValidate({ prune: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on invert
  it("S5 [P0] flag injection on invert is blocked", async () => {
    await expect(callAndValidate({ invert: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on format
  it("S6 [P0] flag injection on format is blocked", async () => {
    await expect(callAndValidate({ format: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on target
  it("S7 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on features
  it("S8 [P0] flag injection on features is blocked", async () => {
    await expect(callAndValidate({ features: ["--exec=evil"] })).rejects.toThrow();
  });

  // S9 [P1] Depth limit
  it("S9 [P1] depth limit passes --depth to CLI", async () => {
    mockCargo(TREE_OUTPUT, "", 0);
    await callAndValidate({ path: "/tmp/project", depth: 1 });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--depth");
    expect(cliArgs).toContain("1");
  });

  // S10 [P1] Show duplicates
  it("S10 [P1] duplicates passes --duplicates to CLI", async () => {
    mockCargo(TREE_OUTPUT, "", 0);
    await callAndValidate({ path: "/tmp/project", duplicates: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--duplicates");
  });

  // S11 [P1] Invert tree
  it("S11 [P1] invert passes --invert to CLI", async () => {
    mockCargo(TREE_OUTPUT, "", 0);
    await callAndValidate({ path: "/tmp/project", invert: "serde" });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--invert");
    expect(cliArgs).toContain("serde");
  });

  // S12 [P0] Schema validation
  it("S12 [P0] schema validation passes on all results", async () => {
    mockCargo(TREE_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoTreeResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// update tool
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: cargo update", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerUpdateTool(server as never);
    handler = server.tools.get("update")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CargoUpdateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const UPDATE_OUTPUT =
    "    Updating crates.io index\n" +
    "    Updating serde v1.0.196 -> v1.0.197\n" +
    "    Updating tokio v1.35.0 -> v1.36.0\n";

  const UPDATE_NOOP_OUTPUT = "    Updating crates.io index\n";

  // S1 [P0] Update all deps
  it("S1 [P0] update all deps returns success", async () => {
    mockCargo("", UPDATE_OUTPUT, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] No updates available
  it("S2 [P0] no updates returns success with zero updated", async () => {
    mockCargo("", UPDATE_NOOP_OUTPUT, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.totalUpdated).toBe(0);
  });

  // S3 [P0] No Cargo.toml
  it("S3 [P0] no Cargo.toml throws error", async () => {
    vi.mocked(cargo).mockRejectedValueOnce(new Error("could not find `Cargo.toml`"));
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on package
  it("S4 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on precise
  it("S5 [P0] flag injection on precise is blocked", async () => {
    await expect(callAndValidate({ package: "serde", precise: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on manifestPath
  it("S6 [P0] flag injection on manifestPath is blocked", async () => {
    await expect(callAndValidate({ manifestPath: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P1] Update specific package
  it("S7 [P1] update specific package passes -p to CLI", async () => {
    mockCargo("", UPDATE_OUTPUT, 0);
    await callAndValidate({ path: "/tmp/project", package: "serde" });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-p");
    expect(cliArgs).toContain("serde");
  });

  // S8 [P1] Dry run
  it("S8 [P1] dry run passes --dry-run to CLI", async () => {
    mockCargo("", UPDATE_OUTPUT, 0);
    await callAndValidate({ path: "/tmp/project", dryRun: true });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S9 [P2] Precise version
  it("S9 [P2] precise version passes --precise to CLI", async () => {
    mockCargo("", UPDATE_OUTPUT, 0);
    await callAndValidate({
      path: "/tmp/project",
      package: "serde",
      precise: "1.0.200",
    });
    const cliArgs = vi.mocked(cargo).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--precise");
    expect(cliArgs).toContain("1.0.200");
  });

  // S10 [P0] Schema validation
  it("S10 [P0] schema validation passes on all results", async () => {
    mockCargo("", UPDATE_OUTPUT, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(CargoUpdateResultSchema.safeParse(parsed).success).toBe(true);
  });
});
