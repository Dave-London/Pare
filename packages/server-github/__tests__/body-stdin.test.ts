/**
 * Tests that all GitHub tools passing user-provided text (body, notes, comments)
 * use `--body-file -` (or `--notes-file -`) with stdin instead of `--body`/`--notes`
 * CLI args. This prevents shell escaping issues with backticks, pipes, parentheses,
 * and other special characters.
 *
 * See: https://github.com/Dave-London/pare/issues/516
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { registerIssueCreateTool } from "../src/tools/issue-create.js";
import { registerIssueCommentTool } from "../src/tools/issue-comment.js";
import { registerIssueUpdateTool } from "../src/tools/issue-update.js";
import { registerPrCreateTool } from "../src/tools/pr-create.js";
import { registerPrCommentTool } from "../src/tools/pr-comment.js";
import { registerPrReviewTool } from "../src/tools/pr-review.js";
import { registerPrUpdateTool } from "../src/tools/pr-update.js";
import { registerReleaseCreateTool } from "../src/tools/release-create.js";
import { registerPrMergeTool } from "../src/tools/pr-merge.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: Record<string, unknown> }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

/** Body text with characters that would break shell argument passing on Windows. */
const SPECIAL_BODY =
  "## Bug Report\n\n" +
  "The `escapeCmdArg()` function fails when given pipes (`|`), backticks (`` ` ``), " +
  "parentheses `(foo)`, ampersands `&`, angle brackets `<` `>`, and carets `^`.\n\n" +
  "| Column A | Column B |\n" +
  "|----------|----------|\n" +
  "| value(1) | `code` |\n\n" +
  "```typescript\nconst x = a | b;\nif (x > 0 && y < 1) { console.log(`done`); }\n```";

function setupServer(): FakeServer {
  const server = new FakeServer();
  registerIssueCreateTool(server as never);
  registerIssueCommentTool(server as never);
  registerIssueUpdateTool(server as never);
  registerPrCreateTool(server as never);
  registerPrCommentTool(server as never);
  registerPrReviewTool(server as never);
  registerPrUpdateTool(server as never);
  registerReleaseCreateTool(server as never);
  registerPrMergeTool(server as never);
  return server;
}

describe("stdin body passing (#516): all text-body tools use --body-file - with stdin", () => {
  let server: FakeServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = setupServer();
  });

  it("issue-create passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/issues/42\n",
      stderr: "",
    });
    const handler = server.tools.get("issue-create")!.handler;
    await handler({ title: "Test", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("issue-comment passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/issues/1#issuecomment-123\n",
      stderr: "",
    });
    const handler = server.tools.get("issue-comment")!.handler;
    await handler({ number: "1", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("issue-update passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/issues/5\n",
      stderr: "",
    });
    const handler = server.tools.get("issue-update")!.handler;
    await handler({ number: "5", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("pr-create passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/pull/10\n",
      stderr: "",
    });
    const handler = server.tools.get("pr-create")!.handler;
    await handler({ title: "Test PR", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("pr-comment passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/pull/3#issuecomment-456\n",
      stderr: "",
    });
    const handler = server.tools.get("pr-comment")!.handler;
    await handler({ number: "3", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("pr-review passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/pull/7#pullrequestreview-999\n",
      stderr: "",
    });
    const handler = server.tools.get("pr-review")!.handler;
    await handler({ number: "7", event: "comment", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("pr-update passes body via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/pull/8\n",
      stderr: "",
    });
    const handler = server.tools.get("pr-update")!.handler;
    await handler({ number: "8", body: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("pr-merge passes commitBody via stdin, not --body", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "✓ Merged pull request #42\n",
      stderr: "",
    });
    const handler = server.tools.get("pr-merge")!.handler;
    await handler({ number: "42", method: "squash", commitBody: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--body");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("pr-merge without commitBody does not use stdin", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "✓ Merged pull request #42\n",
      stderr: "",
    });
    const handler = server.tools.get("pr-merge")!.handler;
    await handler({ number: "42", method: "squash" });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).not.toContain("--body-file");
    expect(args).not.toContain("--body");
    const stdinVal = typeof opts === "object" ? (opts as { stdin?: string }).stdin : undefined;
    expect(stdinVal).toBeUndefined();
  });

  it("release-create passes notes via stdin using --notes-file -, not --notes", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/releases/tag/v1.0.0\n",
      stderr: "",
    });
    const handler = server.tools.get("release-create")!.handler;
    await handler({ tag: "v1.0.0", notes: SPECIAL_BODY });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).toContain("--notes-file");
    expect(args).toContain("-");
    expect(args).not.toContain("--notes");
    expect((opts as { stdin?: string }).stdin).toBe(SPECIAL_BODY);
  });

  it("release-create without notes does not use stdin", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/releases/tag/v2.0.0\n",
      stderr: "",
    });
    const handler = server.tools.get("release-create")!.handler;
    await handler({ tag: "v2.0.0", generateNotes: true });

    const [args, opts] = vi.mocked(ghCmd).mock.calls[0];
    expect(args).not.toContain("--notes-file");
    expect(args).not.toContain("--notes");
    // When no notes, opts should be a string (cwd) not an object with stdin
    const stdinVal = typeof opts === "object" ? (opts as { stdin?: string }).stdin : undefined;
    expect(stdinVal).toBeUndefined();
  });

  it("release-create with notesFile flag does not use stdin (reads from file)", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      exitCode: 0,
      stdout: "https://github.com/owner/repo/releases/tag/v3.0.0\n",
      stderr: "",
    });
    const handler = server.tools.get("release-create")!.handler;
    await handler({ tag: "v3.0.0", notes: "ignored", notesFile: "CHANGELOG.md" });

    const [args] = vi.mocked(ghCmd).mock.calls[0];
    // When notesFile is provided, it should use --notes-file <path>, not --notes-file -
    expect(args).toContain("--notes-file");
    expect(args).toContain("CHANGELOG.md");
    // Should NOT have --notes-file - (stdin mode) since notesFile takes precedence
    const dashIdx = args.indexOf("-");
    if (dashIdx >= 0) {
      // If "-" is present, it should NOT be immediately after "--notes-file"
      const nfIdx = args.indexOf("--notes-file");
      expect(args[nfIdx + 1]).not.toBe("-");
    }
  });
});
