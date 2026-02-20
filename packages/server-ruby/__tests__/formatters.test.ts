import { describe, it, expect } from "vitest";
import {
  formatRun,
  formatCheck,
  formatGemList,
  formatGemInstall,
  formatGemOutdated,
  formatBundleInstall,
  formatBundleExec,
  formatBundleCheck,
  compactRunMap,
  formatRunCompact,
  compactCheckMap,
  formatCheckCompact,
  compactGemListMap,
  formatGemListCompact,
  compactGemInstallMap,
  formatGemInstallCompact,
  compactGemOutdatedMap,
  formatGemOutdatedCompact,
  compactBundleInstallMap,
  formatBundleInstallCompact,
  compactBundleExecMap,
  formatBundleExecCompact,
  compactBundleCheckMap,
  formatBundleCheckCompact,
} from "../src/lib/formatters.js";
import type {
  RubyRunResult,
  RubyCheckResult,
  GemListResult,
  GemInstallResult,
  GemOutdatedResult,
  BundleInstallResult,
  BundleExecResult,
  BundleCheckResult,
} from "../src/schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

describe("formatRun", () => {
  it("formats successful run", () => {
    const data: RubyRunResult = {
      file: "hello.rb",
      success: true,
      exitCode: 0,
      stdout: "Hello!",
      duration: 234,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("ruby hello.rb: success (234ms).");
    expect(output).toContain("Hello!");
  });

  it("formats failed run", () => {
    const data: RubyRunResult = {
      file: "bad.rb",
      success: false,
      exitCode: 1,
      stderr: "SyntaxError",
      duration: 50,
      timedOut: false,
    };
    const output = formatRun(data);
    expect(output).toContain("ruby bad.rb: exit code 1 (50ms).");
    expect(output).toContain("SyntaxError");
  });

  it("formats timed out run", () => {
    const data: RubyRunResult = {
      file: "slow.rb",
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    const output = formatRun(data);
    expect(output).toContain("TIMED OUT");
    expect(output).toContain("300000ms");
  });

  it("formats run with no output", () => {
    const data: RubyRunResult = {
      file: "noop.rb",
      success: true,
      exitCode: 0,
      duration: 10,
      timedOut: false,
    };
    expect(formatRun(data)).toBe("ruby noop.rb: success (10ms).");
  });
});

describe("formatCheck", () => {
  it("formats valid check", () => {
    const data: RubyCheckResult = {
      file: "good.rb",
      valid: true,
      exitCode: 0,
      message: "Syntax OK",
    };
    expect(formatCheck(data)).toBe("ruby -c good.rb: Syntax OK");
  });

  it("formats invalid check", () => {
    const data: RubyCheckResult = {
      file: "bad.rb",
      valid: false,
      exitCode: 1,
      errors: "bad.rb:5: syntax error",
    };
    const output = formatCheck(data);
    expect(output).toContain("ruby -c bad.rb: syntax error (exit code 1).");
    expect(output).toContain("bad.rb:5: syntax error");
  });

  it("formats valid check with no message", () => {
    const data: RubyCheckResult = {
      file: "empty.rb",
      valid: true,
      exitCode: 0,
    };
    expect(formatCheck(data)).toBe("ruby -c empty.rb: Syntax OK");
  });
});

describe("formatGemList", () => {
  it("formats empty list", () => {
    const data: GemListResult = { gems: [], total: 0 };
    expect(formatGemList(data)).toBe("gem list: no gems found.");
  });

  it("formats gem list", () => {
    const data: GemListResult = {
      gems: [
        { name: "rake", versions: ["13.1.0"] },
        { name: "json", versions: ["2.8.1", "2.7.1"] },
      ],
      total: 2,
    };
    const output = formatGemList(data);
    expect(output).toContain("gem list: 2 gems");
    expect(output).toContain("rake (13.1.0)");
    expect(output).toContain("json (2.8.1, 2.7.1)");
  });
});

describe("formatGemInstall", () => {
  it("formats successful install", () => {
    const data: GemInstallResult = {
      gem: "rake",
      success: true,
      exitCode: 0,
      stdout: "1 gem installed",
      duration: 5000,
    };
    const output = formatGemInstall(data);
    expect(output).toContain("gem install rake: success (5000ms).");
    expect(output).toContain("1 gem installed");
  });

  it("formats failed install", () => {
    const data: GemInstallResult = {
      gem: "bad",
      success: false,
      exitCode: 2,
      stderr: "ERROR",
      duration: 1000,
    };
    const output = formatGemInstall(data);
    expect(output).toContain("gem install bad: exit code 2 (1000ms).");
    expect(output).toContain("ERROR");
  });
});

describe("formatGemOutdated", () => {
  it("formats no outdated gems", () => {
    const data: GemOutdatedResult = { gems: [], total: 0 };
    expect(formatGemOutdated(data)).toBe("gem outdated: all gems are up to date.");
  });

  it("formats outdated gems", () => {
    const data: GemOutdatedResult = {
      gems: [{ name: "rake", current: "13.0.6", latest: "13.1.0" }],
      total: 1,
    };
    const output = formatGemOutdated(data);
    expect(output).toContain("gem outdated: 1 outdated gems");
    expect(output).toContain("rake (13.0.6 -> 13.1.0)");
  });
});

describe("formatBundleInstall", () => {
  it("formats successful install", () => {
    const data: BundleInstallResult = {
      success: true,
      exitCode: 0,
      stdout: "Bundle complete!",
      duration: 8000,
    };
    const output = formatBundleInstall(data);
    expect(output).toContain("bundle install: success (8000ms).");
    expect(output).toContain("Bundle complete!");
  });

  it("formats failed install", () => {
    const data: BundleInstallResult = {
      success: false,
      exitCode: 10,
      stderr: "Could not locate Gemfile",
      duration: 200,
    };
    const output = formatBundleInstall(data);
    expect(output).toContain("bundle install: exit code 10 (200ms).");
  });
});

describe("formatBundleExec", () => {
  it("formats successful exec", () => {
    const data: BundleExecResult = {
      command: "rake",
      success: true,
      exitCode: 0,
      stdout: "tasks done",
      duration: 1500,
      timedOut: false,
    };
    const output = formatBundleExec(data);
    expect(output).toContain("bundle exec rake: success (1500ms).");
    expect(output).toContain("tasks done");
  });

  it("formats timed out exec", () => {
    const data: BundleExecResult = {
      command: "rake",
      success: false,
      exitCode: 124,
      duration: 300000,
      timedOut: true,
    };
    const output = formatBundleExec(data);
    expect(output).toContain("TIMED OUT");
  });
});

describe("formatBundleCheck", () => {
  it("formats satisfied check", () => {
    const data: BundleCheckResult = {
      satisfied: true,
      exitCode: 0,
      message: "The Gemfile's dependencies are satisfied",
    };
    expect(formatBundleCheck(data)).toContain("dependencies are satisfied");
  });

  it("formats unsatisfied check", () => {
    const data: BundleCheckResult = {
      satisfied: false,
      exitCode: 1,
      errors: "missing gems",
    };
    const output = formatBundleCheck(data);
    expect(output).toContain("dependencies not satisfied");
    expect(output).toContain("missing gems");
  });
});

// ── Compact mappers and formatters ───────────────────────────────────

describe("compactRunMap", () => {
  it("drops stdout/stderr", () => {
    const data: RubyRunResult = {
      file: "hello.rb",
      success: true,
      exitCode: 0,
      stdout: "lots of output",
      stderr: "warnings",
      duration: 234,
      timedOut: false,
    };
    const compact = compactRunMap(data);
    expect(compact.file).toBe("hello.rb");
    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });
});

describe("formatRunCompact", () => {
  it("formats successful run", () => {
    expect(
      formatRunCompact({
        file: "hello.rb",
        exitCode: 0,
        success: true,
        duration: 100,
        timedOut: false,
      }),
    ).toBe("ruby hello.rb: success (100ms).");
  });

  it("formats timed out run", () => {
    const output = formatRunCompact({
      file: "slow.rb",
      exitCode: 124,
      success: false,
      duration: 300000,
      timedOut: true,
    });
    expect(output).toContain("TIMED OUT");
  });
});

describe("compactCheckMap", () => {
  it("drops message/errors", () => {
    const data: RubyCheckResult = {
      file: "good.rb",
      valid: true,
      exitCode: 0,
      message: "Syntax OK",
      errors: undefined,
    };
    const compact = compactCheckMap(data);
    expect(compact.file).toBe("good.rb");
    expect(compact.valid).toBe(true);
    expect(compact).not.toHaveProperty("message");
    expect(compact).not.toHaveProperty("errors");
  });
});

describe("formatCheckCompact", () => {
  it("formats valid", () => {
    expect(formatCheckCompact({ file: "good.rb", valid: true, exitCode: 0 })).toBe(
      "ruby -c good.rb: Syntax OK",
    );
  });

  it("formats invalid", () => {
    expect(formatCheckCompact({ file: "bad.rb", valid: false, exitCode: 1 })).toBe(
      "ruby -c bad.rb: syntax error (exit code 1).",
    );
  });
});

describe("compactGemListMap", () => {
  it("keeps total only", () => {
    const data: GemListResult = {
      gems: [{ name: "rake", versions: ["13.1.0"] }],
      total: 1,
    };
    const compact = compactGemListMap(data);
    expect(compact.total).toBe(1);
    expect(compact).not.toHaveProperty("gems");
  });
});

describe("formatGemListCompact", () => {
  it("formats zero", () => {
    expect(formatGemListCompact({ total: 0 })).toBe("gem list: no gems found.");
  });

  it("formats count", () => {
    expect(formatGemListCompact({ total: 5 })).toBe("gem list: 5 gems");
  });
});

describe("compactGemInstallMap", () => {
  it("drops stdout/stderr", () => {
    const data: GemInstallResult = {
      gem: "rake",
      success: true,
      exitCode: 0,
      stdout: "installed",
      duration: 5000,
    };
    const compact = compactGemInstallMap(data);
    expect(compact.gem).toBe("rake");
    expect(compact).not.toHaveProperty("stdout");
  });
});

describe("formatGemInstallCompact", () => {
  it("formats success", () => {
    expect(
      formatGemInstallCompact({ gem: "rake", success: true, exitCode: 0, duration: 5000 }),
    ).toBe("gem install rake: success (5000ms).");
  });
});

describe("compactGemOutdatedMap", () => {
  it("keeps total only", () => {
    const data: GemOutdatedResult = {
      gems: [{ name: "rake", current: "13.0.6", latest: "13.1.0" }],
      total: 1,
    };
    const compact = compactGemOutdatedMap(data);
    expect(compact.total).toBe(1);
    expect(compact).not.toHaveProperty("gems");
  });
});

describe("formatGemOutdatedCompact", () => {
  it("formats zero", () => {
    expect(formatGemOutdatedCompact({ total: 0 })).toBe("gem outdated: all gems are up to date.");
  });

  it("formats count", () => {
    expect(formatGemOutdatedCompact({ total: 3 })).toBe("gem outdated: 3 outdated gems");
  });
});

describe("compactBundleInstallMap", () => {
  it("drops stdout/stderr", () => {
    const data: BundleInstallResult = {
      success: true,
      exitCode: 0,
      stdout: "Bundle complete!",
      duration: 8000,
    };
    const compact = compactBundleInstallMap(data);
    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("stdout");
  });
});

describe("formatBundleInstallCompact", () => {
  it("formats success", () => {
    expect(formatBundleInstallCompact({ success: true, exitCode: 0, duration: 8000 })).toBe(
      "bundle install: success (8000ms).",
    );
  });
});

describe("compactBundleExecMap", () => {
  it("drops stdout/stderr", () => {
    const data: BundleExecResult = {
      command: "rake",
      success: true,
      exitCode: 0,
      stdout: "output",
      duration: 1500,
      timedOut: false,
    };
    const compact = compactBundleExecMap(data);
    expect(compact.command).toBe("rake");
    expect(compact).not.toHaveProperty("stdout");
  });
});

describe("formatBundleExecCompact", () => {
  it("formats success", () => {
    expect(
      formatBundleExecCompact({
        command: "rake",
        success: true,
        exitCode: 0,
        duration: 1500,
        timedOut: false,
      }),
    ).toBe("bundle exec rake: success (1500ms).");
  });
});

describe("compactBundleCheckMap", () => {
  it("drops message/errors", () => {
    const data: BundleCheckResult = {
      satisfied: true,
      exitCode: 0,
      message: "The Gemfile's dependencies are satisfied",
    };
    const compact = compactBundleCheckMap(data);
    expect(compact.satisfied).toBe(true);
    expect(compact).not.toHaveProperty("message");
  });
});

describe("formatBundleCheckCompact", () => {
  it("formats satisfied", () => {
    expect(formatBundleCheckCompact({ satisfied: true, exitCode: 0 })).toBe(
      "bundle check: dependencies satisfied",
    );
  });

  it("formats unsatisfied", () => {
    expect(formatBundleCheckCompact({ satisfied: false, exitCode: 1 })).toBe(
      "bundle check: dependencies not satisfied (exit code 1).",
    );
  });
});
