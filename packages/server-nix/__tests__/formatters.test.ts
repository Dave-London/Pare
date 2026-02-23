import { describe, it, expect } from "vitest";
import {
  formatBuild,
  compactBuildMap,
  formatBuildCompact,
  formatRun,
  compactRunMap,
  formatRunCompact,
  formatDevelop,
  compactDevelopMap,
  formatDevelopCompact,
  formatShell,
  compactShellMap,
  formatShellCompact,
  formatFlakeShow,
  compactFlakeShowMap,
  formatFlakeShowCompact,
  formatFlakeCheck,
  compactFlakeCheckMap,
  formatFlakeCheckCompact,
  formatFlakeUpdate,
  compactFlakeUpdateMap,
  formatFlakeUpdateCompact,
} from "../src/lib/formatters.js";
import type {
  NixBuildResult,
  NixRunResult,
  NixDevelopResult,
  NixShellResult,
  NixFlakeShowResult,
  NixFlakeCheckResult,
  NixFlakeUpdateResult,
} from "../src/schemas/index.js";

// ── formatBuild ──────────────────────────────────────────────────────

describe("formatBuild", () => {
  it("formats successful build", () => {
    const data: NixBuildResult = {
      success: true,
      exitCode: 0,
      outputs: [{ path: "/nix/store/abc123-hello-2.12.1" }],
      duration: 5000,
      timedOut: false,
    };
    const output = formatBuild(data);
    expect(output).toContain("nix build: success (5000ms).");
    expect(output).toContain("/nix/store/abc123-hello-2.12.1");
  });

  it("formats failed build with errors", () => {
    const data: NixBuildResult = {
      success: false,
      exitCode: 1,
      outputs: [],
      errors: ["does not provide attribute 'packages.x86_64-linux.default'"],
      duration: 1200,
      timedOut: false,
    };
    const output = formatBuild(data);
    expect(output).toContain("nix build: exit code 1 (1200ms).");
    expect(output).toContain("error: does not provide attribute");
  });

  it("formats timed out build", () => {
    const data: NixBuildResult = {
      success: false,
      exitCode: 124,
      outputs: [],
      duration: 600000,
      timedOut: true,
    };
    const output = formatBuild(data);
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("600000ms");
  });

  it("formats build with no outputs", () => {
    const data: NixBuildResult = {
      success: true,
      exitCode: 0,
      outputs: [],
      duration: 800,
      timedOut: false,
    };
    const output = formatBuild(data);
    expect(output).toBe("nix build: success (800ms).");
  });
});

describe("compactBuildMap", () => {
  it("keeps success, outputCount, duration, timedOut — drops output paths", () => {
    const data: NixBuildResult = {
      success: true,
      exitCode: 0,
      outputs: [{ path: "/nix/store/abc123-hello" }, { path: "/nix/store/def456-hello-lib" }],
      duration: 3000,
      timedOut: false,
    };
    const compact = compactBuildMap(data);

    expect(compact.success).toBe(true);
    expect(compact.outputCount).toBe(2);
    expect(compact.duration).toBe(3000);
    expect(compact.timedOut).toBe(false);
    expect(compact).not.toHaveProperty("outputs");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatBuildCompact", () => {
  it("formats successful compact build", () => {
    expect(
      formatBuildCompact({ success: true, outputCount: 1, duration: 5000, timedOut: false }),
    ).toBe("nix build: success, 1 output(s) (5000ms).");
  });

  it("formats timed out compact build", () => {
    expect(
      formatBuildCompact({ success: false, outputCount: 0, duration: 600000, timedOut: true }),
    ).toContain("TIMED OUT");
  });

  it("formats failed compact build", () => {
    expect(
      formatBuildCompact({ success: false, outputCount: 0, duration: 1200, timedOut: false }),
    ).toBe("nix build: failed (1200ms).");
  });
});

// ── formatRun ────────────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: NixRunResult = {
      success: true,
      exitCode: 0,
      stdout: "Hello, World!",
      duration: 1500,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("nix run: success (1500ms).");
    expect(output).toContain("Hello, World!");
  });

  it("formats failed run", () => {
    const data: NixRunResult = {
      success: false,
      exitCode: 1,
      stderr: "error: unable to execute",
      duration: 200,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("nix run: exit code 1 (200ms).");
    expect(output).toContain("error: unable to execute");
  });

  it("formats timed out run", () => {
    const data: NixRunResult = {
      success: false,
      exitCode: 124,
      duration: 600000,
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("TIMED OUT");
  });

  it("formats run with no output", () => {
    const data: NixRunResult = {
      success: true,
      exitCode: 0,
      duration: 100,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toBe("nix run: success (100ms).");
  });
});

describe("compactRunMap", () => {
  it("keeps success, exitCode, duration, timedOut — drops stdout/stderr", () => {
    const data: NixRunResult = {
      success: true,
      exitCode: 0,
      stdout: "lots of output...",
      stderr: "some warnings",
      duration: 1500,
      timedOut: false,
    };
    const compact = compactRunMap(data);

    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.duration).toBe(1500);
    expect(compact.timedOut).toBe(false);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });
});

