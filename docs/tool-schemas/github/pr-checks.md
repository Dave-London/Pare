# github > pr-checks

Lists check/status results for a pull request. Returns structured data with check names, states, conclusions, and summary counts.

**Command**: `gh pr checks 42 --json name,state,bucket,description,event,workflow,link,startedAt,completedAt`

## Input Parameters

| Parameter      | Type    | Default      | Description                                                  |
| -------------- | ------- | ------------ | ------------------------------------------------------------ |
| `number`       | string  | —            | Pull request number, URL, or branch name                     |
| `repo`         | string  | current repo | Repository in OWNER/REPO format                              |
| `watch`        | boolean | `false`      | Poll until checks appear **and** all complete                |
| `interval`     | number  | `10`         | Poll interval in seconds when `watch: true` (min 5, max 300) |
| `watchTimeout` | number  | `600`        | Wall-clock timeout in seconds for the watch loop (max 3600)  |
| `required`     | boolean | `false`      | Filter to required checks only                               |
| `compact`      | boolean | `true`       | Auto-compact when structured output exceeds raw CLI tokens   |

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

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| 3 checks, 1 fail | ~200       | ~120      | ~25          | 40-88%  |
| All passing      | ~150       | ~100      | ~25          | 33-83%  |

## `conclusion` — the field to branch on

| Value       | Meaning                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `passed`    | At least one check exists, all are terminal, none failed or were cancelled   |
| `failed`    | At least one check failed or was cancelled                                   |
| `pending`   | At least one check is still queued or running                                |
| `none`      | GitHub reports **zero** checks on this PR                                    |
| `timed_out` | `watch: true` hit `watchTimeout` with checks still pending — or still absent |

**Invariant (issue #1077): `conclusion === "passed"` implies `checks.length > 0` and all of them
succeeded.** A freshly pushed PR whose check runs GitHub has not registered yet returns `none`, never
`passed`, so a merge gate cannot mistake "CI has not started" for "CI is green".

```json
{
  "pr": 1076,
  "checks": [],
  "summary": { "total": 0, "passed": 0, "failed": 0, "pending": 0, "skipped": 0, "cancelled": 0 },
  "conclusion": "none",
  "errorType": "no-checks",
  "errorMessage": "no checks reported on the 'fix/example' branch"
}
```

## Watch behaviour

With `watch: true` the wrapper polls `gh pr checks --json …` itself (gh rejects its native `--watch`
alongside `--json`) until **checks exist and all of them are terminal**, or `watchTimeout` elapses:

- Zero checks does **not** end the loop — polling continues so the watch survives the race between
  pushing and GitHub creating the check runs.
- gh's "no checks reported" exit is treated as "nothing has started yet", not as a hard failure.
- Short settle grace: while gh itself still exits `8` ("pending") within the first 30 seconds, a
  checks array that merely _looks_ terminal does not end the loop either.
- On timeout the tool returns the latest snapshot with `timedOut: true`,
  `conclusion: "timed_out"` and `errorType: "watch-timeout"` rather than throwing.

## Notes

- Compact mode returns only the summary counts (`pr`, `total`, `passed`, `failed`, `pending`), dropping individual check details
- The `bucket` field classifies checks as `pass`, `fail`, `pending`, `skipping`, or `cancel`
- `errorType` is one of `not-found`, `permission-denied`, `in-progress`, `no-checks`, `watch-timeout`, `unknown`
- The `repo` parameter allows checking PRs in other repositories without being in that repo's working directory
