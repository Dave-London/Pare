import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePrDiffNumstat } from "../src/lib/parsers.js";
import { formatPrDiff, compactPrDiffMap, formatPrDiffCompact } from "../src/lib/formatters.js";
import { PrDiffResultSchema, type PrDiffResult } from "../src/schemas/index.js";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { registerPrDiffTool } from "../src/tools/pr-diff.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parsePrDiffNumstat", () => {
  it("parses numstat output with multiple files", () => {
    const stdout = [
      "10\t2\tsrc/index.ts",
      "5\t0\tsrc/lib/new-file.ts",
      "0\t8\tsrc/lib/removed.ts",
    ].join("\n");

    const result = parsePrDiffNumstat(stdout);

    expect(result.files).toHaveLength(3);
    expect(result.files[0]).toEqual({
      file: "src/index.ts",
      status: "modified",
      additions: 10,
      deletions: 2,
    });
    expect(result.files[1]).toEqual({
      file: "src/lib/new-file.ts",
      status: "added",
      additions: 5,
      deletions: 0,
    });
    expect(result.files[2]).toEqual({
      file: "src/lib/removed.ts",
      status: "deleted",
      additions: 0,
      deletions: 8,
    });
  });

  it("handles empty output", () => {
    const result = parsePrDiffNumstat("");
    expect(result.files).toEqual([]);
  });

  it("handles binary files with dash stats", () => {
    const stdout = "-\t-\timage.png";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files[0]).toEqual({
      file: "image.png",
      status: "modified",
      additions: 0,
      deletions: 0,
    });
  });

  it("handles renamed files", () => {
    const stdout = "5\t3\told-name.ts => new-name.ts";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].file).toBe("old-name.ts => new-name.ts");
    expect(result.files[0].oldFile).toBe("old-name.ts");
  });

  it("handles renamed files with braces", () => {
    const stdout = "2\t1\tsrc/{old => new}/file.ts";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].file).toBe("src/{old => new}/file.ts");
  });

  it("handles single file", () => {
    const stdout = "42\t7\tREADME.md\n";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].additions).toBe(42);
    expect(result.files[0].deletions).toBe(7);
    expect(result.files[0].status).toBe("modified");
  });
});

// ── Binary field test (parsePrDiffFromPatch is tested via integration) ──

// We cannot directly test parsePrDiffFromPatch here since it's a local function
// in the tool file. The binary detection is tested via the formatter test below.

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatPrDiff", () => {
  const data: PrDiffResult = {
    files: [
      { file: "src/index.ts", status: "modified", additions: 10, deletions: 2 },
      { file: "src/lib/new.ts", status: "added", additions: 50, deletions: 0 },
    ],
  };

  it("formats diff with file stats", () => {
    const output = formatPrDiff(data);
    expect(output).toContain("2 files changed, +60 -2");
    expect(output).toContain("src/index.ts +10 -2");
    expect(output).toContain("src/lib/new.ts +50 -0");
  });

  it("formats empty diff", () => {
    const empty: PrDiffResult = {
      files: [],
    };
    const output = formatPrDiff(empty);
    expect(output).toContain("0 files changed, +0 -0");
  });

  it("shows binary indicator for binary files", () => {
    const binaryDiff: PrDiffResult = {
      files: [
        { file: "image.png", status: "added", additions: 0, deletions: 0, binary: true },
        { file: "src/index.ts", status: "modified", additions: 5, deletions: 2 },
      ],
    };
    const output = formatPrDiff(binaryDiff);
    expect(output).toContain("image.png +0 -0 (binary)");
    expect(output).not.toContain("src/index.ts +5 -2 (binary)");
  });
});

describe("compactPrDiff", () => {
  it("maps to compact format without chunks", () => {
    const data: PrDiffResult = {
      files: [
        {
          file: "src/index.ts",
          status: "modified",
          additions: 10,
          deletions: 2,
          chunks: [{ header: "@@ -1,5 +1,7 @@", lines: "+new line\n old line" }],
        },
      ],
    };

    const compact = compactPrDiffMap(data);
    expect(compact.files).toHaveLength(1);
    expect(compact.files[0]).not.toHaveProperty("chunks");

    const text = formatPrDiffCompact(compact);
    expect(text).toContain("1 files changed");
    expect(text).toContain("src/index.ts +10 -2");
  });
});

