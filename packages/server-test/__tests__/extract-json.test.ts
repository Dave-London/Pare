import { describe, it, expect } from "vitest";
import { extractJson } from "../src/tools/run.js";

describe("extractJson", () => {
  it("extracts JSON object from clean input", () => {
    const json = '{"key": "value"}';
    expect(extractJson(json)).toBe('{"key": "value"}');
  });

  it("extracts JSON from text with leading noise", () => {
    const output = 'Some debug output\nWarning: blah\n{"result": 42}';
    expect(extractJson(output)).toBe('{"result": 42}');
  });

  it("extracts JSON from text with trailing noise", () => {
    const output = '{"result": 42}\nDone in 1.2s';
    expect(extractJson(output)).toBe('{"result": 42}');
  });

  it("extracts JSON from text with both leading and trailing noise", () => {
    const output = 'Starting tests...\n{"total": 5, "passed": 5}\nFinished.';
    expect(extractJson(output)).toBe('{"total": 5, "passed": 5}');
  });

  it("handles nested JSON objects", () => {
    const json = '{"outer": {"inner": true}}';
    const output = `prefix\n${json}\nsuffix`;
    expect(extractJson(output)).toBe(json);
  });

  it("throws on empty input", () => {
    expect(() => extractJson("")).toThrow(/No JSON output found/);
  });

  it("throws on input with no JSON", () => {
    expect(() => extractJson("just some plain text")).toThrow(/No JSON output found/);
  });

  it("throws when only opening brace found", () => {
    // Only a "{" with no closing "}" at a later position
    expect(() => extractJson("prefix { no close")).toThrow(/No JSON output found/);
  });

  it("handles multiline JSON", () => {
    const json = '{\n  "key": "value",\n  "num": 123\n}';
    const output = `debug line\n${json}\nmore debug`;
    const result = extractJson(output);
    expect(JSON.parse(result)).toEqual({ key: "value", num: 123 });
  });

  it("uses first { and last } to capture full JSON", () => {
    // When there are nested braces, it should use the outermost boundaries
    const output = 'noise {"a": {"b": 1}} noise';
    const result = extractJson(output);
    expect(JSON.parse(result)).toEqual({ a: { b: 1 } });
  });
});
