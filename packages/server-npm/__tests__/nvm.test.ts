import { describe, it, expect } from "vitest";
import { parseNvmOutput, parseNvmLsRemoteOutput, parseNvmExecOutput } from "../src/lib/parsers.js";
import { formatNvm, formatNvmLsRemote, formatNvmExec } from "../src/lib/formatters.js";
import type { NvmResult, NvmLsRemote, NvmExec } from "../src/schemas/index.js";

describe("parseNvmOutput", () => {
  it("parses nvm-windows list output", () => {
    const listOutput = [
      "  * 20.11.1 (Currently using 64-bit executable)",
      "    18.19.0",
      "    16.20.2",
    ].join("\n");

    const result = parseNvmOutput(listOutput, "");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual([
      { version: "v20.11.1" },
      { version: "v18.19.0" },
      { version: "v16.20.2" },
    ]);
  });

  it("parses Unix nvm list output", () => {
    const listOutput = [
      "->     v20.11.1",
      "       v18.19.0",
      "       v16.20.2",
      "default -> 20.11.1 (-> v20.11.1)",
      "node -> stable (-> v20.11.1) (default)",
      "stable -> 20.11 (-> v20.11.1) (default)",
      "lts/* -> lts/iron (-> v20.11.1)",
    ].join("\n");

    const result = parseNvmOutput(listOutput, "");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual([
      { version: "v20.11.1" },
      { version: "v18.19.0" },
      { version: "v16.20.2" },
    ]);
    expect(result.default).toBe("v20.11.1");
  });

  it("parses Unix nvm list output with LTS tags", () => {
    const listOutput = [
      "->     v20.11.1",
      "       v18.19.0",
      "       v16.20.2",
      "default -> 20.11.1 (-> v20.11.1)",
      "lts/hydrogen -> v18.19.0",
      "lts/iron -> v20.11.1",
    ].join("\n");

    const result = parseNvmOutput(listOutput, "");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual([
      { version: "v20.11.1", lts: "iron" },
      { version: "v18.19.0", lts: "hydrogen" },
      { version: "v16.20.2" },
    ]);
    expect(result.default).toBe("v20.11.1");
  });

  it("parses current from fallback when not in list", () => {
    const listOutput = ["    18.19.0", "    16.20.2"].join("\n");

    const result = parseNvmOutput(listOutput, "v20.11.1");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual([{ version: "v18.19.0" }, { version: "v16.20.2" }]);
  });

  it("handles empty list output", () => {
    const result = parseNvmOutput("", "");

    expect(result.current).toBe("none");
    expect(result.versions).toEqual([]);
  });

  it("handles 'No installations recognized.' message", () => {
    const result = parseNvmOutput("No installations recognized.", "");

    expect(result.current).toBe("none");
    expect(result.versions).toEqual([]);
  });

  it("normalizes versions without v prefix", () => {
    const listOutput = "  * 20.11.1 (Currently using 64-bit executable)";
    const result = parseNvmOutput(listOutput, "");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual([{ version: "v20.11.1" }]);
  });

  it("handles current-only output", () => {
    const result = parseNvmOutput("", "v22.0.0");

    expect(result.current).toBe("v22.0.0");
    expect(result.versions).toEqual([]);
  });

  it("handles current output without v prefix", () => {
    const result = parseNvmOutput("", "22.0.0");

    expect(result.current).toBe("v22.0.0");
  });
});

describe("formatNvm", () => {
  it("formats nvm result with versions", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: [{ version: "v20.11.1" }, { version: "v18.19.0" }, { version: "v16.20.2" }],
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.1");
    expect(output).toContain("Installed (3):");
    expect(output).toContain("  v20.11.1 (current)");
    expect(output).toContain("  v18.19.0");
    expect(output).toContain("  v16.20.2");
    expect(output).not.toContain("v18.19.0 (current)");
  });

  it("formats nvm result with LTS tags", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: [
        { version: "v20.11.1", lts: "iron" },
        { version: "v18.19.0", lts: "hydrogen" },
        { version: "v16.20.2" },
      ],
    };
    const output = formatNvm(data);
    expect(output).toContain("v20.11.1 [LTS: iron] (current)");
    expect(output).toContain("v18.19.0 [LTS: hydrogen]");
    expect(output).toContain("  v16.20.2");
    expect(output).not.toContain("v16.20.2 [LTS:");
  });

  it("formats nvm result with default version", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: [{ version: "v20.11.1" }],
      default: "v20.11.1",
    };
    const output = formatNvm(data);
    expect(output).toContain("Default: v20.11.1");
  });

  it("formats nvm result with no versions", () => {
    const data: NvmResult = {
      current: "none",
      versions: [],
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: none");
    expect(output).toContain("No versions installed.");
  });
});

