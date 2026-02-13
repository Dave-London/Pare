import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { parseRestore } from "../src/lib/parsers.js";
import { formatRestore } from "../src/lib/formatters.js";
import type { GitRestore } from "../src/schemas/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── Parser tests ─────────────────────────────────────────────────────

describe("parseRestore", () => {
  it("returns file list, source, and staged flag", () => {
    const result = parseRestore(["src/index.ts", "README.md"], "HEAD", false);

    expect(result.restored).toEqual(["src/index.ts", "README.md"]);
    expect(result.source).toBe("HEAD");
    expect(result.staged).toBe(false);
  });

  it("returns custom source ref", () => {
    const result = parseRestore(["file.ts"], "abc1234", false);

    expect(result.restored).toEqual(["file.ts"]);
    expect(result.source).toBe("abc1234");
    expect(result.staged).toBe(false);
  });

  it("returns staged flag when true", () => {
    const result = parseRestore(["staged.ts"], "HEAD", true);

    expect(result.restored).toEqual(["staged.ts"]);
    expect(result.source).toBe("HEAD");
    expect(result.staged).toBe(true);
  });

  it("handles single file", () => {
    const result = parseRestore(["only-file.ts"], "HEAD", false);

    expect(result.restored).toEqual(["only-file.ts"]);
  });

  it("handles many files", () => {
    const files = Array.from({ length: 50 }, (_, i) => `file-${i}.ts`);
    const result = parseRestore(files, "HEAD", false);

    expect(result.restored).toHaveLength(50);
    expect(result.restored[0]).toBe("file-0.ts");
    expect(result.restored[49]).toBe("file-49.ts");
  });
});

// ── Formatter tests ──────────────────────────────────────────────────

describe("formatRestore", () => {
  it("formats working tree restore from HEAD", () => {
    const data: GitRestore = {
      restored: ["src/index.ts", "README.md"],
      source: "HEAD",
      staged: false,
    };
    expect(formatRestore(data)).toBe("Restored 2 file(s) (working tree): src/index.ts, README.md");
  });

  it("formats staged restore from HEAD", () => {
    const data: GitRestore = {
      restored: ["staged.ts"],
      source: "HEAD",
      staged: true,
    };
    expect(formatRestore(data)).toBe("Restored 1 file(s) (staged): staged.ts");
  });

  it("formats restore from custom source", () => {
    const data: GitRestore = {
      restored: ["file.ts"],
      source: "abc1234",
      staged: false,
    };
    expect(formatRestore(data)).toBe("Restored 1 file(s) (working tree) from abc1234: file.ts");
  });

  it("formats staged restore from custom source", () => {
    const data: GitRestore = {
      restored: ["file.ts"],
      source: "main",
      staged: true,
    };
    expect(formatRestore(data)).toBe("Restored 1 file(s) (staged) from main: file.ts");
  });

  it("formats no files restored", () => {
    const data: GitRestore = {
      restored: [],
      source: "HEAD",
      staged: false,
    };
    expect(formatRestore(data)).toBe("No files restored");
  });
});

// ── Integration tests ────────────────────────────────────────────────

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

describe("@paretools/git restore integration", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let tempDir: string;

  function gitInTemp(args: string[]) {
    return execFileSync("git", args, {
      cwd: tempDir,
      encoding: "utf-8",
    });
  }

  beforeAll(async () => {
    // Create a temp repo with a committed file
    tempDir = mkdtempSync(join(tmpdir(), "pare-git-restore-"));
    gitInTemp(["init"]);
    gitInTemp(["config", "user.email", "test@pare.dev"]);
    gitInTemp(["config", "user.name", "Pare Restore Test"]);
    writeFileSync(join(tempDir, "tracked.txt"), "original content\n");
    gitInTemp(["add", "."]);
    gitInTemp(["commit", "-m", "Initial commit"]);

    // Spawn the MCP server
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
    });

    client = new Client({ name: "test-client-restore", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("restores a modified working tree file to its committed state", async () => {
    // Modify the tracked file
    writeFileSync(join(tempDir, "tracked.txt"), "modified content\n");

    // Verify file is modified
    const beforeContent = readFileSync(join(tempDir, "tracked.txt"), "utf-8");
    expect(beforeContent).toBe("modified content\n");

    // Restore the file
    const result = await client.callTool({
      name: "restore",
      arguments: { path: tempDir, files: ["tracked.txt"] },
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);

    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc).toBeDefined();
    expect(sc.restored).toEqual(["tracked.txt"]);
    expect(sc.source).toBe("HEAD");
    expect(sc.staged).toBe(false);

    // Verify file is restored to original content
    const afterContent = readFileSync(join(tempDir, "tracked.txt"), "utf-8");
    expect(afterContent).toBe("original content\n");
  });

  it("restores a staged file with --staged", async () => {
    // Stage a modification
    writeFileSync(join(tempDir, "tracked.txt"), "staged change\n");
    gitInTemp(["add", "tracked.txt"]);

    // Restore staged changes (unstages the file)
    const result = await client.callTool({
      name: "restore",
      arguments: { path: tempDir, files: ["tracked.txt"], staged: true },
    });

    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc).toBeDefined();
    expect(sc.restored).toEqual(["tracked.txt"]);
    expect(sc.source).toBe("HEAD");
    expect(sc.staged).toBe(true);

    // Verify file is unstaged (status should show modified in working tree, not staged)
    const status = gitInTemp(["status", "--porcelain=v1"]);
    expect(status.trim()).toMatch(/^ ?M tracked\.txt/);
  });

  it("rejects flag-injection in source parameter", async () => {
    const result = await client.callTool({
      name: "restore",
      arguments: { path: tempDir, files: ["tracked.txt"], source: "--exec=malicious" },
    });

    expect(result.isError).toBe(true);
  });

  it("rejects flag-injection in files parameter", async () => {
    const result = await client.callTool({
      name: "restore",
      arguments: { path: tempDir, files: ["--force"] },
    });

    expect(result.isError).toBe(true);
  });
});
