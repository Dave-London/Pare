import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertNoFlagInjection } from "@paretools/shared";
import { parseCherryPick } from "../src/lib/parsers.js";
import { formatCherryPick } from "../src/lib/formatters.js";
import type { GitCherryPick } from "../src/schemas/index.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

// ── Parser tests ─────────────────────────────────────────────────────

describe("parseCherryPick", () => {
  it("parses successful single-commit cherry-pick", () => {
    const result = parseCherryPick(
      "[main abc1234] Cherry-picked commit\n 1 file changed, 2 insertions(+)",
      "",
      0,
      ["abc1234"],
    );

    expect(result.success).toBe(true);
    expect(result.applied).toEqual(["abc1234"]);
    expect(result.conflicts).toEqual([]);
  });

  it("parses successful multi-commit cherry-pick", () => {
    const result = parseCherryPick("some output", "", 0, ["abc1234", "def5678", "ghi9012"]);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual(["abc1234", "def5678", "ghi9012"]);
    expect(result.conflicts).toEqual([]);
  });

  it("parses cherry-pick with conflicts", () => {
    const stderr = [
      "error: could not apply abc1234... Fix bug",
      "CONFLICT (content): Merge conflict in src/index.ts",
      "CONFLICT (content): Merge conflict in src/utils.ts",
    ].join("\n");

    const result = parseCherryPick("", stderr, 1, ["abc1234"]);

    expect(result.success).toBe(false);
    expect(result.applied).toEqual([]);
    expect(result.conflicts).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("parses abort result", () => {
    const result = parseCherryPick("", "cherry-pick abort", 0, []);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it("parses no-commit cherry-pick (exit 0)", () => {
    const result = parseCherryPick("", "", 0, ["abc1234"]);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual(["abc1234"]);
    expect(result.conflicts).toEqual([]);
  });

  it("handles non-zero exit code without conflicts", () => {
    const result = parseCherryPick("", "fatal: bad revision 'nonexistent'", 128, ["nonexistent"]);

    expect(result.success).toBe(false);
    expect(result.applied).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });
});

// ── Formatter tests ──────────────────────────────────────────────────

describe("formatCherryPick", () => {
  it("formats successful single-commit cherry-pick", () => {
    const data: GitCherryPick = {
      success: true,
      state: "completed",
      applied: ["abc1234"],
      conflicts: [],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("Cherry-pick applied 1 commit(s)");
    expect(output).toContain("[completed]");
    expect(output).toContain("abc1234");
  });

  it("formats successful multi-commit cherry-pick", () => {
    const data: GitCherryPick = {
      success: true,
      state: "completed",
      applied: ["abc1234", "def5678"],
      conflicts: [],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("Cherry-pick applied 2 commit(s)");
    expect(output).toContain("abc1234, def5678");
  });

  it("formats cherry-pick with conflicts", () => {
    const data: GitCherryPick = {
      success: false,
      state: "conflict",
      applied: [],
      conflicts: ["src/index.ts", "src/utils.ts"],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("Cherry-pick paused due to conflicts");
    expect(output).toContain("[conflict]");
    expect(output).toContain("CONFLICT: src/index.ts");
    expect(output).toContain("CONFLICT: src/utils.ts");
  });

  it("formats failed cherry-pick without conflicts", () => {
    const data: GitCherryPick = {
      success: false,
      state: "in-progress",
      applied: [],
      conflicts: [],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("Cherry-pick failed");
    expect(output).toContain("[in-progress]");
  });

  it("formats abort (no commits applied)", () => {
    const data: GitCherryPick = {
      success: true,
      state: "completed",
      applied: [],
      conflicts: [],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("Cherry-pick completed");
    expect(output).toContain("[completed]");
  });
});

// ── Security tests ───────────────────────────────────────────────────

describe("security: cherry-pick tool — commits validation", () => {
  const MALICIOUS_INPUTS = [
    "--force",
    "--amend",
    "-rf",
    "--no-verify",
    "--exec=rm -rf /",
    "-u",
    "--delete",
    "--hard",
    "--output=/etc/passwd",
    "-D",
    "--set-upstream",
    "--all",
    "-m",
    " --force",
    "\t--delete",
    "   -rf",
  ];

  it("rejects flag-like commit hashes", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "commits")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe commit hashes", () => {
    const safeInputs = [
      "abc1234",
      "abc1234567890abcdef1234567890abcdef123456",
      "HEAD",
      "HEAD~3",
      "main",
      "feature/test",
    ];
    for (const safe of safeInputs) {
      expect(() => assertNoFlagInjection(safe, "commits")).not.toThrow();
    }
  });
});

// ── Integration tests ────────────────────────────────────────────────

describe("@paretools/git cherry-pick integration", () => {
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
    // Create a temp repo with an initial commit
    tempDir = mkdtempSync(join(tmpdir(), "pare-git-cherrypick-"));
    gitInTemp(["init"]);
    gitInTemp(["config", "user.email", "test@pare.dev"]);
    gitInTemp(["config", "user.name", "Pare Cherry-Pick Test"]);
    writeFileSync(join(tempDir, "initial.txt"), "hello\n");
    gitInTemp(["add", "."]);
    gitInTemp(["commit", "-m", "Initial commit"]);

    // Create a second commit on a side branch to cherry-pick from
    gitInTemp(["checkout", "-b", "feature-branch"]);
    writeFileSync(join(tempDir, "feature.txt"), "feature content\n");
    gitInTemp(["add", "feature.txt"]);
    gitInTemp(["commit", "-m", "Add feature file"]);

    // Create a third commit on the side branch
    writeFileSync(join(tempDir, "feature2.txt"), "feature2 content\n");
    gitInTemp(["add", "feature2.txt"]);
    gitInTemp(["commit", "-m", "Add second feature file"]);

    // Switch back to the default branch
    // Get the default branch name (could be main or master)
    const branches = gitInTemp(["branch"]).trim().split("\n");
    const defaultBranch = branches
      .find((b) => !b.includes("feature-branch"))
      ?.replace("*", "")
      .trim();
    if (defaultBranch) {
      gitInTemp(["checkout", defaultBranch]);
    }

    // Spawn the MCP server
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
    });

    client = new Client({ name: "test-client-cherry-pick", version: "1.0.0" });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await transport.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("cherry-picks a single commit from another branch", async () => {
    // Get the hash of the first feature commit
    const logOutput = gitInTemp(["log", "feature-branch", "--oneline"]);
    const lines = logOutput.trim().replace(/\r\n/g, "\n").split("\n");
    // The second-to-last line is "Add feature file" (first feature commit)
    const featureCommitLine = lines.find((l) => l.includes("Add feature file"));
    const commitHash = featureCommitLine?.split(" ")[0];
    expect(commitHash).toBeDefined();

    const result = await client.callTool({
      name: "cherry-pick",
      arguments: { path: tempDir, commits: [commitHash!] },
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);

    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc).toBeDefined();
    expect(sc.success).toBe(true);
    expect(Array.isArray(sc.applied)).toBe(true);
    expect((sc.applied as string[]).length).toBe(1);
    expect(sc.conflicts).toEqual([]);
  });

  it("cherry-picks with noCommit flag", async () => {
    // Get the hash of the second feature commit
    const logOutput = gitInTemp(["log", "feature-branch", "--oneline"]);
    const lines = logOutput.trim().replace(/\r\n/g, "\n").split("\n");
    const featureCommitLine = lines.find((l) => l.includes("Add second feature file"));
    const commitHash = featureCommitLine?.split(" ")[0];
    expect(commitHash).toBeDefined();

    const result = await client.callTool({
      name: "cherry-pick",
      arguments: { path: tempDir, commits: [commitHash!], noCommit: true },
    });

    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc).toBeDefined();
    expect(sc.success).toBe(true);
    expect(sc.conflicts).toEqual([]);

    // Clean up the staged changes
    gitInTemp(["checkout", "--", "."]);
    gitInTemp(["clean", "-fd"]);
  });

  it("rejects flag-injection in commits", async () => {
    const result = await client.callTool({
      name: "cherry-pick",
      arguments: { path: tempDir, commits: ["--force"] },
    });

    expect(result.isError).toBe(true);
  });

  it("rejects empty commits array when not using abort/continue", async () => {
    const result = await client.callTool({
      name: "cherry-pick",
      arguments: { path: tempDir, commits: [] },
    });

    expect(result.isError).toBe(true);
  });

  it("lists cherry-pick in available tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("cherry-pick");
  });
});
