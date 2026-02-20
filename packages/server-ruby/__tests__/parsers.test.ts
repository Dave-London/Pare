import { describe, it, expect } from "vitest";
import {
  parseRunOutput,
  parseCheckOutput,
  parseGemList,
  parseGemInstallOutput,
  parseGemOutdated,
  parseBundleInstallOutput,
  parseBundleExecOutput,
  parseBundleCheckOutput,
} from "../src/lib/parsers.js";

// ── parseRunOutput ──────────────────────────────────────────────────────

describe("parseRunOutput", () => {
  it("parses successful run", () => {
    const result = parseRunOutput("hello.rb", "Hello, world!\n", "", 0, 234);
    expect(result.file).toBe("hello.rb");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, world!");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(234);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed run", () => {
    const result = parseRunOutput("bad.rb", "", "bad.rb:1: syntax error\n", 1, 50);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("bad.rb:1: syntax error");
    expect(result.timedOut).toBe(false);
  });

  it("parses run with both stdout and stderr", () => {
    const result = parseRunOutput(
      "script.rb",
      "Output data",
      "Warning: deprecated method",
      0,
      1000,
    );
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Output data");
    expect(result.stderr).toBe("Warning: deprecated method");
  });

  it("handles empty stdout and stderr", () => {
    const result = parseRunOutput("empty.rb", "", "", 0, 10);
    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });

  it("parses timed out run", () => {
    const result = parseRunOutput(
      "slow.rb",
      "partial",
      'Command "ruby" timed out after 300000ms.',
      124,
      300000,
      true,
    );
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
    expect(result.stdout).toBe("partial");
  });

  it("timed out run is always unsuccessful even with exit code 0", () => {
    const result = parseRunOutput("task.rb", "", "", 0, 300000, true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

// ── parseCheckOutput ────────────────────────────────────────────────────

describe("parseCheckOutput", () => {
  it("parses valid syntax check", () => {
    const result = parseCheckOutput("good.rb", "Syntax OK\n", "", 0);
    expect(result.file).toBe("good.rb");
    expect(result.valid).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toBe("Syntax OK");
    expect(result.errors).toBeUndefined();
  });

  it("parses invalid syntax check", () => {
    const result = parseCheckOutput(
      "bad.rb",
      "",
      "bad.rb:5: syntax error, unexpected end-of-input\n",
      1,
    );
    expect(result.valid).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toBeUndefined();
    expect(result.errors).toBe("bad.rb:5: syntax error, unexpected end-of-input");
  });

  it("handles empty output", () => {
    const result = parseCheckOutput("empty.rb", "", "", 0);
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
    expect(result.errors).toBeUndefined();
  });
});

// ── parseGemList ────────────────────────────────────────────────────────

describe("parseGemList", () => {
  it("parses gem list with versions", () => {
    const stdout = [
      "",
      "*** LOCAL GEMS ***",
      "",
      "abbrev (default: 0.1.2)",
      "base64 (0.2.0, 0.1.0)",
      "bigdecimal (default: 3.1.8, 3.1.6)",
      "",
    ].join("\n");

    const result = parseGemList(stdout);
    expect(result.total).toBe(3);
    expect(result.gems[0]).toEqual({ name: "abbrev", versions: ["0.1.2"] });
    expect(result.gems[1]).toEqual({ name: "base64", versions: ["0.2.0", "0.1.0"] });
    expect(result.gems[2]).toEqual({ name: "bigdecimal", versions: ["3.1.8", "3.1.6"] });
  });

  it("handles empty output", () => {
    const result = parseGemList("");
    expect(result.total).toBe(0);
    expect(result.gems).toEqual([]);
  });

  it("handles output with only header", () => {
    const result = parseGemList("*** LOCAL GEMS ***\n\n");
    expect(result.total).toBe(0);
    expect(result.gems).toEqual([]);
  });

  it("parses single-version gems", () => {
    const stdout = ["*** LOCAL GEMS ***", "", "rake (13.1.0)", ""].join("\n");
    const result = parseGemList(stdout);
    expect(result.total).toBe(1);
    expect(result.gems[0]).toEqual({ name: "rake", versions: ["13.1.0"] });
  });

  it("strips default: prefix from versions", () => {
    const stdout = ["*** LOCAL GEMS ***", "", "json (default: 2.7.1)", ""].join("\n");
    const result = parseGemList(stdout);
    expect(result.gems[0].versions).toEqual(["2.7.1"]);
  });
});

// ── parseGemInstallOutput ───────────────────────────────────────────────

describe("parseGemInstallOutput", () => {
  it("parses successful install", () => {
    const result = parseGemInstallOutput(
      "rake",
      "Successfully installed rake-13.1.0\n1 gem installed\n",
      "",
      0,
      5000,
    );
    expect(result.gem).toBe("rake");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Successfully installed");
    expect(result.duration).toBe(5000);
  });

  it("parses failed install", () => {
    const result = parseGemInstallOutput(
      "nonexistent",
      "",
      "ERROR: Could not find a valid gem 'nonexistent'\n",
      2,
      1000,
    );
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Could not find");
  });
});

// ── parseGemOutdated ────────────────────────────────────────────────────

describe("parseGemOutdated", () => {
  it("parses outdated gems", () => {
    const stdout = ["bigdecimal (3.1.6 < 3.1.8)", "json (2.7.1 < 2.8.1)", ""].join("\n");

    const result = parseGemOutdated(stdout);
    expect(result.total).toBe(2);
    expect(result.gems[0]).toEqual({ name: "bigdecimal", current: "3.1.6", latest: "3.1.8" });
    expect(result.gems[1]).toEqual({ name: "json", current: "2.7.1", latest: "2.8.1" });
  });

  it("handles no outdated gems", () => {
    const result = parseGemOutdated("");
    expect(result.total).toBe(0);
    expect(result.gems).toEqual([]);
  });

  it("parses single outdated gem", () => {
    const stdout = "rake (13.0.6 < 13.1.0)\n";
    const result = parseGemOutdated(stdout);
    expect(result.total).toBe(1);
    expect(result.gems[0]).toEqual({ name: "rake", current: "13.0.6", latest: "13.1.0" });
  });
});

// ── parseBundleInstallOutput ────────────────────────────────────────────

describe("parseBundleInstallOutput", () => {
  it("parses successful install", () => {
    const result = parseBundleInstallOutput(
      "Bundle complete! 5 Gemfile dependencies, 20 gems now installed.\n",
      "",
      0,
      8000,
    );
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Bundle complete!");
    expect(result.duration).toBe(8000);
  });

  it("parses failed install", () => {
    const result = parseBundleInstallOutput("", "Could not locate Gemfile\n", 10, 200);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(10);
    expect(result.stderr).toContain("Could not locate Gemfile");
  });
});

// ── parseBundleExecOutput ───────────────────────────────────────────────

describe("parseBundleExecOutput", () => {
  it("parses successful exec", () => {
    const result = parseBundleExecOutput("rake", "tasks done\n", "", 0, 1500);
    expect(result.command).toBe("rake");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("tasks done");
    expect(result.timedOut).toBe(false);
  });

  it("parses failed exec", () => {
    const result = parseBundleExecOutput("rspec", "", "0 examples, 3 failures\n", 1, 5000);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("0 examples, 3 failures");
  });

  it("parses timed out exec", () => {
    const result = parseBundleExecOutput(
      "rake",
      "",
      'Command "bundle" timed out.',
      124,
      300000,
      true,
    );
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("handles empty output", () => {
    const result = parseBundleExecOutput("rake", "", "", 0, 100);
    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });
});

// ── parseBundleCheckOutput ──────────────────────────────────────────────

describe("parseBundleCheckOutput", () => {
  it("parses satisfied check", () => {
    const result = parseBundleCheckOutput("The Gemfile's dependencies are satisfied\n", "", 0);
    expect(result.satisfied).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain("dependencies are satisfied");
    expect(result.errors).toBeUndefined();
  });

  it("parses unsatisfied check", () => {
    const result = parseBundleCheckOutput(
      "",
      "The following gems are missing\n * rake (>= 13.0)\nInstall missing gems with `bundle install`\n",
      1,
    );
    expect(result.satisfied).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.errors).toContain("missing");
  });
});
