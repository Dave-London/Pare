import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paretools/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@paretools/shared")>()),
  run: vi.fn(),
}));

import { run } from "@paretools/shared";
import { ghCmd } from "../src/lib/gh-runner.js";
import { accountInput } from "../src/lib/account.js";
import { registerPrReviewTool } from "../src/tools/pr-review.js";
import { registerPrMergeTool } from "../src/tools/pr-merge.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<Record<string, unknown>>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

const TOKEN = "gho_reviewerTokenValue";
const ok = (stdout = "") => ({ stdout, stderr: "", exitCode: 0 });

describe("per-call gh account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs as the active account when no account is given", async () => {
    vi.mocked(run).mockResolvedValueOnce(ok());

    await ghCmd(["pr", "list"], { cwd: "/tmp/repo" });

    expect(run).toHaveBeenCalledTimes(1);
    expect(vi.mocked(run).mock.calls[0][0]).toBe("gh");
    expect(vi.mocked(run).mock.calls[0][1]).toEqual(["pr", "list"]);
    expect(vi.mocked(run).mock.calls[0][2]?.env).toBeUndefined();
  });

  it("injects the named account's token for that invocation only", async () => {
    vi.mocked(run)
      .mockResolvedValueOnce(ok(`${TOKEN}\n`))
      .mockResolvedValueOnce(ok());

    await ghCmd(["pr", "review", "12", "--approve"], { cwd: "/tmp/repo", account: "horza-bora" });

    expect(run).toHaveBeenCalledTimes(2);
    expect(vi.mocked(run).mock.calls[0][1]).toEqual(["auth", "token", "--user", "horza-bora"]);
    expect(vi.mocked(run).mock.calls[1][1]).toEqual(["pr", "review", "12", "--approve"]);
    expect(vi.mocked(run).mock.calls[1][2]?.env).toEqual({ GH_TOKEN: TOKEN });
    // Never switches the machine-wide active account.
    expect(vi.mocked(run).mock.calls.flatMap((c) => c[1])).not.toContain("switch");
  });

  it("fails without running the command when the account has no stored credentials", async () => {
    vi.mocked(run).mockResolvedValueOnce({
      stdout: "",
      stderr: "no oauth token found for github.com account nobody",
      exitCode: 1,
    });

    await expect(ghCmd(["pr", "merge", "12"], { account: "nobody" })).rejects.toThrow(
      /no stored credentials for account "nobody"/,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects account names that are not GitHub logins before spawning gh", async () => {
    await expect(ghCmd(["pr", "merge", "12"], { account: "--hostname" })).rejects.toThrow(
      /Invalid GitHub account name/,
    );
    expect(run).not.toHaveBeenCalled();
    expect(accountInput.safeParse("--hostname").success).toBe(false);
    expect(accountInput.safeParse("a b").success).toBe(false);
    expect(accountInput.safeParse("horza-bora").success).toBe(true);
    expect(accountInput.safeParse(undefined).success).toBe(true);
  });

  it("pr-review approves as the given account without leaking the token", async () => {
    const server = new FakeServer();
    registerPrReviewTool(server as never);
    vi.mocked(run)
      .mockResolvedValueOnce(ok(TOKEN))
      .mockResolvedValueOnce(ok("https://github.com/owner/repo/pull/12#pullrequestreview-1\n"));

    const out = await server.tools.get("pr-review")!.handler({
      number: "12",
      event: "approve",
      account: "horza-bora",
      path: "/tmp/repo",
    });

    expect(vi.mocked(run).mock.calls[1][1]).toEqual(["pr", "review", "12", "--approve"]);
    expect(vi.mocked(run).mock.calls[1][2]?.env).toEqual({ GH_TOKEN: TOKEN });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  it("pr-merge merges as the given account without leaking the token", async () => {
    const server = new FakeServer();
    registerPrMergeTool(server as never);
    vi.mocked(run)
      .mockResolvedValueOnce(ok(TOKEN))
      .mockResolvedValueOnce(ok("✓ Squashed and merged pull request #12 (Fix thing)\n"));

    const out = await server.tools.get("pr-merge")!.handler({
      number: "12",
      method: "squash",
      account: "horza-bora",
      path: "/tmp/repo",
    });

    expect(vi.mocked(run).mock.calls[1][1]).toEqual(["pr", "merge", "12", "--squash"]);
    expect(vi.mocked(run).mock.calls[1][2]?.env).toEqual({ GH_TOKEN: TOKEN });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });
});
