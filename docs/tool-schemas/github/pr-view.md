# github > pr-view

Views a pull request by number. Returns structured data with state, checks, review decision, and diff stats.

**Command**: `gh pr view 123 --json number,state,title,body,mergeable,reviewDecision,statusCheckRollup,url,headRefName,baseRefName,additions,deletions,changedFiles`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `number`  | number  | —       | Pull request number                                        |
| `path`    | string  | cwd     | Repository path                                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

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

## Notes

- The `body` field is included in full mode but omitted in compact mode
- Individual check details are included in full mode; compact mode reports only `checksTotal`
- `mergeable` can be `MERGEABLE`, `CONFLICTING`, or `UNKNOWN`
- `reviewDecision` can be `APPROVED`, `CHANGES_REQUESTED`, `REVIEW_REQUIRED`, or empty
