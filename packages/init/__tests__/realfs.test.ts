import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { realFs } from "../src/lib/merge.js";

describe("realFs", () => {
  let tmpDir: string;

  function makeTmp(): string {
    tmpDir = mkdtempSync(join(tmpdir(), "pare-realfs-"));
    return tmpDir;
  }

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("readFile", () => {
    it("returns undefined for nonexistent file", () => {
      makeTmp();
      const fs = realFs();
      expect(fs.readFile(join(tmpDir, "missing.json"))).toBeUndefined();
    });

    it("returns content for existing file", () => {
      makeTmp();
      const filePath = join(tmpDir, "test.json");
      writeFileSync(filePath, '{"hello":"world"}', "utf-8");
      const fs = realFs();
      expect(fs.readFile(filePath)).toBe('{"hello":"world"}');
    });
  });

  describe("writeFile", () => {
    it("writes content to a file", () => {
      makeTmp();
      const filePath = join(tmpDir, "output.json");
      const fs = realFs();
      fs.writeFile(filePath, '{"written":true}');
      expect(readFileSync(filePath, "utf-8")).toBe('{"written":true}');
    });

    it("creates parent directories if they do not exist", () => {
      makeTmp();
      const filePath = join(tmpDir, "nested", "deep", "config.json");
      const fs = realFs();
      fs.writeFile(filePath, "content");
      expect(readFileSync(filePath, "utf-8")).toBe("content");
    });
  });

  describe("backupFile", () => {
    it("returns undefined for nonexistent file", () => {
      makeTmp();
      const fs = realFs();
      expect(fs.backupFile(join(tmpDir, "nope.json"))).toBeUndefined();
    });

    it("creates .bak copy of existing file", () => {
      makeTmp();
      const filePath = join(tmpDir, "config.json");
      writeFileSync(filePath, "original content", "utf-8");
      const fs = realFs();
      const backupPath = fs.backupFile(filePath);

      expect(backupPath).toBe(filePath + ".bak");
      expect(readFileSync(backupPath!, "utf-8")).toBe("original content");
    });
  });
});
