import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { registerRebaseTool } from "../src/tools/rebase.js";
import { registerCherryPickTool } from "../src/tools/cherry-pick.js";
import { registerMergeTool } from "../src/tools/merge.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  structuredContent: Record<string, unknown>;
}>;

class FakeServer {
  tools = new Map<string, ToolHandler>();
  registerTool(name: string, _config: unknown, handler: ToolHandler) {
    this.tools.set(name, handler);
  }
}

const tempRoot = realpathSync.native(tmpdir());
let repo: string | undefined;

afterEach(() => {
  vi.unstubAllEnvs();
  if (repo) {
    expect(dirname(repo)).toBe(tempRoot);
    rmSync(repo, { recursive: true, force: true });
    repo = undefined;
  }
});

describe.each([
  ["rebase", registerRebaseTool],
  ["cherry-pick", registerCherryPickTool],
  ["merge", registerMergeTool],
] as const)("%s --continue without an editor", (operation, register) => {
  it("commits the staged resolution with the prepared message", async () => {
    repo = realpathSync.native(mkdtempSync(join(tempRoot, "pare-continue-editor-")));
    const cwd = repo;
    const raw = (args: string[]) =>
      execFileSync("git", args, { cwd, encoding: "utf8", timeout: 10_000 });
    const editor = `"${process.execPath.replace(/\\/g, "/")}" -e "process.exit(1)"`;
    vi.stubEnv("GIT_EDITOR", editor);
    vi.stubEnv("GIT_SEQUENCE_EDITOR", editor);

    raw(["init", "-b", "main"]);
    raw(["config", "user.name", "Test"]);
    raw(["config", "user.email", "test@example.com"]);
    raw(["config", "commit.gpgSign", "false"]);
    writeFileSync(join(cwd, "file.txt"), "base\n");
    raw(["add", "file.txt"]);
    raw(["commit", "-m", "Base"]);
    raw(["checkout", "-b", "source"]);
    writeFileSync(join(cwd, "file.txt"), "incoming\n");
    raw(["commit", "-am", "Incoming change"]);
    const incoming = raw(["rev-parse", "HEAD"]).trim();
    raw(["checkout", "main"]);
    writeFileSync(join(cwd, "file.txt"), "current\n");
    raw(["commit", "-am", "Current change"]);
    const main = raw(["rev-parse", "HEAD"]).trim();

    if (operation === "rebase") raw(["checkout", "source"]);
    const args =
      operation === "rebase"
        ? ["rebase", "main"]
        : operation === "cherry-pick"
          ? ["cherry-pick", incoming]
          : ["merge", "source"];
    const conflict = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 10_000 });
    expect(conflict.status).not.toBe(0);
    expect(conflict.stdout + conflict.stderr).toContain("CONFLICT");
    expect(raw(["ls-files", "-u"])).not.toBe("");
    writeFileSync(join(cwd, "file.txt"), "resolved\n");
    raw(["add", "file.txt"]);

    const server = new FakeServer();
    register(server as never);
    const result = await server.tools.get(operation)!({
      path: cwd,
      continue: true,
      commits: [],
      branch: operation === "merge" ? "source" : undefined,
    });

    expect(result.structuredContent).toMatchObject(
      operation === "merge" ? { merged: true } : { success: true },
    );
    expect(raw(["show", "HEAD:file.txt"])).toBe("resolved\n");
    expect(raw(["status", "--porcelain"])).toBe("");
    expect(raw(["rev-parse", "HEAD^"]).trim()).toBe(main);
    const subject = raw(["log", "-1", "--format=%s"]).trim();
    if (operation === "merge") {
      expect(raw(["rev-parse", "HEAD^2"]).trim()).toBe(incoming);
      expect(subject).toContain("Merge branch 'source'");
    } else {
      expect(subject).toBe("Incoming change");
    }
    for (const state of ["rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "MERGE_HEAD"]) {
      expect(existsSync(join(cwd, ".git", state))).toBe(false);
    }
    expect(process.env.GIT_EDITOR).toBe(editor);
    expect(process.env.GIT_SEQUENCE_EDITOR).toBe(editor);
  });
});
