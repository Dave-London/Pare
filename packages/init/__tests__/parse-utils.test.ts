import { describe, it, expect } from "vitest";
import { stripBom, stripJsonComments, parseJsonc, isPlainObject } from "../src/lib/parse-utils.js";

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

describe("isPlainObject", () => {
  it("returns true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});

describe("stripJsonComments", () => {
  it("strips single-line comments", () => {
    const input = '{\n  "key": "value" // comment\n}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("strips block comments", () => {
    const input = '{\n  /* block comment */\n  "key": "value"\n}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("strips multi-line block comments", () => {
    const input = '{\n  /*\n   * multi-line\n   * comment\n   */\n  "key": "value"\n}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("preserves // inside strings", () => {
    const input = '{ "url": "https://example.com" }';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ url: "https://example.com" });
  });

  it("preserves /* inside strings", () => {
    const input = '{ "pattern": "/* glob */" }';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ pattern: "/* glob */" });
  });

  it("handles escaped quotes in strings", () => {
    const input = '{ "msg": "say \\"hello\\"" } // comment';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ msg: 'say "hello"' });
  });

  it("handles comment-only lines before content", () => {
    const input = '// top comment\n{ "key": 1 }';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: 1 });
  });

  it("handles trailing commas after comment stripping (typical JSONC pattern)", () => {
    // This tests that the comment stripping doesn't break the structure.
    // Note: trailing commas aren't valid JSON, but this tests comment removal.
    const input = '{\n  "a": 1,\n  // "b": 2,\n  "c": 3\n}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ a: 1, c: 3 });
  });

  it("returns plain JSON unchanged", () => {
    const input = '{ "key": "value", "num": 42 }';
    expect(stripJsonComments(input)).toBe(input);
  });

  it("handles empty input", () => {
    expect(stripJsonComments("")).toBe("");
  });
});

describe("parseJsonc", () => {
  it("parses standard JSON", () => {
    expect(parseJsonc('{ "key": 1 }')).toEqual({ key: 1 });
  });

  it("parses JSONC with comments", () => {
    const input = '{\n  // server config\n  "mcpServers": {} /* end */\n}';
    expect(parseJsonc(input)).toEqual({ mcpServers: {} });
  });

  it("handles BOM + comments combined", () => {
    const input = '\uFEFF{\n  // comment\n  "key": true\n}';
    expect(parseJsonc(input)).toEqual({ key: true });
  });

  it("throws on truly malformed content", () => {
    expect(() => parseJsonc("not json at all")).toThrow();
  });
});
