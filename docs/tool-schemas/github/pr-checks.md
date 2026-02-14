# github > pr-checks

Lists check/status results for a pull request. Returns structured data with check names, states, conclusions, and summary counts.

**Command**: `gh pr checks 42 --json name,state,bucket,description,event,workflow,link,startedAt,completedAt`

## Input Parameters

| Parameter | Type    | Default      | Description                                                |
| --------- | ------- | ------------ | ---------------------------------------------------------- |
| `pr`      | number  | —            | Pull request number                                        |
| `repo`    | string  | current repo | Repository in OWNER/REPO format                            |
| `compact` | boolean | `true`       | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
Some checks were not successful
1 failing, 2 successful, and 0 pending checks

  ✓  build (ubuntu)    12s  https://github.com/owner/repo/actions/runs/111/job/222
  ✓  lint              5s   https://github.com/owner/repo/actions/runs/111/job/333
  ✗  test              18s  https://github.com/owner/repo/actions/runs/111/job/444
```

</td>
<td>

~120 tokens

```json
{
  "pr": 42,
  "checks": [
    {
      "name": "build (ubuntu)",
      "state": "SUCCESS",
      "bucket": "pass",
      "description": "",
      "event": "pull_request",
      "workflow": "CI",
      "link": "https://github.com/owner/repo/actions/runs/111/job/222",
      "startedAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:00:12Z"
    },
    {
      "name": "lint",
      "state": "SUCCESS",
      "bucket": "pass",
      "description": "",
      "event": "pull_request",
      "workflow": "CI",
      "link": "https://github.com/owner/repo/actions/runs/111/job/333",
      "startedAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:00:05Z"
    },
    {
      "name": "test",
      "state": "FAILURE",
      "bucket": "fail",
      "description": "",
      "event": "pull_request",
      "workflow": "CI",
      "link": "https://github.com/owner/repo/actions/runs/111/job/444",
      "startedAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:00:18Z"
    }
  ],
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "pending": 0,
    "skipped": 0,
    "cancelled": 0
  }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "pr": 42,
  "total": 3,
  "passed": 2,
  "failed": 1,
  "pending": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| 3 checks, 1 fail | ~200       | ~120      | ~25          | 40-88%  |
| All passing       | ~150       | ~100      | ~25          | 33-83%  |

## Notes

- Compact mode returns only the summary counts (`pr`, `total`, `passed`, `failed`, `pending`), dropping individual check details
- The `bucket` field classifies checks as `pass`, `fail`, `pending`, `skipping`, or `cancel`
- The `repo` parameter allows checking PRs in other repositories without being in that repo's working directory
