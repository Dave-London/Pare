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

const ACCOUNT_HOST_HINT =
  "The account option works for github.com and ghe.com hosts only, not GitHub Enterprise Server.";

/**
 * Deliberately invalid value for GH_ENTERPRISE_TOKEN. gh ignores GH_TOKEN on
 * Enterprise Server hosts and would fall back to the stored active account, so
 * an `account` call against such a host must fail authentication instead of
 * silently acting as someone else.
 */
const GHES_REFUSAL_TOKEN = "pare-account-option-unsupported-on-ghes";

/** True for hosts where gh authenticates with GH_TOKEN. */
function usesGhToken(host: string): boolean {
  const h = host.toLowerCase();
  return h === "github.com" || h.endsWith(".github.com") || h.endsWith(".ghe.com");
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
  const host = process.env.GH_HOST;
  if (host && !usesGhToken(host)) {
    throw new Error(`Cannot run as account "${account}" on ${host}. ${ACCOUNT_HOST_HINT}`);
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
      `Could not get a gh token for account "${account}"${detail ? `: ${detail}` : ""}. ` +
        "Check that the account is logged in (`gh auth login`) and that gh is 2.40 or newer.",
    );
  }
  return token;
}

export async function ghCmd(args: string[], cwdOrOpts?: string | GhCmdOptions): Promise<RunResult> {
  const opts = typeof cwdOrOpts === "string" ? { cwd: cwdOrOpts } : cwdOrOpts;
  const account = opts?.account;
  // GH_TOKEN overrides the active account for this process only, so concurrent
  // sessions on the same machine keep acting as whoever `gh auth switch` selected.
  const env =
    account !== undefined
      ? {
          GH_TOKEN: await resolveAccountToken(account, opts?.cwd),
          GH_ENTERPRISE_TOKEN: GHES_REFUSAL_TOKEN,
        }
      : undefined;
  // gh is a native executable; disable shell mode to avoid cmd.exe escaping/quoting issues.
  const result = await run("gh", args, {
    cwd: opts?.cwd,
    timeout: 30_000,
    stdin: opts?.stdin,
    shell: false,
    env,
  });
  if (
    account !== undefined &&
    result.exitCode !== 0 &&
    /HTTP 401|bad credentials/i.test(result.stderr)
  ) {
    const hint =
      `Authentication as account "${account}" failed: its stored token may be expired or revoked ` +
      `(re-run \`gh auth login\`), or the target is a GitHub Enterprise Server host. ${ACCOUNT_HOST_HINT}`;
    return { ...result, stderr: `${result.stderr.trimEnd()}\n${hint}` };
  }
  return result;
}
