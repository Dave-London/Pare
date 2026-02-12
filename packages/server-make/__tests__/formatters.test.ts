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
    };
    const output = formatRun(data);
    expect(output).toContain("make test: exit code 2 (567ms).");
    expect(output).toContain("make: *** [test] Error 2");
  });

  it("formats just run", () => {
    const data: MakeRunResult = {
      target: "deploy",
      success: true,
      exitCode: 0,
      stdout: "Deployed!",
      duration: 5000,
      tool: "just",
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
    };
    const output = formatRun(data);
    expect(output).toBe("make clean: success (50ms).");
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
    expect(output).toContain("  build # Build the project");
    expect(output).toContain("  test # Run tests");
    expect(output).toContain("  clean");
    // clean should NOT have a # suffix
    expect(output).not.toContain("clean #");
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
});

// ── Compact mappers and formatters ───────────────────────────────────

describe("compactRunMap", () => {
  it("keeps target, exitCode, success, duration, tool — drops stdout/stderr", () => {
    const data: MakeRunResult = {
      target: "build",
      success: true,
      exitCode: 0,
      stdout: "lots of build output...",
      stderr: "some warnings",
      duration: 1234,
      tool: "make",
    };

    const compact = compactRunMap(data);

    expect(compact.target).toBe("build");
    expect(compact.success).toBe(true);
    expect(compact.exitCode).toBe(0);
    expect(compact.duration).toBe(1234);
    expect(compact.tool).toBe("make");
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
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(2);
    expect(compact.success).toBe(false);
    expect(compact.tool).toBe("just");
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
      }),
    ).toBe("just test: exit code 2 (500ms).");
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
  });
});

describe("formatListCompact", () => {
  it("formats no targets found", () => {
    expect(formatListCompact({ total: 0, tool: "make" })).toBe("make: no targets found.");
  });

  it("formats target count", () => {
    expect(formatListCompact({ total: 5, tool: "just" })).toBe("just: 5 targets");
  });
});
