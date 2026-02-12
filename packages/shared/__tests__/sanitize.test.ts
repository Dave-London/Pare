import { describe, it, expect } from "vitest";
import { sanitizeErrorOutput } from "../src/sanitize.js";

describe("sanitizeErrorOutput", () => {
  it("replaces /home/<user>/ paths with ~/", () => {
    expect(sanitizeErrorOutput("/home/dave/.gitconfig: Permission denied")).toBe(
      "~/.gitconfig: Permission denied",
    );
  });

  it("replaces /Users/<user>/ paths with ~/", () => {
    expect(sanitizeErrorOutput("/Users/dave/projects/app/src/index.ts")).toBe(
      "~/projects/app/src/index.ts",
    );
  });

  it("replaces /root/ paths with ~/", () => {
    expect(sanitizeErrorOutput("/root/.bashrc: No such file")).toBe("~/.bashrc: No such file");
  });

  it("replaces Windows C:\\Users\\<user>\\ paths with ~\\", () => {
    expect(sanitizeErrorOutput("C:\\Users\\dave\\Documents\\file.txt")).toBe(
      "~\\Documents\\file.txt",
    );
  });

  it("leaves relative paths unchanged", () => {
    expect(sanitizeErrorOutput("./src/index.ts")).toBe("./src/index.ts");
  });

  it("leaves normal error text unchanged", () => {
    expect(sanitizeErrorOutput("Error: command failed")).toBe("Error: command failed");
  });

  it("handles multiple paths in a single message", () => {
    const input = "error in /home/alice/project/a.ts and /Users/bob/project/b.ts";
    expect(sanitizeErrorOutput(input)).toBe("error in ~/project/a.ts and ~/project/b.ts");
  });

  it("handles empty string", () => {
    expect(sanitizeErrorOutput("")).toBe("");
  });

  it("handles path with no trailing content after username directory", () => {
    // The path must have content after the username directory for the regex to match
    expect(sanitizeErrorOutput("/home/dave/file.txt")).toBe("~/file.txt");
  });

  it("is case-insensitive for Windows drive letters", () => {
    expect(sanitizeErrorOutput("c:\\Users\\dave\\file.txt")).toBe("~\\file.txt");
    expect(sanitizeErrorOutput("D:\\Users\\dave\\file.txt")).toBe("~\\file.txt");
  });
});
