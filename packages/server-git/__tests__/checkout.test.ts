import { describe, it, expect } from "vitest";
import { parseCheckout } from "../src/lib/parsers.js";
import { formatCheckout } from "../src/lib/formatters.js";
import type { GitCheckout } from "../src/schemas/index.js";

describe("parseCheckout", () => {
  it("parses branch switch", () => {
    const result = parseCheckout(
      "",
      "Switched to branch 'feature'",
      "feature",
      "main",
      false,
    );

    expect(result.ref).toBe("feature");
    expect(result.previousRef).toBe("main");
    expect(result.created).toBe(false);
  });

  it("parses new branch creation", () => {
    const result = parseCheckout(
      "",
      "Switched to a new branch 'feature/new'",
      "feature/new",
      "main",
      true,
    );

    expect(result.ref).toBe("feature/new");
    expect(result.previousRef).toBe("main");
    expect(result.created).toBe(true);
  });

  it("handles detached HEAD as previous ref", () => {
    const result = parseCheckout(
      "",
      "Switched to branch 'main'",
      "main",
      "HEAD",
      false,
    );

    expect(result.ref).toBe("main");
    expect(result.previousRef).toBe("HEAD");
    expect(result.created).toBe(false);
  });

  it("handles unknown previous ref", () => {
    const result = parseCheckout(
      "",
      "Switched to branch 'dev'",
      "dev",
      "unknown",
      false,
    );

    expect(result.ref).toBe("dev");
    expect(result.previousRef).toBe("unknown");
  });
});

describe("formatCheckout", () => {
  it("formats branch switch", () => {
    const data: GitCheckout = {
      ref: "feature",
      previousRef: "main",
      created: false,
    };
    expect(formatCheckout(data)).toBe("Switched to 'feature' (was main)");
  });

  it("formats new branch creation", () => {
    const data: GitCheckout = {
      ref: "feature/new",
      previousRef: "main",
      created: true,
    };
    expect(formatCheckout(data)).toBe(
      "Created and switched to new branch 'feature/new' (was main)",
    );
  });
});
