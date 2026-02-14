import { describe, it, expect } from "vitest";
import { parsePyenvOutput } from "../src/lib/parsers.js";
import { formatPyenv, compactPyenvMap, formatPyenvCompact } from "../src/lib/formatters.js";
import type { PyenvResult } from "../src/schemas/index.js";

// ── Parser tests ─────────────────────────────────────────────────────

describe("parsePyenvOutput", () => {
  describe("versions action", () => {
    it("parses list of installed versions with --bare output", () => {
      const stdout = "2.7.18\n3.10.13\n3.11.7\n3.12.0\n";
      const result = parsePyenvOutput(stdout, "", 0, "versions");

      expect(result.success).toBe(true);
      expect(result.action).toBe("versions");
      expect(result.versions).toEqual(["2.7.18", "3.10.13", "3.11.7", "3.12.0"]);
    });

    it("parses versions with current marker", () => {
      const stdout = "  2.7.18\n* 3.12.0 (set by /home/user/.pyenv/version)\n  3.11.7\n";
      const result = parsePyenvOutput(stdout, "", 0, "versions");

      expect(result.success).toBe(true);
      expect(result.versions).toContain("3.12.0");
      expect(result.versions).toContain("2.7.18");
      expect(result.versions).toContain("3.11.7");
      expect(result.current).toBe("3.12.0");
    });

    it("handles empty versions list", () => {
      const result = parsePyenvOutput("", "", 0, "versions");

      expect(result.success).toBe(true);
      expect(result.versions).toEqual([]);
      expect(result.current).toBeUndefined();
    });

    it("handles failure", () => {
      const result = parsePyenvOutput("", "pyenv: command not found", 127, "versions");

      expect(result.success).toBe(false);
      expect(result.error).toContain("pyenv: command not found");
    });
  });

  describe("version action", () => {
    it("parses current version", () => {
      const stdout = "3.12.0 (set by /home/user/.pyenv/version)\n";
      const result = parsePyenvOutput(stdout, "", 0, "version");

      expect(result.success).toBe(true);
      expect(result.action).toBe("version");
      expect(result.current).toBe("3.12.0");
    });

    it("parses system version", () => {
      const stdout = "system\n";
      const result = parsePyenvOutput(stdout, "", 0, "version");

      expect(result.success).toBe(true);
      expect(result.current).toBe("system");
    });

    it("handles empty output", () => {
      const result = parsePyenvOutput("", "", 0, "version");

      expect(result.success).toBe(true);
      expect(result.current).toBeUndefined();
    });
  });

  describe("install action", () => {
    it("parses successful install", () => {
      const stderr =
        "Installing Python-3.12.0...\nInstalled Python-3.12.0 to /home/user/.pyenv/versions/3.12.0\n";
      const result = parsePyenvOutput("", stderr, 0, "install");

      expect(result.success).toBe(true);
      expect(result.action).toBe("install");
      expect(result.installed).toBe("3.12.0");
    });

    it("handles install failure", () => {
      const stderr = "python-build: definition not found: 99.99.99\n";
      const result = parsePyenvOutput("", stderr, 1, "install");

      expect(result.success).toBe(false);
      expect(result.error).toContain("definition not found");
    });

    it("handles install with no version extracted", () => {
      const result = parsePyenvOutput("", "some output", 0, "install");

      expect(result.success).toBe(true);
      expect(result.installed).toBeUndefined();
    });
  });

  describe("local action", () => {
    it("parses local version query", () => {
      const stdout = "3.11.7\n";
      const result = parsePyenvOutput(stdout, "", 0, "local");

      expect(result.success).toBe(true);
      expect(result.action).toBe("local");
      expect(result.localVersion).toBe("3.11.7");
    });

    it("parses local version set (empty stdout)", () => {
      const result = parsePyenvOutput("", "", 0, "local");

      expect(result.success).toBe(true);
      expect(result.localVersion).toBeUndefined();
    });

    it("handles failure when no local version set", () => {
      const stderr = "pyenv: no local version configured for this directory\n";
      const result = parsePyenvOutput("", stderr, 1, "local");

      expect(result.success).toBe(false);
      expect(result.error).toContain("no local version configured");
    });
  });

  describe("global action", () => {
    it("parses global version query", () => {
      const stdout = "3.12.0\n";
      const result = parsePyenvOutput(stdout, "", 0, "global");

      expect(result.success).toBe(true);
      expect(result.action).toBe("global");
      expect(result.globalVersion).toBe("3.12.0");
    });

    it("parses global version set (empty stdout)", () => {
      const result = parsePyenvOutput("", "", 0, "global");

      expect(result.success).toBe(true);
      expect(result.globalVersion).toBeUndefined();
    });
  });
});