// ── Tool handler tests: full / nameOnly modes (issue #907) ──────────

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

const FIXTURES = join(import.meta.dirname, "fixtures", "gh-pr-diff");

function mockGh(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

const SIMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc1234..def5678 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 import { foo } from "bar";
+import { baz } from "qux";

 export function main() {
-  return foo();
+  return baz(foo());
 }
`;

describe("pr-diff tool: full / nameOnly modes", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrDiffTool(server as never);
    handler = server.tools.get("pr-diff")!.handler;
  });

  it("full: true includes patch chunks even in default compact mode", async () => {
    mockGh(SIMPLE_DIFF);
    const result = await handler({ number: "123", full: true });
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].chunks).toBeDefined();
    expect(parsed.files[0].chunks!.length).toBeGreaterThan(0);
    expect(parsed.files[0].chunks![0].header).toMatch(/^@@/);
    expect(parsed.files[0].chunks![0].lines).toContain("+import { baz }");
  });

  it("default (no full) omits chunks", async () => {
    mockGh(SIMPLE_DIFF);
    const result = await handler({ number: "123" });
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    expect(parsed.files[0].chunks).toBeUndefined();
  });

  it("nameOnly passes --name-only and returns the changed file paths", async () => {
    mockGh("src/index.ts\nsrc/utils.ts\nREADME.md\n");
    const result = await handler({ number: "123", nameOnly: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--name-only");
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    expect(parsed.files.map((f) => f.file)).toEqual(["src/index.ts", "src/utils.ts", "README.md"]);
    expect(parsed.files.every((f) => f.status === "modified")).toBe(true);
  });

  it("nameOnly with empty output returns no files", async () => {
    mockGh("");
    const result = await handler({ number: "123", nameOnly: true });
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    expect(parsed.files).toEqual([]);
  });

  // Real `gh pr diff` output (Dave-London/Pare#1264). Both paths sit under
  // ".github/", whose "b/" made the old filename regex miss every file, so
  // full=true returned stats with no chunks.
  it("full: true attaches chunks for paths containing 'b/' (real gh output)", async () => {
    mockGh(readFileSync(join(FIXTURES, "github-dir-paths.diff"), "utf8"));
    const result = await handler({ number: "1264", full: true });
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    expect(parsed.files.map((f) => f.file)).toEqual([
      ".github/workflows/codeql.yml",
      ".github/workflows/scorecard.yml",
    ]);
    const [codeql, scorecard] = parsed.files;
    expect(codeql.chunks).toHaveLength(1);
    expect(codeql.chunks![0].header).toMatch(/^@@ -21,12 \+21,12 @@/);
    expect(codeql.chunks![0].lines).toContain("+      - uses: github/codeql-action/init@1bd86f2");
    expect(scorecard.chunks).toHaveLength(1);
    expect(scorecard.chunks![0].lines).toContain("codeql-action/upload-sarif@1bd86f2");
  });

  it("full: true pairs chunks with the right file when a path has 'b/' mid-name", async () => {
    const diff = `diff --git a/web/lib/a.ts b/web/lib/a.ts
index 1111111..2222222 100644
--- a/web/lib/a.ts
+++ b/web/lib/a.ts
@@ -1 +1 @@
-old a
+new a
diff --git a/src/b.ts b/src/b.ts
index 3333333..4444444 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1 @@
-old b
+new b
`;
    mockGh(diff);
    const result = await handler({ number: "1", full: true });
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    expect(parsed.files[0].file).toBe("web/lib/a.ts");
    expect(parsed.files[0].chunks![0].lines).toContain("+new a");
    expect(parsed.files[1].file).toBe("src/b.ts");
    expect(parsed.files[1].chunks![0].lines).toContain("+new b");
  });
});
