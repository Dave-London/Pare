import { describe, it, expect } from "vitest";
import {
  formatRun,
  formatList,
  compactRunMap,
  formatRunCompact,
  compactListMap,
  formatListCompact,
} from "../src/lib/formatters.js";
import type { MakeRunResultInternal, MakeListResultInternal } from "../src/schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: MakeRunResultInternal = {
      target: "build",
      success: true,
      exitCode: 0,
      stdout: "Build complete",
      duration: 1234,
      tool: "make",
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("make build: success (1234ms).");
    expect(output).toContain("Build complete");
  });

  it("formats failed run", () => {
    const data: MakeRunResultInternal = {
      target: "test",
      success: false,
      exitCode: 2,
      stderr: "make: *** [test] Error 2",
      duration: 567,
      tool: "make",
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("make test: exit code 2 (567ms).");
    expect(output).toContain("make: *** [test] Error 2");
  });

  it("includes errorType when present", () => {
    const data: MakeRunResultInternal = {
      target: "missing",
      success: false,
      exitCode: 2,
      duration: 120,
      tool: "make",
      timedOut: false,
      errorType: "missing-target",
    };
    const output = formatRun(data);
    expect(output).toContain("errorType: missing-target");
  });

  it("formats just run", () => {
    const data: MakeRunResultInternal = {
      target: "deploy",
      success: true,
      exitCode: 0,
      stdout: "Deployed!",
      duration: 5000,
      tool: "just",
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("just deploy: success (5000ms).");
    expect(output).toContain("Deployed!");
  });

  it("formats run with no output", () => {
    const data: MakeRunResultInternal = {
      target: "clean",
      success: true,
      exitCode: 0,
      duration: 50,
      tool: "make",
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toBe("make clean: success (50ms).");
  });

  it("formats timed out run", () => {
    const data: MakeRunResultInternal = {
      target: "long-task",
      success: false,
      exitCode: 124,
      stderr: 'Command "make" timed out after 300000ms.',
      duration: 300000,
      tool: "make",
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("300000ms");
    expect(output).toContain("exit code 124");
  });

  it("formats timed out just run", () => {
    const data: MakeRunResultInternal = {
      target: "build",
      success: false,
      exitCode: 124,
      duration: 300000,
      tool: "just",
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("just build: TIMED OUT");
    expect(output).toContain("300000ms");
  });
});

describe("formatList", () => {
  it("formats empty target list", () => {
    const data: MakeListResultInternal = {
      targets: [],
      total: 0,
      tool: "make",
    };
    expect(formatList(data)).toBe("make: no targets found.");
  });

  it("formats just target list with descriptions", () => {
    const data: MakeListResultInternal = {
      targets: [
        { name: "build", description: "Build the project" },
        { name: "test", description: "Run tests" },
        { name: "clean" },
      ],
      total: 3,
      tool: "just",
    };
    const output = formatList(data);
    expect(output).toContain("just: 3 targets");
    expect(output).toContain("build");
    expect(output).toContain("# Build the project");
    expect(output).toContain("test");
    expect(output).toContain("# Run tests");
    expect(output).toContain("clean");
  });

  it("formats make target list", () => {
    const data: MakeListResultInternal = {
      targets: [{ name: "all" }, { name: "build" }, { name: "test" }],
      total: 3,
      tool: "make",
    };
    const output = formatList(data);
    expect(output).toContain("make: 3 targets");
    expect(output).toContain("  all");
    expect(output).toContain("  build");
    expect(output).toContain("  test");
  });

  it("formats targets with phony flag", () => {
    const data: MakeListResultInternal = {
      targets: [{ name: "build", isPhony: true }, { name: "main.o" }],
      total: 2,
      tool: "make",
    };
    const output = formatList(data);
    expect(output).toContain("build [phony]");
    expect(output).not.toContain("main.o [phony]");
  });

  it("formats targets with dependencies", () => {
    const data: MakeListResultInternal = {
      targets: [{ name: "test", dependencies: ["build", "fixtures"] }, { name: "build" }],
      total: 2,
      tool: "make",
    };
    const output = formatList(data);
    expect(output).toContain("test -> build, fixtures");
    expect(output).not.toContain("build ->");
  });

  it("formats targets with phony, dependencies, and descriptions", () => {
    const data: MakeListResultInternal = {
      targets: [
        {
          name: "deploy",
          isPhony: true,
          dependencies: ["build", "test"],
          description: "Deploy to prod",
        },
      ],
      total: 1,
      tool: "just",
    };
    const output = formatList(data);
    expect(output).toContain("deploy [phony] -> build, test # Deploy to prod");
  });

  it("formats target recipes and pattern rules", () => {
    const data: MakeListResultInternal = {
      targets: [{ name: "build", recipe: ["echo build"] }],
      patternRules: [{ pattern: "%.o", dependencies: ["%.c"], recipe: ["$(CC) -c $< -o $@"] }],
      total: 1,
      tool: "make",
    };
    const output = formatList(data);
    expect(output).toContain("build");
    expect(output).toContain("$ echo build");
    expect(output).toContain("pattern rules: 1");
    expect(output).toContain("%.o -> %.c");
  });
});

// ── Compact mappers and formatters ───────────────────────────────────

describe("compactRunMap", () => {
  it("keeps success, exitCode, timedOut; drops target, tool, duration, stdout, stderr", () => {
    const data: MakeRunResultInternal = {
      target: "build",
      success: true,
      exitCode: 0,
      stdout: "lots of build output...",
      stderr: "some warnings",
      duration: 1234,
      tool: "make",
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.timedOut).toBe(false);
    expect(compact).not.toHaveProperty("target");
    expect(compact).not.toHaveProperty("tool");
    expect(compact).not.toHaveProperty("duration");
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves non-zero exit code", () => {
    const data: MakeRunResultInternal = {
      target: "test",
      success: false,
      exitCode: 2,
      stderr: "error details",
      duration: 567,
      tool: "just",
      timedOut: false,
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(2);
    expect(compact.success).toBe(false);
    expect(compact.timedOut).toBe(false);
  });

  it("preserves timedOut flag", () => {
    const data: MakeRunResultInternal = {
      target: "build",
      success: false,
      exitCode: 124,
      duration: 300000,
      tool: "make",
      timedOut: true,
    };

    const compact = compactRunMap(data);

    expect(compact.timedOut).toBe(true);
    expect(compact.success).toBe(false);
  });
});

describe("formatRunCompact", () => {
  it("formats successful run", () => {
    expect(
      formatRunCompact({
        exitCode: 0,
        success: true,
        timedOut: false,
      }),
    ).toBe("make/just: success.");
  });

  it("formats failed run with exit code", () => {
    expect(
      formatRunCompact({
        exitCode: 2,
        success: false,
        timedOut: false,
      }),
    ).toBe("make/just: exit code 2.");
  });

  it("formats timed out run", () => {
    const output = formatRunCompact({
      exitCode: 124,
      success: false,
      timedOut: true,
    });
    expect(output).toContain("TIMED OUT");
  });
});

describe("compactListMap", () => {
  it("keeps patternRules; drops targets, total, tool", () => {
    const data: MakeListResultInternal = {
      targets: [
        { name: "build", description: "Build it" },
        { name: "test", description: "Test it" },
        { name: "clean" },
      ],
      total: 3,
      tool: "just",
    };

    const compact = compactListMap(data);

    expect(compact).not.toHaveProperty("targets");
    expect(compact).not.toHaveProperty("total");
    expect(compact).not.toHaveProperty("tool");
  });

  it("preserves patternRules when present", () => {
    const data: MakeListResultInternal = {
      targets: [],
      patternRules: [{ pattern: "%.o", dependencies: ["%.c"] }],
      total: 0,
      tool: "make",
    };

    const compact = compactListMap(data);

    expect(compact.patternRules).toHaveLength(1);
  });
});

describe("formatListCompact", () => {
  it("formats target listing", () => {
    const output = formatListCompact({ patternRules: [] });
    expect(output).toContain("make/just");
    expect(output).toContain("0 pattern rules");
  });

  it("formats with pattern rules", () => {
    const output = formatListCompact({
      patternRules: [{ pattern: "%.o" }, { pattern: "%.so" }],
    });
    expect(output).toContain("2 pattern rules");
  });
});
