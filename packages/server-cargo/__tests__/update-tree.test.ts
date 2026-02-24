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
  it("parses successful update with structured data", () => {
    const stderr = [
      "    Updating crates.io index",
      "    Updating serde v1.0.200 -> v1.0.217",
      "    Updating tokio v1.40.0 -> v1.41.1",
    ].join("\n");

    const result = parseCargoUpdateOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.totalUpdated).toBe(2);
    expect(result.updated).toEqual([
      { name: "serde", from: "1.0.200", to: "1.0.217" },
      { name: "tokio", from: "1.40.0", to: "1.41.1" },
    ]);
  });

  it("parses successful update with no changes", () => {
    const result = parseCargoUpdateOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.totalUpdated).toBe(0);
    expect(result.updated).toEqual([]);
  });

  it("parses failed update", () => {
    const stderr = "error: no package `nonexistent` found in any registry";
    const result = parseCargoUpdateOutput("", stderr, 101);

    expect(result.success).toBe(false);
    expect(result.totalUpdated).toBe(0);
  });

  it("combines stdout and stderr", () => {
    const result = parseCargoUpdateOutput("stdout line", "stderr line", 0);

    expect(result.success).toBe(true);
  });

  it("parses Locking lines from newer cargo versions", () => {
    const stderr = [
      "    Locking serde v1.0.200 -> v1.0.217",
      "    Locking tokio v1.40.0 -> v1.41.1",
    ].join("\n");

    const result = parseCargoUpdateOutput("", stderr, 0);

    expect(result.totalUpdated).toBe(2);
    expect(result.updated![0]).toEqual({ name: "serde", from: "1.0.200", to: "1.0.217" });
  });

  it("parses Downgrading lines", () => {
    const stderr = "    Downgrading foo v2.0.0 -> v1.5.0";

    const result = parseCargoUpdateOutput("", stderr, 0);

    expect(result.totalUpdated).toBe(1);
    expect(result.updated![0]).toEqual({ name: "foo", from: "2.0.0", to: "1.5.0" });
  });

  it("ignores non-update lines like Adding and Removing", () => {
    const stderr = [
      "    Updating crates.io index",
      "      Adding new-crate v1.0.0",
      "    Removing old-crate v0.5.0",
      "    Updating serde v1.0.200 -> v1.0.217",
    ].join("\n");

    const result = parseCargoUpdateOutput("", stderr, 0);

    expect(result.totalUpdated).toBe(1);
    expect(result.updated![0].name).toBe("serde");
  });
});

// ── parseCargoTreeOutput ─────────────────────────────────────────────

describe("parseCargoTreeOutput", () => {
  it("parses tree output into structured dependencies", () => {
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

    expect(result.packages).toBe(8);

    // Verify structured dependencies
    expect(result.dependencies).toBeDefined();
    expect(result.dependencies!.length).toBe(8);

    // Root package at depth 0
    expect(result.dependencies![0]).toEqual({
      name: "my-app",
      version: "0.1.0",
      depth: 0,
    });

    // Direct dependency at depth 1
    const serde = result.dependencies!.find((d) => d.name === "serde");
    expect(serde).toBeDefined();
    expect(serde!.depth).toBe(1);

    // Transitive dependency at depth 2
    const serdeDerive = result.dependencies!.find((d) => d.name === "serde_derive");
    expect(serdeDerive).toBeDefined();
    expect(serdeDerive!.depth).toBe(2);
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
    // dependencies list includes all entries (including duplicate serde)
    expect(result.dependencies!.length).toBe(4);
  });

  it("handles empty tree output", () => {
    const result = parseCargoTreeOutput("", "", 0);

    expect(result.packages).toBe(0);
    expect(result.dependencies).toEqual([]);
  });

  it("handles single root package", () => {
    const stdout = "my-app v0.1.0 (/home/user/project)";
    const result = parseCargoTreeOutput(stdout, "", 0);

    expect(result.packages).toBe(1);
    expect(result.dependencies).toEqual([{ name: "my-app", version: "0.1.0", depth: 0 }]);
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
    expect(result.dependencies!.length).toBe(4);
    const pinProject = result.dependencies!.find((d) => d.name === "pin-project-lite");
    expect(pinProject).toBeDefined();
    expect(pinProject!.version).toBe("0.2.13");
    expect(pinProject!.depth).toBe(1);
  });

  it("handles error exit code", () => {
    const result = parseCargoTreeOutput("", "error: no Cargo.toml found", 101);

    expect(result.success).toBe(false);
    expect(result.packages).toBe(0);
    expect(result.dependencies).toBeUndefined();
  });
});

