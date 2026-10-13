import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
type ToolConfig = { inputSchema: Record<string, unknown> };

class FakeServer {
  tools = new Map<string, { config: ToolConfig; handler: ToolHandler }>();

  registerTool(name: string, config: ToolConfig, handler: ToolHandler) {
    this.tools.set(name, { config, handler });
  }
}

const TOKEN = "gho_reviewerTokenValue";
const ok = (stdout = "") => ({ stdout, stderr: "", exitCode: 0 });
const accountEnv = { GH_TOKEN: TOKEN, GH_ENTERPRISE_TOKEN: expect.any(String) };

describe("per-call gh account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    expect(vi.mocked(run).mock.calls[1][2]?.env).toEqual(accountEnv);
    // Never switches the machine-wide active account.
    expect(vi.mocked(run).mock.calls.flatMap((c) => c[1])).not.toContain("switch");
  });

  it("never sends the account token to an Enterprise Server host", async () => {
    vi.mocked(run).mockResolvedValueOnce(ok(TOKEN)).mockResolvedValueOnce(ok());

    await ghCmd(["pr", "merge", "12"], { account: "horza-bora" });

    // gh reads GH_ENTERPRISE_TOKEN (not GH_TOKEN) for Enterprise Server hosts. It must be a
    // non-secret value that fails auth there, rather than unset (which falls back to the
    // stored active account) or the real token (which would leak it to that host).
    const env = vi.mocked(run).mock.calls[1][2]?.env;
    expect(env?.GH_ENTERPRISE_TOKEN).toBeTruthy();
    expect(env?.GH_ENTERPRISE_TOKEN).not.toBe(TOKEN);
  });

  it("refuses an Enterprise Server GH_HOST before spawning gh", async () => {
    vi.stubEnv("GH_HOST", "ghe.corp.example");

    await expect(ghCmd(["pr", "merge", "12"], { account: "horza-bora" })).rejects.toThrow(
      /Cannot run as account "horza-bora" on ghe\.corp\.example/,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("allows github.com and ghe.com GH_HOST values", async () => {
    for (const host of ["github.com", "tenant.ghe.com"]) {
      vi.clearAllMocks();
      vi.stubEnv("GH_HOST", host);
      vi.mocked(run).mockResolvedValueOnce(ok(TOKEN)).mockResolvedValueOnce(ok());

      await ghCmd(["pr", "merge", "12"], { account: "horza-bora" });

      expect(run).toHaveBeenCalledTimes(2);
    }
  });

  it("explains an auth failure of the target command without leaking the token", async () => {
    vi.mocked(run)
      .mockResolvedValueOnce(ok(TOKEN))
      .mockResolvedValueOnce({ stdout: "", stderr: "HTTP 401: Bad credentials", exitCode: 1 });

    const result = await ghCmd(["pr", "merge", "12"], { account: "horza-bora" });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/github\.com and ghe\.com hosts only/);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("fails without running the command when the account has no stored credentials", async () => {
    vi.mocked(run).mockResolvedValueOnce({
      stdout: "",
      stderr: "no oauth token found for github.com account nobody",
      exitCode: 1,
    });

    await expect(ghCmd(["pr", "merge", "12"], { account: "nobody" })).rejects.toThrow(
      /Could not get a gh token for account "nobody": no oauth token found/,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("fails without running the command when the token lookup returns nothing", async () => {
    vi.mocked(run).mockResolvedValueOnce(ok("\n"));

    await expect(ghCmd(["pr", "merge", "12"], { account: "horza-bora" })).rejects.toThrow(
      /Could not get a gh token/,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("fails without running the command when the token lookup itself rejects", async () => {
    vi.mocked(run).mockRejectedValueOnce(new Error('Command not found: "gh"'));

    await expect(ghCmd(["pr", "merge", "12"], { account: "horza-bora" })).rejects.toThrow(
      /Command not found/,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects account names that are not GitHub logins before spawning gh", async () => {
    for (const bad of ["--hostname", "a b", ""]) {
      await expect(ghCmd(["pr", "merge", "12"], { account: bad })).rejects.toThrow(
        /Invalid GitHub account name/,
      );
      expect(accountInput.safeParse(bad).success).toBe(false);
    }
    expect(run).not.toHaveBeenCalled();
    expect(accountInput.safeParse("horza-bora").success).toBe(true);
    // Enterprise Managed User logins use an underscore before the shortcode.
    expect(accountInput.safeParse("mona_acme").success).toBe(true);
    expect(accountInput.safeParse(undefined).success).toBe(true);
  });

  it("exposes the account input on pr-review and pr-merge", () => {
    const server = new FakeServer();
    registerPrReviewTool(server as never);
    registerPrMergeTool(server as never);

    expect(server.tools.get("pr-review")!.config.inputSchema.account).toBe(accountInput);
    expect(server.tools.get("pr-merge")!.config.inputSchema.account).toBe(accountInput);
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
    expect(vi.mocked(run).mock.calls[1][2]?.env).toEqual(accountEnv);
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  it("pr-review does not leak the token when the review fails", async () => {
    const server = new FakeServer();
    registerPrReviewTool(server as never);
    vi.mocked(run)
      .mockResolvedValueOnce(ok(TOKEN))
      .mockResolvedValueOnce({ stdout: "", stderr: "something went wrong", exitCode: 1 });

    const failure = await server.tools
      .get("pr-review")!
      .handler({ number: "12", event: "approve", account: "horza-bora", path: "/tmp/repo" })
      .then(
        (out) => JSON.stringify(out),
        (err: Error) => err.message,
      );

    expect(failure).toContain("something went wrong");
    expect(failure).not.toContain(TOKEN);
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
    expect(vi.mocked(run).mock.calls[1][2]?.env).toEqual(accountEnv);
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  it("pr-merge does not leak the token when the merge is blocked", async () => {
    const server = new FakeServer();
    registerPrMergeTool(server as never);
    vi.mocked(run).mockResolvedValueOnce(ok(TOKEN)).mockResolvedValueOnce({
      stdout: "",
      stderr: "the base branch policy prohibits the merge",
      exitCode: 1,
    });

    const out = await server.tools.get("pr-merge")!.handler({
      number: "12",
      method: "squash",
      account: "horza-bora",
      path: "/tmp/repo",
    });

    expect(JSON.stringify(out)).toContain("base branch policy prohibits");
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });
});
