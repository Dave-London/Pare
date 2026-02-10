import { describe, it, expect } from "vitest";
import { stripAnsi } from "../src/ansi.js";

describe("stripAnsi", () => {
  it("removes SGR color codes", () => {
    expect(stripAnsi("\x1B[31mred text\x1B[0m")).toBe("red text");
  });

  it("removes bold/underline codes", () => {
    expect(stripAnsi("\x1B[1mbold\x1B[22m \x1B[4munderline\x1B[24m")).toBe("bold underline");
  });

  it("removes multi-parameter SGR", () => {
    expect(stripAnsi("\x1B[1;31;42mfancy\x1B[0m")).toBe("fancy");
  });

  it("handles cursor movement sequences", () => {
    expect(stripAnsi("\x1B[2Aup two\x1B[Kcleared")).toBe("up twocleared");
  });

  it("handles OSC sequences (title set)", () => {
    expect(stripAnsi("\x1B]0;Window Title\x07content")).toBe("content");
  });

  it("returns plain strings unchanged", () => {
    expect(stripAnsi("no codes here")).toBe("no codes here");
  });

  it("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });
});
