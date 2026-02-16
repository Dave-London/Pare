import { describe, it, expect } from "vitest";
import { parseNvmOutput } from "../src/lib/parsers.js";
import { formatNvm } from "../src/lib/formatters.js";
import type { NvmResult } from "../src/schemas/index.js";

describe("parseNvmOutput", () => {
  it("parses nvm-windows list output", () => {
    const listOutput = [
      "  * 20.11.1 (Currently using 64-bit executable)",
      "    18.19.0",
      "    16.20.2",
    ].join("\n");

    const result = parseNvmOutput(listOutput, "");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual(["v20.11.1", "v18.19.0", "v16.20.2"]);
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
    expect(result.versions).toEqual(["v20.11.1", "v18.19.0", "v16.20.2"]);
    expect(result.default).toBe("v20.11.1");
  });

  it("parses current from fallback when not in list", () => {
    const listOutput = ["    18.19.0", "    16.20.2"].join("\n");

    const result = parseNvmOutput(listOutput, "v20.11.1");

    expect(result.current).toBe("v20.11.1");
    expect(result.versions).toEqual(["v18.19.0", "v16.20.2"]);
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
    expect(result.versions).toEqual(["v20.11.1"]);
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
      versions: ["v20.11.1", "v18.19.0", "v16.20.2"],
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.1");
    expect(output).toContain("Installed (3):");
    expect(output).toContain("  v20.11.1 (current)");
    expect(output).toContain("  v18.19.0");
    expect(output).toContain("  v16.20.2");
    expect(output).not.toContain("v18.19.0 (current)");
  });

  it("formats nvm result with default version", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: ["v20.11.1"],
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
      versions: ["v20.11.1"],
      required: "20",
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.1");
    expect(output).toContain("Required (.nvmrc): 20");
  });

  it("formats nvm result without required when no .nvmrc", () => {
    const data: NvmResult = {
      current: "v20.11.1",
      versions: ["v20.11.1"],
    };
    const output = formatNvm(data);
    expect(output).toContain("Current: v20.11.1");
    expect(output).not.toContain("Required");
  });
});