// ── Formatter tests ──────────────────────────────────────────────────

describe("formatPyenv", () => {
  it("formats error result", () => {
    const data: PyenvResult = {
      action: "versions",
      success: false,
      error: "pyenv: command not found",
    };
    expect(formatPyenv(data)).toBe("pyenv versions failed: pyenv: command not found");
  });

  it("formats empty versions list", () => {
    const data: PyenvResult = {
      action: "versions",
      success: true,
      versions: [],
    };
    expect(formatPyenv(data)).toBe("pyenv: no versions installed.");
  });

  it("formats versions list with current marker", () => {
    const data: PyenvResult = {
      action: "versions",
      success: true,
      versions: ["3.10.13", "3.11.7", "3.12.0"],
      current: "3.12.0",
    };
    const output = formatPyenv(data);
    expect(output).toContain("3 versions installed:");
    expect(output).toContain("  3.10.13");
    expect(output).toContain("  3.11.7");
    expect(output).toContain("  3.12.0 *");
  });

  it("formats current version", () => {
    const data: PyenvResult = {
      action: "version",
      success: true,
      current: "3.12.0",
    };
    expect(formatPyenv(data)).toBe("pyenv: current version is 3.12.0");
  });

  it("formats no version set", () => {
    const data: PyenvResult = {
      action: "version",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: no version set.");
  });

  it("formats successful install", () => {
    const data: PyenvResult = {
      action: "install",
      success: true,
      installed: "3.12.0",
    };
    expect(formatPyenv(data)).toBe("pyenv: installed Python 3.12.0");
  });

  it("formats install without extracted version", () => {
    const data: PyenvResult = {
      action: "install",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: installation completed.");
  });

  it("formats local version set", () => {
    const data: PyenvResult = {
      action: "local",
      success: true,
      localVersion: "3.11.7",
    };
    expect(formatPyenv(data)).toBe("pyenv: local version set to 3.11.7");
  });

  it("formats local version set without version", () => {
    const data: PyenvResult = {
      action: "local",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: local version set.");
  });

  it("formats global version set", () => {
    const data: PyenvResult = {
      action: "global",
      success: true,
      globalVersion: "3.12.0",
    };
    expect(formatPyenv(data)).toBe("pyenv: global version set to 3.12.0");
  });

  it("formats global version set without version", () => {
    const data: PyenvResult = {
      action: "global",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: global version set.");
  });
});

// ── Compact formatter tests ──────────────────────────────────────────

describe("compactPyenvMap", () => {
  it("maps full result to compact form", () => {
    const data: PyenvResult = {
      action: "versions",
      success: true,
      versions: ["3.10.13", "3.11.7", "3.12.0"],
      current: "3.12.0",
    };
    const compact = compactPyenvMap(data);

    expect(compact.action).toBe("versions");
    expect(compact.success).toBe(true);
    // Compact drops versions/current/etc.
    expect((compact as Record<string, unknown>).versions).toBeUndefined();
  });
});

describe("formatPyenvCompact", () => {
  it("formats success", () => {
    expect(formatPyenvCompact({ action: "versions", success: true })).toBe(
      "pyenv versions: success.",
    );
  });

  it("formats failure", () => {
    expect(formatPyenvCompact({ action: "install", success: false })).toBe("pyenv install failed.");
  });
});