// ── formatCargoUpdate ────────────────────────────────────────────────

describe("formatCargoUpdate", () => {
  it("formats successful update with structured packages", () => {
    const data: CargoUpdateResult = {
      success: true,
      updated: [
        { name: "serde", from: "1.0.200", to: "1.0.217" },
        { name: "tokio", from: "1.40.0", to: "1.41.1" },
      ],
      totalUpdated: 2,
    };
    const output = formatCargoUpdate(data);
    expect(output).toContain("cargo update: success (2 package(s) updated)");
    expect(output).toContain("serde v1.0.200 -> v1.0.217");
    expect(output).toContain("tokio v1.40.0 -> v1.41.1");
  });

  it("formats successful update with no changes", () => {
    const data: CargoUpdateResult = {
      success: true,
      updated: [],
      totalUpdated: 0,
    };
    expect(formatCargoUpdate(data)).toBe("cargo update: success.");
  });

  it("formats failed update", () => {
    const data: CargoUpdateResult = {
      success: false,
      updated: [],
      totalUpdated: 0,
    };
    const output = formatCargoUpdate(data);
    expect(output).toContain("cargo update: failed");
  });
});

// ── compactUpdateMap ─────────────────────────────────────────────────

describe("compactUpdateMap", () => {
  it("keeps updated packages and strips raw output", () => {
    const data: CargoUpdateResult = {
      success: true,
      updated: [{ name: "serde", from: "1.0.200", to: "1.0.217" }],
      totalUpdated: 1,
    };
    const compact = compactUpdateMap(data);
    expect(compact.success).toBe(true);
    expect(compact.totalUpdated).toBe(1);
    expect(compact.updated).toEqual([{ name: "serde", from: "1.0.200", to: "1.0.217" }]);
    expect(compact).not.toHaveProperty("output");
  });
});

// ── formatUpdateCompact ──────────────────────────────────────────────

describe("formatUpdateCompact", () => {
  it("formats compact update with no updates", () => {
    expect(formatUpdateCompact({ success: true, updated: [], totalUpdated: 0 })).toBe(
      "cargo update: success",
    );
  });

  it("formats compact update with updates", () => {
    expect(
      formatUpdateCompact({
        success: true,
        updated: [{ name: "serde", from: "1.0.200", to: "1.0.217" }],
        totalUpdated: 1,
      }),
    ).toBe("cargo update: success (1 updated: serde)");
  });

  it("formats compact update failure", () => {
    expect(formatUpdateCompact({ success: false, updated: [], totalUpdated: 0 })).toBe(
      "cargo update: failed",
    );
  });
});

// ── formatCargoTree ──────────────────────────────────────────────────

describe("formatCargoTree", () => {
  it("formats tree with package count", () => {
    const data: CargoTreeResult = {
      success: true,
      dependencies: [
        { name: "my-app", version: "0.1.0", depth: 0 },
        { name: "serde", version: "1.0.217", depth: 1 },
      ],
      packages: 2,
    };
    const output = formatCargoTree(data);
    expect(output).toContain("cargo tree: 2 unique packages");
  });

  it("formats tree with empty tree text", () => {
    const data: CargoTreeResult = { success: true, dependencies: [], packages: 0 };
    expect(formatCargoTree(data)).toBe("cargo tree: 0 unique packages");
  });
});

// ── compactTreeMap ───────────────────────────────────────────────────

describe("compactTreeMap", () => {
  it("strips tree text but keeps dependencies and package count", () => {
    const data: CargoTreeResult = {
      success: true,
      dependencies: [
        { name: "my-app", version: "0.1.0", depth: 0 },
        { name: "serde", version: "1.0.217", depth: 1 },
        { name: "tokio", version: "1.41.1", depth: 1 },
      ],
      packages: 3,
    };
    const compact = compactTreeMap(data);
    expect(compact.success).toBe(true);
    expect(compact.packages).toBe(3);
    expect(compact.dependencies).toHaveLength(3);
  });
});

// ── formatTreeCompact ────────────────────────────────────────────────

describe("formatTreeCompact", () => {
  it("formats compact tree output", () => {
    expect(formatTreeCompact({ success: true, dependencies: [], packages: 5 })).toBe(
      "cargo tree: 5 unique packages",
    );
  });

  it("formats compact tree with zero packages", () => {
    expect(formatTreeCompact({ success: true, dependencies: [], packages: 0 })).toBe(
      "cargo tree: 0 unique packages",
    );
  });
});