describe("formatRunCompact", () => {
  it("formats successful run", () => {
    expect(formatRunCompact({ success: true, exitCode: 0, duration: 100, timedOut: false })).toBe(
      "nix run: success (100ms).",
    );
  });

  it("formats failed run", () => {
    expect(formatRunCompact({ success: false, exitCode: 2, duration: 500, timedOut: false })).toBe(
      "nix run: exit code 2 (500ms).",
    );
  });

  it("formats timed out run", () => {
    const output = formatRunCompact({
      success: false,
      exitCode: 124,
      duration: 600000,
      timedOut: true,
    });
    expect(output).toContain("TIMED OUT");
  });
});

// ── formatDevelop ────────────────────────────────────────────────────

describe("formatDevelop", () => {
  it("formats successful develop", () => {
    const data: NixDevelopResult = {
      success: true,
      exitCode: 0,
      stdout: "gcc version 13.2.0",
      duration: 5000,
      timedOut: false,
    };
    const output = formatDevelop(data);
    expect(output).toContain("nix develop: success (5000ms).");
    expect(output).toContain("gcc version 13.2.0");
  });

  it("formats failed develop", () => {
    const data: NixDevelopResult = {
      success: false,
      exitCode: 1,
      stderr: "error: cannot find flake.nix",
      duration: 200,
      timedOut: false,
    };
    const output = formatDevelop(data);
    expect(output).toContain("nix develop: exit code 1 (200ms).");
  });
});

describe("compactDevelopMap / formatDevelopCompact", () => {
  it("creates compact develop output", () => {
    const data: NixDevelopResult = {
      success: true,
      exitCode: 0,
      stdout: "output",
      duration: 5000,
      timedOut: false,
    };
    const compact = compactDevelopMap(data);
    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("stdout");
    expect(formatDevelopCompact(compact)).toBe("nix develop: success (5000ms).");
  });
});

// ── formatShell ──────────────────────────────────────────────────────

describe("formatShell", () => {
  it("formats successful shell", () => {
    const data: NixShellResult = {
      success: true,
      exitCode: 0,
      stdout: "jq-1.7.1",
      duration: 3000,
      timedOut: false,
    };
    const output = formatShell(data);
    expect(output).toContain("nix shell: success (3000ms).");
    expect(output).toContain("jq-1.7.1");
  });

  it("formats failed shell", () => {
    const data: NixShellResult = {
      success: false,
      exitCode: 1,
      stderr: "error: flake has no attribute",
      duration: 500,
      timedOut: false,
    };
    const output = formatShell(data);
    expect(output).toContain("nix shell: exit code 1 (500ms).");
  });
});

describe("compactShellMap / formatShellCompact", () => {
  it("creates compact shell output", () => {
    const data: NixShellResult = {
      success: true,
      exitCode: 0,
      stdout: "output",
      duration: 3000,
      timedOut: false,
    };
    const compact = compactShellMap(data);
    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("stdout");
    expect(formatShellCompact(compact)).toBe("nix shell: success (3000ms).");
  });
});

// ── formatFlakeShow ──────────────────────────────────────────────────

describe("formatFlakeShow", () => {
  it("formats successful flake show", () => {
    const data: NixFlakeShowResult = {
      success: true,
      exitCode: 0,
      outputs: {
        packages: { "x86_64-linux": { default: { type: "derivation", name: "hello" } } },
        devShells: { "x86_64-linux": { default: { type: "derivation", name: "dev-shell" } } },
      },
      duration: 2000,
      timedOut: false,
    };
    const output = formatFlakeShow(data);
    expect(output).toContain("nix flake show: success (2000ms).");
    expect(output).toContain("packages:");
    expect(output).toContain("devShells:");
  });

  it("formats failed flake show", () => {
    const data: NixFlakeShowResult = {
      success: false,
      exitCode: 1,
      errors: ["has no flake.nix"],
      duration: 500,
      timedOut: false,
    };
    const output = formatFlakeShow(data);
    expect(output).toContain("nix flake show: exit code 1 (500ms).");
    expect(output).toContain("error: has no flake.nix");
  });
});

describe("compactFlakeShowMap / formatFlakeShowCompact", () => {
  it("creates compact flake show output", () => {
    const data: NixFlakeShowResult = {
      success: true,
      exitCode: 0,
      outputs: { packages: {}, devShells: {}, checks: {} },
      duration: 2000,
      timedOut: false,
    };
    const compact = compactFlakeShowMap(data);
    expect(compact.success).toBe(true);
    expect(compact.outputCategories).toEqual(["packages", "devShells", "checks"]);
    expect(formatFlakeShowCompact(compact)).toContain("packages, devShells, checks");
  });

  it("handles no outputs", () => {
    const data: NixFlakeShowResult = {
      success: true,
      exitCode: 0,
      duration: 100,
      timedOut: false,
    };
    const compact = compactFlakeShowMap(data);
    expect(compact.outputCategories).toEqual([]);
    expect(formatFlakeShowCompact(compact)).toContain("outputs: none");
  });
});

