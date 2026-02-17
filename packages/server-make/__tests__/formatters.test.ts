import { describe, it, expect } from "vitest";
import {
  formatRun,
  formatList,
  compactRunMap,
  formatRunCompact,
  compactListMap,
  formatListCompact,
} from "../src/lib/formatters.js";
import type { MakeRunResult, MakeListResult } from "../src/schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: MakeRunResult = {
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
    const data: MakeRunResult = {
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
    const data: MakeRunResult = {
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
    const data: MakeRunResult = {
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
    const data: MakeRunResult = {
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
    const data: MakeRunResult = {
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
    const data: MakeRunResult = {
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
    const data: MakeListResult = {
      targets: [],
      total: 0,
      tool: "make",
    };
    expect(formatList(data)).toBe("make: no targets found.");
  });

  it("formats just target list with descriptions", () => {
    const data: MakeListResult = {
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
    const data: MakeListResult = {
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
    const data: MakeListResult = {
      targets: [{ name: "build", isPhony: true }, { name: "main.o" }],
      total: 2,
      tool: "make",
    };
    const output = formatList(data);
    expect(output).toContain("build [phony]");
    expect(output).not.toContain("main.o [phony]");
  });

  it("formats targets with dependencies", () => {
    const data: MakeListResult = {
      targets: [{ name: "test", dependencies: ["build", "fixtures"] }, { name: "build" }],
      total: 2,
      tool: "make",
    };
    const output = formatList(data);
    expect(output).toContain("test -> build, fixtures");
    expect(output).not.toContain("build ->");
  });

  it("formats targets with phony, dependencies, and descriptions", () => {
    const data: MakeListResult = {
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
    const data: MakeListResult = {
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
  it("keeps target, exitCode, success, duration, tool, timedOut — drops stdout/stderr", () => {
    const data: MakeRunResult = {
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

    expect(compact.target).toBe("build");
    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.duration).toBe(1234);
    expect(compact.tool).toBe("make");
    expect(compact.timedOut).toBe(false);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves non-zero exit code", () => {
    const data: MakeRunResult = {
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
    expect(compact.tool).toBe("just");
    expect(compact.timedOut).toBe(false);
  });

  it("preserves timedOut flag", () => {
    const data: MakeRunResult = {
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
        target: "build",
        exitCode: 0,
        success: true,
        duration: 100,
        tool: "make",
        timedOut: false,
      }),
    ).toBe("make build: success (100ms).");
  });

  it("formats failed run with exit code", () => {
    expect(
      formatRunCompact({
        target: "test",
        exitCode: 2,
        success: false,
        duration: 500,
        tool: "just",
        timedOut: false,
      }),
    ).toBe("just test: exit code 2 (500ms).");
  });

  it("formats failed run with error type", () => {
    expect(
      formatRunCompact({
        target: "missing",
        exitCode: 2,
        success: false,
        duration: 10,
        tool: "make",
        timedOut: false,
        errorType: "missing-target",
      }),
    ).toBe("make missing: exit code 2 (10ms) [missing-target].");
  });

  it("formats timed out run", () => {
    const output = formatRunCompact({
      target: "build",
      exitCode: 124,
      success: false,
      duration: 300000,
      tool: "make",
      timedOut: true,
    });
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("300000ms");
  });
});

describe("compactListMap", () => {
  it("keeps total and tool, drops target details", () => {
    const data: MakeListResult = {
      targets: [
        { name: "build", description: "Build it" },
        { name: "test", description: "Test it" },
        { name: "clean" },
      ],
      total: 3,
      tool: "just",
    };

    const compact = compactListMap(data);

    expect(compact.total).toBe(3);
    expect(compact.tool).toBe("just");
    expect(compact.patternRuleCount).toBe(0);
    expect(compact).not.toHaveProperty("targets");
  });

  it("preserves zero total for empty list", () => {
    const data: MakeListResult = {
      targets: [],
      total: 0,
      tool: "make",
    };

    const compact = compactListMap(data);

    expect(compact.total).toBe(0);
    expect(compact.tool).toBe("make");
    expect(compact.patternRuleCount).toBe(0);
  });
});

describe("formatListCompact", () => {
  it("formats no targets found", () => {
    expect(formatListCompact({ total: 0, patternRuleCount: 0, tool: "make" })).toBe(
      "make: no targets found.",
    );
  });

  it("formats target count", () => {
    expect(formatListCompact({ total: 5, patternRuleCount: 2, tool: "just" })).toBe(
      "just: 5 targets (2 pattern rules)",
    );
  });
});
