# github > pr-view

Views a pull request by number. Returns structured data with state, checks, review decision, and diff stats.

**Command**: `gh pr view 123 --json number,state,title,body,mergeable,reviewDecision,statusCheckRollup,url,headRefName,baseRefName,additions,deletions,changedFiles`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `number`        | string  | —       | Pull request number, URL, or branch name                   |
| `path`          | string  | cwd     | Repository path                                            |
| `maxBodyLength` | number  | `4000`  | Character cap on `body`; `0` returns the body verbatim     |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
Merge pull request #42
feat: add dark mode support

Open • user:feature/dark-mode wants to merge into main

Labels: enhancement
Reviewers: alice (Approved)

Checks passing
  build (ubuntu): ✓ pass
  lint: ✓ pass
  test: ✓ pass

+125 -30, 8 files changed
https://github.com/owner/repo/pull/42
```

</td>
<td>

~100 tokens

```json
{
  "number": 42,
  "state": "OPEN",
  "title": "feat: add dark mode support",
  "body": "Adds dark mode toggle with system preference detection.",
  "mergeable": "MERGEABLE",
  "reviewDecision": "APPROVED",
  "checks": [
    { "name": "build (ubuntu)", "status": "COMPLETED", "conclusion": "SUCCESS" },
    { "name": "lint", "status": "COMPLETED", "conclusion": "SUCCESS" },
    { "name": "test", "status": "COMPLETED", "conclusion": "SUCCESS" }
  ],
  "url": "https://github.com/owner/repo/pull/42",
  "headBranch": "feature/dark-mode",
  "baseBranch": "main",
  "additions": 125,
  "deletions": 30,
  "changedFiles": 8
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~55 tokens

```json
{
  "number": 42,
  "state": "OPEN",
  "title": "feat: add dark mode support",
  "mergeable": "MERGEABLE",
  "reviewDecision": "APPROVED",
  "url": "https://github.com/owner/repo/pull/42",
  "headBranch": "feature/dark-mode",
  "baseBranch": "main",
  "additions": 125,
  "deletions": 30,
  "changedFiles": 8,
  "checksTotal": 3
}
```

</td>
</tr>
</table>

## Error — PR Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~25 tokens

```
GraphQL: Could not resolve to a PullRequest with the number of 9999.
```

</td>
<td>

~20 tokens

```json
{
  "error": "gh pr view failed: GraphQL: Could not resolve to a PullRequest with the number of 9999."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| PR with body | ~250       | ~100      | ~55          | 60-78%  |
| PR not found | ~25        | ~20       | ~20          | 20%     |

## Body truncation (issue #1067)

Dependabot and release-note PR bodies routinely run past 30k characters, almost all of it inside
collapsed `<details>` blocks. In full-schema mode `body` is therefore shortened in two steps:

1. Every `<details>…</details>` block is collapsed to its `<summary>` text plus a ` […]` marker
   (nested blocks innermost-first). This alone removes ~95% of a Dependabot body.
2. What remains is capped at `maxBodyLength` characters (default `4000`).

When anything was removed the payload carries `bodyTruncated: true` and `bodyLength` (the original
character count), and the human-readable text adds a `body truncated …` line:

```json
{
  "number": 1064,
  "title": "chore(deps): bump foo from 1.0.0 to 2.0.0",
  "body": "Bumps [foo](…) from 1.0.0 to 2.0.0.\nRelease notes […]\nCommits […]",
  "bodyTruncated": true,
  "bodyLength": 31842
}
```

Pass `maxBodyLength: 0` to disable both the collapse and the cap and get the body exactly as GitHub
returned it. Oversized `reviews[].body` values are collapsed and capped the same way and flagged
per-review with `bodyTruncated`.

## Notes

- The `body` field is included in full mode but omitted in compact mode
- Individual check details are included in full mode; compact mode reports only `checksTotal`
- `mergeable` can be `MERGEABLE`, `CONFLICTING`, or `UNKNOWN`
- `reviewDecision` can be `APPROVED`, `CHANGES_REQUESTED`, `REVIEW_REQUIRED`, or empty
