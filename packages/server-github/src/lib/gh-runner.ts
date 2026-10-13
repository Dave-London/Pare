import { run, type RunResult } from "@paretools/shared";
import { GH_LOGIN_RE } from "./account.js";

export interface GhCmdOptions {
  cwd?: string;
  /** Data to write to the child process's stdin (e.g., for --body-file -). */
  stdin?: string;
  /** Run this one invocation as another locally logged-in gh account.
   *  The active account (`gh auth switch`) is left untouched. */
  account?: string;
}

/**
 * Looks up the stored token for a locally logged-in gh account.
 * The token is only ever handed to the child process env — never returned to a tool result.
 */
async function resolveAccountToken(account: string, cwd?: string): Promise<string> {
  // Re-validated here because `account` becomes a positional value for `--user`.
  if (!GH_LOGIN_RE.test(account)) {
    throw new Error(`Invalid GitHub account name: "${account}"`);
  }
  const result = await run("gh", ["auth", "token", "--user", account], {
    cwd,
    timeout: 30_000,
    shell: false,
  });
  const token = result.stdout.trim();
  if (result.exitCode !== 0 || !token) {
    const detail = result.stderr.trim();
    throw new Error(
      `gh has no stored credentials for account "${account}". Run \`gh auth login\` for that account first.` +
        (detail ? ` (${detail})` : ""),
    );
  }
  return token;
}

export async function ghCmd(args: string[], cwdOrOpts?: string | GhCmdOptions): Promise<RunResult> {
  const opts = typeof cwdOrOpts === "string" ? { cwd: cwdOrOpts } : cwdOrOpts;
  // GH_TOKEN overrides the active account for this process only, so concurrent
  // sessions on the same machine keep acting as whoever `gh auth switch` selected.
  const env = opts?.account
    ? { GH_TOKEN: await resolveAccountToken(opts.account, opts.cwd) }
    : undefined;
  // gh is a native executable; disable shell mode to avoid cmd.exe escaping/quoting issues.
  return run("gh", args, {
    cwd: opts?.cwd,
    timeout: 30_000,
    stdin: opts?.stdin,
    shell: false,
    env,
  });
}