describe("formatNvm with required", () => {
  it("formats nvm result with required .nvmrc version", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: [{ version: "v20.11.1" }],
      required: "20",
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.1");
    expect(output).toContain("Required (.nvmrc): 20");
  });

  it("formats nvm result without required when no .nvmrc", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: [{ version: "v20.11.1" }],
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.1");
    expect(output).not.toContain("Required");
  });
});

// ── Gap #178: nvm ls-remote ──────────────────────────────────────────

describe("parseNvmLsRemoteOutput", () => {
  it("parses ls-remote output with LTS tags", () => {
    const output = [
      "        v18.0.0",
      "        v18.1.0",
      "        v18.19.0   (LTS: Hydrogen)",
      "        v20.0.0",
      "        v20.11.1   (Latest LTS: Iron)",
      "        v21.0.0",
      "        v21.7.0",
      "        v22.0.0",
      "        v22.11.0   (LTS: Jod)",
    ].join("\n");

    const result = parseNvmLsRemoteOutput(output, 10);

    expect(result.versions.length).toBeGreaterThan(0);
    const v18_19 = result.versions.find((v) => v.version === "v18.19.0");
    expect(v18_19).toBeDefined();
    expect(v18_19!.lts).toBe("hydrogen");

    const v20_11 = result.versions.find((v) => v.version === "v20.11.1");
    expect(v20_11).toBeDefined();
    expect(v20_11!.lts).toBe("iron");

    const v21_0 = result.versions.find((v) => v.version === "v21.0.0");
    expect(v21_0).toBeDefined();
    expect(v21_0!.lts).toBeUndefined();
  });

  it("filters to last N major versions", () => {
    const output = [
      "        v16.0.0",
      "        v16.20.2   (LTS: Gallium)",
      "        v18.0.0",
      "        v18.19.0   (LTS: Hydrogen)",
      "        v20.0.0",
      "        v20.11.1   (LTS: Iron)",
      "        v22.0.0",
      "        v22.11.0   (LTS: Jod)",
    ].join("\n");

    const result = parseNvmLsRemoteOutput(output, 2);

    // Should only include v22 and v20 (last 2 major versions)
    for (const v of result.versions) {
      const major = parseInt(v.version.replace("v", "").split(".")[0], 10);
      expect(major).toBeGreaterThanOrEqual(20);
    }
    expect(result.versions.some((v) => v.version.startsWith("v22."))).toBe(true);
    expect(result.versions.some((v) => v.version.startsWith("v20."))).toBe(true);
    expect(result.versions.some((v) => v.version.startsWith("v18."))).toBe(false);
  });

  it("handles empty output", () => {
    const result = parseNvmLsRemoteOutput("", 4);
    expect(result.versions).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("formatNvmLsRemote", () => {
  it("formats remote version list", () => {
    const data: NvmLsRemote = {
      versions: [
        { version: "v20.0.0" },
        { version: "v20.11.1", lts: "iron" },
        { version: "v22.0.0" },
      ],
      total: 3,
    };
    const output = formatNvmLsRemote(data);
    expect(output).toContain("3 available versions:");
    expect(output).toContain("  v20.0.0");
    expect(output).toContain("  v20.11.1 (LTS: iron)");
    expect(output).toContain("  v22.0.0");
    expect(output).not.toContain("v22.0.0 (LTS:");
  });

  it("formats empty remote list", () => {
    const data: NvmLsRemote = { versions: [], total: 0 };
    expect(formatNvmLsRemote(data)).toBe("No remote versions found.");
  });
});

// ── Gap #180: nvm exec ───────────────────────────────────────────────

describe("parseNvmExecOutput", () => {
  it("parses successful exec output", () => {
    const result = parseNvmExecOutput("20.11.1", 0, "v20.11.1\n", "");
    expect(result.version).toBe("v20.11.1");
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("v20.11.1");
    expect(result.stderr).toBe("");
  });

  it("parses failed exec output", () => {
    const result = parseNvmExecOutput("20.11.1", 1, "", "Error: module not found\n");
    expect(result.version).toBe("v20.11.1");
    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain("module not found");
  });

  it("normalizes version with v prefix", () => {
    const result = parseNvmExecOutput("v22.0.0", 0, "hello", "");
    expect(result.version).toBe("v22.0.0");
  });
});

describe("formatNvmExec", () => {
  it("formats successful exec", () => {
    const data: NvmExec = {
      version: "v20.11.1",
      exitCode: 0,
      stdout: "hello world",
      stderr: "",
      success: true,
    };
    const output = formatNvmExec(data);
    expect(output).toContain("Command completed successfully using Node.js v20.11.1");
    expect(output).toContain("hello world");
  });

  it("formats failed exec", () => {
    const data: NvmExec = {
      version: "v20.11.1",
      exitCode: 1,
      stdout: "",
      stderr: "Error occurred",
      success: false,
    };
    const output = formatNvmExec(data);
    expect(output).toContain("Command failed (exit code 1) using Node.js v20.11.1");
    expect(output).toContain("Error occurred");
  });
});
