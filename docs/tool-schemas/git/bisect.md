# git > bisect

Binary search for the commit that introduced a bug. Supports start, good, bad, reset, and status actions. Returns structured data with action taken, current commit, remaining steps estimate, and result when the culprit is found.

**Command**: `git bisect <start|good|bad|reset|log>`

## Input Parameters

| Parameter | Type   | Default | Description                                              |
| --------- | ------ | ------- | -------------------------------------------------------- |
| `path`    | string | cwd     | Repository path                                          |
| `action`  | enum   | --      | Bisect action: `start`, `good`, `bad`, `reset`, `status` |
| `bad`     | string | --      | Bad commit ref (used with start action)                  |
| `good`    | string | --      | Good commit ref (used with start action)                 |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Bisecting: 3 revisions left to test after this (roughly 2 steps)
[a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2] Fix validation logic
```

</td>
<td>

~50 tokens

```json
{
  "action": "start",
  "current": "a1b2c3d",
  "remaining": 2,
  "message": "Bisecting: 3 revisions left to test after this (roughly 2 steps)"
}
```

</td>
</tr>
<tr>
<td><strong>Found</strong></td>
<td>

~120 tokens

```
a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 is the first bad commit
commit a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
Author: Alice <alice@example.com>
Date:   Tue Feb 10 14:30:00 2026 +0000

    Introduce regression in parser
```

</td>
<td>

~70 tokens

```json
{
  "action": "bad",
  "current": "a1b2c3d",
  "result": {
    "hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "message": "Introduce regression in parser",
    "author": "Alice",
    "date": "2026-02-10T14:30:00.000Z"
  },
  "message": "a1b2c3d is the first bad commit"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Savings |
| -------------- | ---------- | --------- | ------- |
| Bisect step    | ~80        | ~50       | 35-40%  |
| Found culprit  | ~120       | ~70       | 40-45%  |
| Reset / Status | ~40        | ~25       | 35-40%  |

## Notes

- The `start` action requires both `bad` and `good` parameters; an error is thrown if either is missing
- When the culprit commit is found, the `result` object is populated with hash, message, author, and date
- The `remaining` field estimates how many bisect steps are left
- The `status` action internally runs `git bisect log` to show the current bisect session state
- If `bisect start` partially fails (e.g., bad ref is invalid), the session is automatically reset to avoid leaving the repo in a broken bisect state
- Bisect does not support compact mode since responses are already small
