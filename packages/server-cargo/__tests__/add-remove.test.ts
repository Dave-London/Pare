import { describe, it, expect } from "vitest";
import { parseCargoAddOutput, parseCargoRemoveOutput } from "../src/lib/parsers.js";
import { formatCargoAdd, formatCargoRemove } from "../src/lib/formatters.js";
import { assertNoFlagInjection } from "@paretools/shared";

// ---------------------------------------------------------------------------
// cargo add
// ---------------------------------------------------------------------------

describe("parseCargoAddOutput", () => {
  it("parses single package added", () => {
    const stderr = "      Adding serde v1.0.217 to dependencies";
    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.added).toEqual([{ name: "serde", version: "1.0.217" }]);
  });

  it("parses multiple packages added", () => {
    const stderr = [
      "      Adding serde v1.0.217 to dependencies",
      "      Adding tokio v1.41.1 to dependencies",
      "      Adding anyhow v1.0.95 to dependencies",
    ].join("\n");

    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.added[0]).toEqual({ name: "serde", version: "1.0.217" });
    expect(result.added[1]).toEqual({ name: "tokio", version: "1.41.1" });
    expect(result.added[2]).toEqual({ name: "anyhow", version: "1.0.95" });
  });

  it("parses dev dependency added", () => {
    const stderr = "      Adding pretty_assertions v1.4.1 to dev-dependencies";
    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.added[0]).toEqual({ name: "pretty_assertions", version: "1.4.1" });
  });

  it("handles package already present (updated)", () => {
    // When a package is already present, cargo add still outputs the "Adding" line
    // with the resolved version
    const stderr = "      Adding serde v1.0.217 to dependencies";
    const result = parseCargoAddOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
  });

  it("handles failure (package not found)", () => {
    const stderr = "error: the crate `nonexistent_crate_xyz` could not be found in registry";
    const result = parseCargoAddOutput("", stderr, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.added).toEqual([]);
  });

  it("handles empty output", () => {
    const result = parseCargoAddOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.added).toEqual([]);
  });

  it("parses output when Adding line is in stdout instead of stderr", () => {
    const stdout = "      Adding clap v4.5.0 to dependencies";
    const result = parseCargoAddOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.added[0]).toEqual({ name: "clap", version: "4.5.0" });
  });
});

describe("formatCargoAdd", () => {
  it("formats successful add", () => {
    const output = formatCargoAdd({
      success: true,
      added: [
        { name: "serde", version: "1.0.217" },
        { name: "tokio", version: "1.41.1" },
      ],
      total: 2,
    });

    expect(output).toContain("cargo add: 2 package(s) added");
    expect(output).toContain("serde v1.0.217");
    expect(output).toContain("tokio v1.41.1");
  });

  it("formats failed add", () => {
    const output = formatCargoAdd({
      success: false,
      added: [],
      total: 0,
    });

    expect(output).toBe("cargo add: failed");
  });

  it("formats success with no packages", () => {
    const output = formatCargoAdd({
      success: true,
      added: [],
      total: 0,
    });

    expect(output).toBe("cargo add: success, no packages added.");
  });
});

// ---------------------------------------------------------------------------
// cargo remove
// ---------------------------------------------------------------------------

describe("parseCargoRemoveOutput", () => {
  it("parses single package removed", () => {
    const stderr = "      Removing serde from dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.removed).toEqual(["serde"]);
  });

  it("parses multiple packages removed", () => {
    const stderr = [
      "      Removing serde from dependencies",
      "      Removing tokio from dependencies",
    ].join("\n");

    const result = parseCargoRemoveOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.removed).toEqual(["serde", "tokio"]);
  });

  it("parses dev dependency removed", () => {
    const stderr = "      Removing pretty_assertions from dev-dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.removed).toEqual(["pretty_assertions"]);
  });

  it("handles failure (package not a dependency)", () => {
    const stderr = "error: the dependency `nonexistent` could not be found in `dependencies`";
    const result = parseCargoRemoveOutput("", stderr, 101);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.removed).toEqual([]);
  });

  it("handles empty output", () => {
    const result = parseCargoRemoveOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.removed).toEqual([]);
  });
});

describe("formatCargoRemove", () => {
  it("formats successful remove", () => {
    const output = formatCargoRemove({
      success: true,
      removed: ["serde", "tokio"],
      total: 2,
    });

    expect(output).toContain("cargo remove: 2 package(s) removed");
    expect(output).toContain("serde");
    expect(output).toContain("tokio");
  });

  it("formats failed remove", () => {
    const output = formatCargoRemove({
      success: false,
      removed: [],
      total: 0,
    });

    expect(output).toBe("cargo remove: failed");
  });

  it("formats success with no packages", () => {
    const output = formatCargoRemove({
      success: true,
      removed: [],
      total: 0,
    });

    expect(output).toBe("cargo remove: success, no packages removed.");
  });
});

// ---------------------------------------------------------------------------
// Flag injection security tests
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection (cargo add/remove security)", () => {
  it("allows legitimate package names", () => {
    expect(() => assertNoFlagInjection("serde", "packages")).not.toThrow();
    expect(() => assertNoFlagInjection("tokio", "packages")).not.toThrow();
    expect(() => assertNoFlagInjection("serde_json", "packages")).not.toThrow();
    expect(() => assertNoFlagInjection("my-crate@1.0", "packages")).not.toThrow();
  });

  it("rejects --git flag injection", () => {
    expect(() => assertNoFlagInjection("--git", "packages")).toThrow(/must not start with "-"/);
  });

  it("rejects --git with URL", () => {
    expect(() => assertNoFlagInjection("--git=https://evil.com", "packages")).toThrow(
      /must not start with "-"/,
    );
  });

  it("rejects --path flag injection", () => {
    expect(() => assertNoFlagInjection("--path", "packages")).toThrow(/must not start with "-"/);
  });

  it("rejects --path with value", () => {
    expect(() => assertNoFlagInjection("--path=/etc/passwd", "packages")).toThrow(
      /must not start with "-"/,
    );
  });

  it("rejects -F short flag", () => {
    expect(() => assertNoFlagInjection("-F", "packages")).toThrow(/must not start with "-"/);
  });

  it("rejects --features flag injection", () => {
    expect(() => assertNoFlagInjection("--features", "packages")).toThrow(
      /must not start with "-"/,
    );
  });

  it("rejects --registry flag injection", () => {
    expect(() => assertNoFlagInjection("--registry", "packages")).toThrow(
      /must not start with "-"/,
    );
  });

  it("rejects single dash flag", () => {
    expect(() => assertNoFlagInjection("-p", "packages")).toThrow(/must not start with "-"/);
  });

  it("includes the parameter name in the error message", () => {
    expect(() => assertNoFlagInjection("--evil", "packages")).toThrow(/packages/);
  });

  it("includes the rejected value in the error message", () => {
    expect(() => assertNoFlagInjection("--evil", "packages")).toThrow(/--evil/);
  });
});
