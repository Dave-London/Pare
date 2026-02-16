import { describe, it, expect } from "vitest";
import { parseCargoUpdateOutput, parseCargoTreeOutput } from "../src/lib/parsers.js";
import {
  formatCargoUpdate,
  compactUpdateMap,
  formatUpdateCompact,
  formatCargoTree,
  compactTreeMap,
  formatTreeCompact,
} from "../src/lib/formatters.js";
import type { CargoUpdateResult, CargoTreeResult } from "../src/schemas/index.js";

// ── parseCargoUpdateOutput ───────────────────────────────────────────

describe("parseCargoUpdateOutput", () => {
  it("parses successful update with output", () => {
    const stderr = [
      "    Updating crates.io index",
      "    Updating serde v1.0.200 -> v1.0.217",
      "    Updating tokio v1.40.0 -> v1.41.1",
    ].join("\n");

    const result = parseCargoUpdateOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.output).toContain("Updating serde v1.0.200 -> v1.0.217");
    expect(result.output).toContain("Updating tokio v1.40.0 -> v1.41.1");
  });

  it("parses successful update with no changes", () => {
    const result = parseCargoUpdateOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.output).toBe("");
  });

  it("parses failed update", () => {
    const stderr = "error: no package `nonexistent` found in any registry";
    const result = parseCargoUpdateOutput("", stderr, 101);

    expect(result.success).toBe(false);
    expect(result.output).toContain("no package `nonexistent` found");
  });

  it("combines stdout and stderr", () => {
    const result = parseCargoUpdateOutput("stdout line", "stderr line", 0);

    expect(result.output).toContain("stdout line");
    expect(result.output).toContain("stderr line");
  });
});

// ── parseCargoTreeOutput ─────────────────────────────────────────────

describe("parseCargoTreeOutput", () => {
  it("parses tree output and counts unique packages", () => {
    const stdout = [
      "my-app v0.1.0 (/home/user/project)",
      "├── serde v1.0.217",
      "│   └── serde_derive v1.0.217 (proc-macro)",
      "├── tokio v1.41.1",
      "│   ├── bytes v1.5.0",
      "│   ├── mio v0.8.11",
      "│   └── pin-project-lite v0.2.13",
      "└── anyhow v1.0.89",
    ].join("\n");

    const result = parseCargoTreeOutput(stdout, "", 0);

    expect(result.tree).toContain("my-app v0.1.0");
    expect(result.tree).toContain("serde v1.0.217");
    // my-app, serde, serde_derive, tokio, bytes, mio, pin-project-lite, anyhow = 8
    expect(result.packages).toBe(8);
  });

  it("counts unique package names (no duplicates)", () => {
    const stdout = [
      "my-app v0.1.0 (/home/user/project)",
      "├── serde v1.0.217",
      "│   └── serde_derive v1.0.217 (proc-macro)",
      "└── serde v1.0.217",
    ].join("\n");

    const result = parseCargoTreeOutput(stdout, "", 0);

    // "serde" appears twice but is counted once, plus "my-app" and "serde_derive"
    expect(result.packages).toBe(3);
  });

  it("handles empty tree output", () => {
    const result = parseCargoTreeOutput("", "", 0);

    expect(result.tree).toBe("");
    expect(result.packages).toBe(0);
  });

  it("handles single root package", () => {
    const stdout = "my-app v0.1.0 (/home/user/project)";
    const result = parseCargoTreeOutput(stdout, "", 0);

    expect(result.tree).toBe("my-app v0.1.0 (/home/user/project)");
    expect(result.packages).toBe(1);
  });

  it("handles packages with underscores and hyphens", () => {
    const stdout = [
      "my-app v0.1.0",
      "├── pin-project-lite v0.2.13",
      "├── serde_derive v1.0.217",
      "└── my_crate v0.1.0",
    ].join("\n");

    const result = parseCargoTreeOutput(stdout, "", 0);

    expect(result.packages).toBe(4);
  });
});

// ── formatCargoUpdate ────────────────────────────────────────────────

describe("formatCargoUpdate", () => {
  it("formats successful update with output", () => {
    const data: CargoUpdateResult = {
      success: true,
      output: "Updating serde v1.0.200 -> v1.0.217",
    };
    const output = formatCargoUpdate(data);
    expect(output).toContain("cargo update: success");
    expect(output).toContain("Updating serde v1.0.200 -> v1.0.217");
  });

  it("formats successful update with no output", () => {
    const data: CargoUpdateResult = { success: true, output: "" };
    expect(formatCargoUpdate(data)).toBe("cargo update: success.");
  });

  it("formats failed update", () => {
    const data: CargoUpdateResult = {
      success: false,
      output: "error: no package found",
    };
    const output = formatCargoUpdate(data);
    expect(output).toContain("cargo update: failed");
    expect(output).toContain("error: no package found");
  });
});

// ── compactUpdateMap ─────────────────────────────────────────────────

describe("compactUpdateMap", () => {
  it("strips output text and keeps success flag", () => {
    const data: CargoUpdateResult = {
      success: true,
      output: "Updating serde v1.0.200 -> v1.0.217\nUpdating tokio v1.40.0 -> v1.41.1",
    };
    const compact = compactUpdateMap(data);
    expect(compact).toEqual({ success: true });
    expect(compact).not.toHaveProperty("output");
  });
});

// ── formatUpdateCompact ──────────────────────────────────────────────

describe("formatUpdateCompact", () => {
  it("formats compact update success", () => {
    expect(formatUpdateCompact({ success: true })).toBe("cargo update: success");
  });

  it("formats compact update failure", () => {
    expect(formatUpdateCompact({ success: false })).toBe("cargo update: failed");
  });
});

// ── formatCargoTree ──────────────────────────────────────────────────

describe("formatCargoTree", () => {
  it("formats tree with package count", () => {
    const data: CargoTreeResult = {
      success: true,
      tree: "my-app v0.1.0\n├── serde v1.0.217",
      packages: 2,
    };
    const output = formatCargoTree(data);
    expect(output).toContain("cargo tree: 2 unique packages");
    expect(output).toContain("my-app v0.1.0");
    expect(output).toContain("serde v1.0.217");
  });

  it("formats tree with empty tree text", () => {
    const data: CargoTreeResult = { success: true, tree: "", packages: 0 };
    expect(formatCargoTree(data)).toBe("cargo tree: 0 unique packages");
  });
});

// ── compactTreeMap ───────────────────────────────────────────────────

describe("compactTreeMap", () => {
  it("strips tree text and keeps package count", () => {
    const data: CargoTreeResult = {
      success: true,
      tree: "my-app v0.1.0\n├── serde v1.0.217\n└── tokio v1.41.1",
      packages: 3,
    };
    const compact = compactTreeMap(data);
    expect(compact).toEqual({ success: true, packages: 3 });
    expect(compact).not.toHaveProperty("tree");
  });
});

// ── formatTreeCompact ────────────────────────────────────────────────

describe("formatTreeCompact", () => {
  it("formats compact tree output", () => {
    expect(formatTreeCompact({ success: true, packages: 5 })).toBe("cargo tree: 5 unique packages");
  });

  it("formats compact tree with zero packages", () => {
    expect(formatTreeCompact({ success: true, packages: 0 })).toBe("cargo tree: 0 unique packages");
  });
});