// ── formatFlakeCheck ─────────────────────────────────────────────────

describe("formatFlakeCheck", () => {
  it("formats successful check", () => {
    const data: NixFlakeCheckResult = {
      success: true,
      exitCode: 0,
      checks: [{ name: "checks.x86_64-linux.tests", status: "pass" }],
      errors: [],
      warnings: [],
      duration: 8000,
      timedOut: false,
    };
    const output = formatFlakeCheck(data);
    expect(output).toContain("nix flake check: success, 1 check(s) (8000ms).");
    expect(output).toContain("checks.x86_64-linux.tests: pass");
  });

  it("formats failed check with errors", () => {
    const data: NixFlakeCheckResult = {
      success: false,
      exitCode: 1,
      checks: [{ name: "checks.x86_64-linux.tests", status: "unknown" }],
      errors: ["builder failed"],
      warnings: [],
      duration: 5000,
      timedOut: false,
    };
    const output = formatFlakeCheck(data);
    expect(output).toContain("exit code 1");
    expect(output).toContain("error: builder failed");
  });

  it("includes warnings", () => {
    const data: NixFlakeCheckResult = {
      success: true,
      exitCode: 0,
      checks: [],
      errors: [],
      warnings: ["Git tree is dirty"],
      duration: 200,
      timedOut: false,
    };
    const output = formatFlakeCheck(data);
    expect(output).toContain("warning: Git tree is dirty");
  });
});

describe("compactFlakeCheckMap / formatFlakeCheckCompact", () => {
  it("creates compact flake check output", () => {
    const data: NixFlakeCheckResult = {
      success: true,
      exitCode: 0,
      checks: [
        { name: "a", status: "pass" },
        { name: "b", status: "pass" },
      ],
      errors: [],
      warnings: [],
      duration: 8000,
      timedOut: false,
    };
    const compact = compactFlakeCheckMap(data);
    expect(compact.checkCount).toBe(2);
    expect(compact.errorCount).toBe(0);
    expect(formatFlakeCheckCompact(compact)).toBe("nix flake check: 2 check(s) passed (8000ms).");
  });

  it("formats failed compact check", () => {
    const compact = compactFlakeCheckMap({
      success: false,
      exitCode: 1,
      checks: [],
      errors: ["failed"],
      warnings: [],
      duration: 1000,
      timedOut: false,
    });
    expect(formatFlakeCheckCompact(compact)).toBe("nix flake check: failed, 1 error(s) (1000ms).");
  });
});

// ── formatFlakeUpdate ────────────────────────────────────────────────

describe("formatFlakeUpdate", () => {
  it("formats successful update", () => {
    const data: NixFlakeUpdateResult = {
      success: true,
      exitCode: 0,
      updatedInputs: [
        { name: "nixpkgs", oldRev: "abc123", newRev: "def456" },
        { name: "flake-utils", oldRev: "111222", newRev: "333444" },
      ],
      errors: [],
      duration: 10000,
      timedOut: false,
    };
    const output = formatFlakeUpdate(data);
    expect(output).toContain("nix flake update: success, 2 input(s) updated (10000ms).");
    expect(output).toContain("nixpkgs abc123 -> def456");
    expect(output).toContain("flake-utils 111222 -> 333444");
  });

  it("formats failed update", () => {
    const data: NixFlakeUpdateResult = {
      success: false,
      exitCode: 1,
      updatedInputs: [],
      errors: ["cannot find flake"],
      duration: 3000,
      timedOut: false,
    };
    const output = formatFlakeUpdate(data);
    expect(output).toContain("exit code 1");
    expect(output).toContain("error: cannot find flake");
  });

  it("formats timed out update", () => {
    const data: NixFlakeUpdateResult = {
      success: false,
      exitCode: 124,
      updatedInputs: [],
      errors: [],
      duration: 600000,
      timedOut: true,
    };
    const output = formatFlakeUpdate(data);
    expect(output).toContain("TIMED OUT");
  });
});

describe("compactFlakeUpdateMap / formatFlakeUpdateCompact", () => {
  it("creates compact flake update output", () => {
    const data: NixFlakeUpdateResult = {
      success: true,
      exitCode: 0,
      updatedInputs: [{ name: "nixpkgs" }, { name: "flake-utils" }],
      errors: [],
      duration: 10000,
      timedOut: false,
    };
    const compact = compactFlakeUpdateMap(data);
    expect(compact.updatedCount).toBe(2);
    expect(formatFlakeUpdateCompact(compact)).toBe(
      "nix flake update: 2 input(s) updated (10000ms).",
    );
  });

  it("formats failed compact update", () => {
    const compact = compactFlakeUpdateMap({
      success: false,
      exitCode: 1,
      updatedInputs: [],
      errors: ["failed"],
      duration: 1000,
      timedOut: false,
    });
    expect(formatFlakeUpdateCompact(compact)).toBe("nix flake update: failed (1000ms).");
  });
});
