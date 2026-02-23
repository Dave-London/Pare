import { describe, it, expect } from "vitest";
import {
  parseBuildOutput,
  parseRunOutput,
  parseDevelopOutput,
  parseShellOutput,
  parseFlakeShowOutput,
  parseFlakeCheckOutput,
  parseFlakeUpdateOutput,
} from "../src/lib/parsers.js";

// ── parseBuildOutput ─────────────────────────────────────────────────

describe("parseBuildOutput", () => {
  it("parses successful build with output paths", () => {
    const stdout = "/nix/store/abc123-hello-2.12.1\n";
    const stderr = "";
    const result = parseBuildOutput(stdout, stderr, 0, 5000);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].path).toBe("/nix/store/abc123-hello-2.12.1");
    expect(result.errors).toBeUndefined();
    expect(result.duration).toBe(5000);
    expect(result.timedOut).toBe(false);
  });

  it("parses successful build with multiple output paths", () => {
    const stdout = [
      "/nix/store/abc123-hello-2.12.1",
      "/nix/store/def456-hello-2.12.1-lib",
      "",
    ].join("\n");
    const result = parseBuildOutput(stdout, "", 0, 3000);

    expect(result.success).toBe(true);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[0].path).toBe("/nix/store/abc123-hello-2.12.1");
    expect(result.outputs[1].path).toBe("/nix/store/def456-hello-2.12.1-lib");
  });

  it("parses build failure with error message", () => {
    const stderr =
      "error: flake 'path:/home/user/project' does not provide attribute 'packages.x86_64-linux.default'\n";
    const result = parseBuildOutput("", stderr, 1, 1200);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.outputs).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toContain("does not provide attribute");
  });

  it("parses timed out build", () => {
    const result = parseBuildOutput(
      "",
      'Command "nix" timed out after 600000ms.',
      124,
      600000,
      true,
    );

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("timed out build is always unsuccessful even with exit code 0", () => {
    const result = parseBuildOutput("", "", 0, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("handles empty output on success (no-link mode)", () => {
    const result = parseBuildOutput("", "", 0, 800);

    expect(result.success).toBe(true);
    expect(result.outputs).toHaveLength(0);
    expect(result.errors).toBeUndefined();
  });

  it("ignores non-error stderr lines", () => {
    const stderr = "warning: Git tree '/home/user/project' is dirty\n";
    const result = parseBuildOutput("", stderr, 0, 2000);

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it("handles multiple errors", () => {
    const stderr = [
      "error: undefined variable 'pkgs'",
      "error: at /home/user/project/flake.nix:12:5",
    ].join("\n");
    const result = parseBuildOutput("", stderr, 1, 500);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors![0]).toBe("undefined variable 'pkgs'");
    expect(result.errors![1]).toBe("at /home/user/project/flake.nix:12:5");
  });
});

// ── parseRunOutput ───────────────────────────────────────────────────

describe("parseRunOutput", () => {
  it("parses successful run", () => {
    const result = parseRunOutput("Hello, World!\n", "", 0, 1500);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, World!");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(1500);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed run", () => {
    const result = parseRunOutput("", "error: unable to execute\n", 1, 200);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("error: unable to execute");
  });

  it("parses run with both stdout and stderr", () => {
    const result = parseRunOutput("output\n", "warning: something\n", 0, 300);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("warning: something");
  });

  it("handles empty output", () => {
    const result = parseRunOutput("", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });

  it("handles timed out run", () => {
    const result = parseRunOutput("partial", "timed out", 124, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });
});

// ── parseDevelopOutput ───────────────────────────────────────────────

describe("parseDevelopOutput", () => {
  it("parses successful develop command", () => {
    const result = parseDevelopOutput("gcc version 13.2.0\n", "", 0, 5000);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("gcc version 13.2.0");
    expect(result.stderr).toBeUndefined();
  });

  it("parses failed develop command", () => {
    const result = parseDevelopOutput("", "error: cannot find flake.nix\n", 1, 200);

    expect(result.success).toBe(false);
    expect(result.stderr).toBe("error: cannot find flake.nix");
  });

  it("handles timeout", () => {
    const result = parseDevelopOutput("", "", 124, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

// ── parseShellOutput ─────────────────────────────────────────────────

describe("parseShellOutput", () => {
  it("parses successful shell command", () => {
    const result = parseShellOutput("jq-1.7.1\n", "", 0, 3000);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("jq-1.7.1");
    expect(result.stderr).toBeUndefined();
  });

  it("parses failed shell command", () => {
    const result = parseShellOutput("", "error: flake has no attribute\n", 1, 500);

    expect(result.success).toBe(false);
    expect(result.stderr).toBe("error: flake has no attribute");
  });

  it("handles timeout", () => {
    const result = parseShellOutput("", "", 124, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

// ── parseFlakeShowOutput ─────────────────────────────────────────────

describe("parseFlakeShowOutput", () => {
  it("parses successful flake show with JSON output", () => {
    const stdout = JSON.stringify({
      packages: {
        "x86_64-linux": {
          default: { type: "derivation", name: "hello-2.12.1" },
        },
      },
      devShells: {
        "x86_64-linux": {
          default: { type: "derivation", name: "dev-shell" },
        },
      },
      checks: {
        "x86_64-linux": {
          tests: { type: "derivation", name: "tests" },
        },
      },
    });
    const result = parseFlakeShowOutput(stdout, "", 0, 2000);

    expect(result.success).toBe(true);
    expect(result.outputs).toBeDefined();
    expect(result.outputs!["packages"]).toBeDefined();
    expect(result.outputs!["devShells"]).toBeDefined();
    expect(result.outputs!["checks"]).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it("parses failed flake show with errors", () => {
    const stderr = "error: flake 'path:/home/user/project' has no flake.nix\n";
    const result = parseFlakeShowOutput("", stderr, 1, 500);

    expect(result.success).toBe(false);
    expect(result.outputs).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toContain("has no flake.nix");
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseFlakeShowOutput("not-json", "", 0, 300);

    expect(result.success).toBe(true);
    expect(result.outputs).toBeUndefined();
  });

  it("handles empty output", () => {
    const result = parseFlakeShowOutput("", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.outputs).toBeUndefined();
  });

  it("handles timeout", () => {
    const result = parseFlakeShowOutput("", "", 124, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

// ── parseFlakeCheckOutput ────────────────────────────────────────────

describe("parseFlakeCheckOutput", () => {
  it("parses successful check with warnings", () => {
    const stderr = [
      "warning: Git tree '/home/user/project' is dirty",
      "checking NixOS configuration 'nixosConfigurations.default'...",
      "checking derivation 'checks.x86_64-linux.tests'...",
    ].join("\n");
    const result = parseFlakeCheckOutput("", stderr, 0, 8000);

    expect(result.success).toBe(true);
    expect(result.checks).toHaveLength(2);
    expect(result.checks[0].name).toBe("nixosConfigurations.default");
    expect(result.checks[0].status).toBe("pass");
    expect(result.checks[1].name).toBe("checks.x86_64-linux.tests");
    expect(result.checks[1].status).toBe("pass");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Git tree");
    expect(result.errors).toHaveLength(0);
  });

  it("parses failed check with errors", () => {
    const stderr = [
      "checking derivation 'checks.x86_64-linux.tests'...",
      "error: builder for 'checks.x86_64-linux.tests' failed with exit code 1",
    ].join("\n");
    const result = parseFlakeCheckOutput("", stderr, 1, 5000);

    expect(result.success).toBe(false);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe("checks.x86_64-linux.tests");
    expect(result.checks[0].status).toBe("unknown");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("builder for");
  });

  it("handles empty output", () => {
    const result = parseFlakeCheckOutput("", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.checks).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("handles timeout", () => {
    const result = parseFlakeCheckOutput("", "", 124, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("handles only warnings no checks", () => {
    const stderr = "warning: Git tree is dirty\n";
    const result = parseFlakeCheckOutput("", stderr, 0, 200);

    expect(result.success).toBe(true);
    expect(result.checks).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });
});

// ── parseFlakeUpdateOutput ───────────────────────────────────────────

describe("parseFlakeUpdateOutput", () => {
  it("parses successful update with unicode bullets", () => {
    const stderr = [
      "\u2022 Updated input 'nixpkgs':",
      "    'github:NixOS/nixpkgs/abc123' (2024-01-01)",
      "  \u2192 'github:NixOS/nixpkgs/def456' (2024-02-01)",
      "\u2022 Updated input 'flake-utils':",
      "    'github:numtide/flake-utils/111222' (2024-01-15)",
      "  \u2192 'github:numtide/flake-utils/333444' (2024-02-15)",
    ].join("\n");
    const result = parseFlakeUpdateOutput("", stderr, 0, 10000);

    expect(result.success).toBe(true);
    expect(result.updatedInputs).toHaveLength(2);
    expect(result.updatedInputs[0].name).toBe("nixpkgs");
    expect(result.updatedInputs[0].oldRev).toBe("abc123");
    expect(result.updatedInputs[0].newRev).toBe("def456");
    expect(result.updatedInputs[1].name).toBe("flake-utils");
    expect(result.updatedInputs[1].oldRev).toBe("111222");
    expect(result.updatedInputs[1].newRev).toBe("333444");
    expect(result.errors).toHaveLength(0);
  });

  it("parses successful update with ASCII bullets", () => {
    const stderr = [
      "* Updated input 'nixpkgs':",
      "    'github:NixOS/nixpkgs/abc123' (2024-01-01)",
      "  -> 'github:NixOS/nixpkgs/def456' (2024-02-01)",
    ].join("\n");
    const result = parseFlakeUpdateOutput("", stderr, 0, 5000);

    expect(result.success).toBe(true);
    expect(result.updatedInputs).toHaveLength(1);
    expect(result.updatedInputs[0].name).toBe("nixpkgs");
  });

  it("parses update with no changes", () => {
    const result = parseFlakeUpdateOutput("", "", 0, 1000);

    expect(result.success).toBe(true);
    expect(result.updatedInputs).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("parses failed update", () => {
    const stderr = "error: cannot find flake 'github:nonexistent/repo'\n";
    const result = parseFlakeUpdateOutput("", stderr, 1, 3000);

    expect(result.success).toBe(false);
    expect(result.updatedInputs).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("cannot find flake");
  });

  it("handles timeout", () => {
    const result = parseFlakeUpdateOutput("", "", 124, 600000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});
