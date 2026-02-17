import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseCargoAddOutput,
  parseCargoAuditJson,
  parseCargoBuildJson,
  parseCargoCheckJson,
  parseCargoDocOutput,
  parseCargoFmtOutput,
  parseCargoRemoveOutput,
  parseCargoRunOutput,
  parseCargoTestOutput,
} from "../src/lib/parsers.js";
import { registerAddTool } from "../src/tools/add.js";
import { registerAuditTool } from "../src/tools/audit.js";

vi.mock("../src/lib/cargo-runner.js", () => ({
  cargo: vi.fn(),
}));

import { cargo } from "../src/lib/cargo-runner.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler; config: Record<string, unknown> }>();

  registerTool(name: string, config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler, config });
  }
}

describe("P2 cargo gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cargo).mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
  });

  describe("Gap #211: add non-registry sources", () => {
    it("maps --path source for cargo add", async () => {
      const server = new FakeServer();
      registerAddTool(server as never);
      const handler = server.tools.get("add")!.handler;

      await handler({
        path: "/repo",
        packages: ["my-crate"],
        sourcePath: "../my-crate",
      });

      expect(vi.mocked(cargo)).toHaveBeenCalledWith(
        expect.arrayContaining(["add", "my-crate", "--path", "../my-crate"]),
        "/repo",
      );
    });

    it("maps --git with branch/tag/rev", async () => {
      const server = new FakeServer();
      registerAddTool(server as never);
      const handler = server.tools.get("add")!.handler;

      await handler({
        path: "/repo",
        packages: ["my-crate"],
        git: "https://github.com/example/my-crate",
        branch: "main",
        tag: "v1.2.3",
        rev: "abc123",
      });

      const args = vi.mocked(cargo).mock.calls[0][0];
      expect(args).toContain("--git");
      expect(args).toContain("https://github.com/example/my-crate");
      expect(args).toContain("--branch");
      expect(args).toContain("main");
      expect(args).toContain("--tag");
      expect(args).toContain("v1.2.3");
      expect(args).toContain("--rev");
      expect(args).toContain("abc123");
    });

    it("rejects sourcePath with git together", async () => {
      const server = new FakeServer();
      registerAddTool(server as never);
      const handler = server.tools.get("add")!.handler;

      await expect(
        handler({
          path: "/repo",
          packages: ["my-crate"],
          sourcePath: "../my-crate",
          git: "https://github.com/example/my-crate",
        }),
      ).rejects.toThrow(/mutually exclusive/i);
    });
  });

  describe("Gap #212: features activated per package", () => {
    it("parses feature list and attaches to the added package", () => {
      const stderr = [
        "      Adding serde v1.0.217 to dependencies",
        "             Features:",
        "             + derive",
        "             + alloc",
      ].join("\n");

      const result = parseCargoAddOutput("", stderr, 0);
      expect(result.added?.[0].featuresActivated).toEqual(["derive", "alloc"]);
    });
  });

  describe("Gap #213: cargo audit bin mode", () => {
    it("parses audit result with mode=bin metadata", () => {
      const json = JSON.stringify({ vulnerabilities: { list: [] } });
      const result = parseCargoAuditJson(json, 0, false, "bin", "/tmp/my-binary");
      expect(result.mode).toBe("bin");
      expect(result.auditedBinary).toBe("/tmp/my-binary");
    });

    it("maps audit bin command arguments", async () => {
      const server = new FakeServer();
      registerAuditTool(server as never);
      const handler = server.tools.get("audit")!.handler;

      await handler({
        path: "/repo",
        mode: "bin",
        binPath: "/repo/target/release/app",
      });

      expect(vi.mocked(cargo)).toHaveBeenCalledWith(
        expect.arrayContaining(["audit", "bin", "--json", "/repo/target/release/app"]),
        "/repo",
      );
    });
  });

  describe("Gap #214: build diagnostic dedupe", () => {
    it("deduplicates identical diagnostics from multiple compilation units", () => {
      const msg = JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "E0308" },
          level: "error",
          message: "mismatched types",
          spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
        },
      });
      const stdout = [msg, msg, JSON.stringify({ reason: "build-finished", success: false })].join(
        "\n",
      );
      const result = parseCargoBuildJson(stdout, 101);
      expect(result.total).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe("Gap #215: build timings metadata", () => {
    it("captures timing report metadata from stderr", () => {
      const stdout = JSON.stringify({ reason: "build-finished", success: true });
      const stderr = "Timing report saved to /tmp/cargo-timings/cargo-timing.html";
      const result = parseCargoBuildJson(stdout, 0, stderr);
      expect(result.timings?.generated).toBe(true);
      expect(result.timings?.format).toBe("html");
      expect(result.timings?.reportPath).toContain("cargo-timing.html");
    });
  });

  describe("Gap #216: dedicated check schema/mode", () => {
    it("returns check mode metadata from parseCargoCheckJson", () => {
      const stdout = JSON.stringify({ reason: "build-finished", success: true });
      const result = parseCargoCheckJson(stdout, 0);
      expect(result.mode).toBe("check");
      expect(result.success).toBe(true);
    });
  });

  describe("Gap #217: doc JSON warning parsing", () => {
    it("parses warnings from --message-format=json compiler messages", () => {
      const stdout = JSON.stringify({
        reason: "compiler-message",
        message: {
          code: null,
          level: "warning",
          message: "missing documentation for a function",
          spans: [{ file_name: "src/lib.rs", line_start: 12, column_start: 1 }],
        },
      });
      const result = parseCargoDocOutput(stdout, "", 0);
      expect(result.warnings).toBe(1);
      expect(result.warningDetails?.[0]).toEqual({
        file: "src/lib.rs",
        line: 12,
        message: "missing documentation for a function",
      });
    });
  });

  describe("Gap #218: fmt diff capture", () => {
    it("captures diff content in check mode when present", () => {
      const stdout = [
        "Diff in src/main.rs at line 5:",
        "@@ -1,3 +1,3 @@",
        '-fn main(){println!("x");}',
        '+fn main() { println!("x"); }',
      ].join("\n");
      const result = parseCargoFmtOutput(stdout, "", 1, true);
      expect(result.diff).toContain("@@ -1,3 +1,3 @@");
      expect(result.diff).toContain("-fn main()");
    });
  });

  describe("Gap #219: remove partial success modeling", () => {
    it("marks partial success and failed package list when some removals fail", () => {
      const stdout = "      Removing serde from dependencies";
      const stderr = "error: the dependency `tokio` could not be found in `dependencies`";
      const result = parseCargoRemoveOutput(stdout, stderr, 1);
      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.removed).toEqual(["serde"]);
      expect(result.failedPackages).toEqual(["tokio"]);
    });
  });

  describe("Gap #220: run signal detection", () => {
    it("detects SIGSEGV from exit code 139", () => {
      const result = parseCargoRunOutput("", "segmentation fault", 139);
      expect(result.signal).toBe("SIGSEGV");
    });

    it("prefers explicit signal in stderr text when available", () => {
      const result = parseCargoRunOutput("", "terminated by SIGTERM", 143);
      expect(result.signal).toBe("SIGTERM");
    });
  });

  describe("Gap #221: test duration parsing", () => {
    it("captures suite duration from summary timing", () => {
      const stdout = [
        "running 1 test",
        "test tests::a ... ok",
        "",
        "test result: ok. 1 passed; 0 failed; 0 ignored; finished in 0.42s",
      ].join("\n");
      const result = parseCargoTestOutput(stdout, 0);
      expect(result.duration).toBe("0.42s");
    });

    it("captures per-test duration when emitted inline", () => {
      const stdout = [
        "running 1 test",
        "test tests::slow_case ... ok (0.75s)",
        "",
        "test result: ok. 1 passed; 0 failed; 0 ignored; finished in 0.80s",
      ].join("\n");
      const result = parseCargoTestOutput(stdout, 0);
      expect(result.tests?.[0].duration).toBe("0.75s");
      expect(result.duration).toBe("0.80s");
    });
  });
});
