import { ghCmd } from "./gh-runner.js";

/**
 * `gh issue list` / `gh pr list` add `repo:OWNER/REPO` to the `--search` text.
 * In GitHub search a bare `OR` splits the whole query, so that qualifier binds
 * to the first alternative only and the others match every repository (#1173).
 * Grouping the caller's text in parentheses keeps all of it inside the repo.
 */
export function scopeSearch(search: string): string {
  if (!/(^|\s)OR(\s|$)/.test(search)) return search;
  const text = search.trim();
  return isFullyGrouped(text) ? text : `(${text})`;
}

/** True when the text is one parenthesised group: "(a OR b)", not "(a) OR (b)". */
function isFullyGrouped(text: string): boolean {
  if (!text.startsWith("(") || !text.endsWith(")")) return false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
    if (depth === 0 && i < text.length - 1) return false;
  }
  return depth === 0;
}

/** Lower-cased OWNER/REPO of an issue or pull request URL. */
export function repoOfUrl(url: string): string | undefined {
  const m = url.match(/^https?:\/\/[^/]+\/([^/]+\/[^/]+)\/(?:issues|pull)\/\d+/);
  return m?.[1].toLowerCase();
}

/**
 * Backstop for searches the parentheses do not cover: drops results from other
 * repositories, since a list tool is scoped to one. The target is `repo` when
 * given; otherwise it is looked up, and only when the results span more than
 * one repository, so an ordinary listing costs no extra call.
 */
export async function keepTargetRepo<T extends { url?: string }>(
  items: T[],
  repo: string | undefined,
  cwd: string,
): Promise<{ items: T[]; excluded: number }> {
  const seen = new Set(items.map((i) => (i.url ? repoOfUrl(i.url) : undefined)).filter(Boolean));
  if (seen.size === 0 || (seen.size === 1 && !repo)) return { items, excluded: 0 };

  // --repo accepts [HOST/]OWNER/REPO; compare on OWNER/REPO.
  let target = repo?.toLowerCase().split("/").slice(-2).join("/");
  if (!target) {
    const view = await ghCmd(
      ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
      cwd,
    );
    if (!view || view.exitCode !== 0 || !view.stdout.trim()) return { items, excluded: 0 };
    target = view.stdout.trim().toLowerCase();
  }

  const kept = items.filter((i) => !i.url || repoOfUrl(i.url) === target);
  return { items: kept, excluded: items.length - kept.length };
}
