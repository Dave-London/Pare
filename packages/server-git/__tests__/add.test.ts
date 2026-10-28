import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseAdd } from "../src/lib/parsers.js";
import { formatAdd } from "../src/lib/formatters.js";
import { buildAddArgs, registerAddTool } from "../src/tools/add.js";
import type { GitAdd } from "../src/schemas/index.js";

class FakeServer {
  tools = new Map<string, { handler: (params: Record<string, unknown>) => Promise<unknown> }>();
  registerTool(
    name: string,
    _config: Record<string, unknown>,
    handler: (params: Record<string, unknown>) => Promise<unknown>,
  ) {
    this.tools.set(name, { handler });
  }
}

describe("parseAdd", () => {
  it("parses staged files from porcelain status output", () => {
    const statusOutput = ["A  src/new-file.ts", "M  src/index.ts", "?? untracked.log"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(2);
    expect(result.files).toEqual([
      { file: "src/new-file.ts", status: "added" },
      { file: "src/index.ts", status: "modified" },
    ]);
  });

  it("handles no staged files", () => {
    const statusOutput = ["?? untracked.log", " M not-staged.ts"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(0);
    expect(result.files).toEqual([]);
  });

  it("handles empty status output", () => {
    const result = parseAdd("");

    expect(result.files).toHaveLength(0);
    expect(result.files).toEqual([]);
  });

  it("handles renamed files", () => {
    const statusOutput = "R  old-name.ts -> new-name.ts";

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(1);
    expect(result.files).toEqual([{ file: "new-name.ts", status: "modified" }]);
  });

  it("handles deleted files", () => {
    const statusOutput = "D  removed-file.ts";

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(1);
    expect(result.files).toEqual([{ file: "removed-file.ts", status: "deleted" }]);
  });

  it("handles mix of staged and unstaged changes", () => {
    const statusOutput = [
      "M  staged.ts",
      " M unstaged.ts",
      "A  added.ts",
      "?? untracked.ts",
      " D deleted-unstaged.ts",
    ].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(2);
    expect(result.files).toEqual([
      { file: "staged.ts", status: "modified" },
      { file: "added.ts", status: "added" },
    ]);
  });

  it("handles all files staged via git add -A", () => {
    const statusOutput = ["A  src/a.ts", "A  src/b.ts", "M  src/c.ts", "D  src/old.ts"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(4);
    expect(result.files).toEqual([
      { file: "src/a.ts", status: "added" },
      { file: "src/b.ts", status: "added" },
      { file: "src/c.ts", status: "modified" },
      { file: "src/old.ts", status: "deleted" },
    ]);
  });
});

describe("formatAdd", () => {
  it("formats staged files", () => {
    const data: GitAdd = {
      files: [
        { file: "src/a.ts", status: "added" },
        { file: "src/b.ts", status: "modified" },
      ],
    };
    expect(formatAdd(data)).toBe("Staged 2 file(s): a:src/a.ts, m:src/b.ts");
  });

  it("formats no staged files", () => {
    const data: GitAdd = { files: [] };
    expect(formatAdd(data)).toBe("No files staged");
  });

  it("formats single staged file", () => {
    const data: GitAdd = { files: [{ file: "README.md", status: "added" }] };
    expect(formatAdd(data)).toBe("Staged 1 file(s): a:README.md");
  });
});

describe("buildAddArgs argument order (#1216)", () => {
  it("places --chmod flag before the -- pathspec separator", () => {
    const args = buildAddArgs({ files: ["infra/provision.sh"], chmod: "+x" });
    expect(args).toEqual(["add", "--chmod=+x", "--", "infra/provision.sh"]);
  });

  it("places multiple modifier flags before the -- separator", () => {
    const args = buildAddArgs({
      files: ["script.sh"],
      chmod: "-x",
      force: true,
      dryRun: true,
      intentToAdd: true,
    });
    expect(args).toEqual([
      "add",
      "--dry-run",
      "--force",
      "--intent-to-add",
      "--chmod=-x",
      "--",
      "script.sh",
    ]);
  });

  it("places flags before pathspec-from-file option", () => {
    const args = buildAddArgs({ pathspecFromFile: "specs.txt", chmod: "+x" });
    expect(args).toEqual(["add", "--chmod=+x", "--pathspec-from-file=specs.txt"]);
  });

  it("places flags after -A for all=true", () => {
    const args = buildAddArgs({ all: true, chmod: "+x" });
    expect(args).toEqual(["add", "-A", "--chmod=+x"]);
  });
});

describe("end-to-end add --chmod in real repo (#1216)", () => {
  it("updates index permission mode to 100755 with chmod: '+x'", async () => {
    const repoDir = mkdtempSync(join(tmpdir(), "pare-git-chmod-test-"));
    try {
      execFileSync("git", ["init"], { cwd: repoDir });
      execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: repoDir });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: repoDir });
      execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: repoDir });

      const scriptPath = join(repoDir, "provision.sh");
      writeFileSync(scriptPath, "#!/bin/sh\necho ok\n");

      const server = new FakeServer();
      registerAddTool(server as never);
      const handler = server.tools.get("add")!.handler;

      await handler({ path: repoDir, files: ["provision.sh"], chmod: "+x" });

      const lsOutput = execFileSync("git", ["ls-files", "--stage", "provision.sh"], {
        cwd: repoDir,
        encoding: "utf8",
      });
      expect(lsOutput.trim()).toMatch(/^100755 /);

      // Verify toggling off (-x) sets mode back to 100644
      await handler({ path: repoDir, files: ["provision.sh"], chmod: "-x" });
      const lsOutputNoExec = execFileSync("git", ["ls-files", "--stage", "provision.sh"], {
        cwd: repoDir,
        encoding: "utf8",
      });
      expect(lsOutputNoExec.trim()).toMatch(/^100644 /);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });
});
