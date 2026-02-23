import { describe, it, expect } from "vitest";
import { stripBom } from "../src/lib/parse-utils.js";

describe("stripBom", () => {
  it("strips UTF-8 BOM from start of string", () => {
    expect(stripBom("\uFEFFhello")).toBe("hello");
  });

  it("returns string unchanged when no BOM", () => {
    expect(stripBom("hello")).toBe("hello");
  });

  it("returns empty string unchanged", () => {
    expect(stripBom("")).toBe("");
  });

  it("only strips leading BOM, not embedded ones", () => {
    expect(stripBom("hello\uFEFFworld")).toBe("hello\uFEFFworld");
  });

  it("handles BOM-only string", () => {
    expect(stripBom("\uFEFF")).toBe("");
  });
});
