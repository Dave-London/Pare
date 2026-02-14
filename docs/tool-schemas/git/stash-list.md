# git > stash-list

Lists all stash entries with index, message, and date. Returns structured stash data.

**Command**: `git stash list --format='%gd\t%gs\t%ci'`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Repository path                                            |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
stash@{0}: WIP on main: abc1234 feat: add auth
stash@{1}: On feature/api: work in progress
stash@{2}: WIP on main: def5678 fix: resolve bug
```

</td>
<td>

~70 tokens

```json
{
  "stashes": [
    {
      "index": 0,
      "message": "WIP on main: abc1234 feat: add auth",
      "date": "2026-02-14 10:30:00 +0000"
    },
    {
      "index": 1,
      "message": "On feature/api: work in progress",
      "date": "2026-02-13 15:00:00 +0000"
    },
    {
      "index": 2,
      "message": "WIP on main: def5678 fix: resolve bug",
      "date": "2026-02-12 09:00:00 +0000"
    }
  ],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~45 tokens

```json
{
  "stashes": [
    "stash@{0}: WIP on main: abc1234 feat: add auth",
    "stash@{1}: On feature/api: work in progress",
    "stash@{2}: WIP on main: def5678 fix: resolve bug"
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario  | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------- | ---------- | --------- | ------------ | ------- |
| 3 stashes | ~80        | ~70       | ~45          | 13-44%  |

## Notes

- Compact mode flattens each stash entry into a `stash@{N}: message` string, dropping the `date`
- Returns an empty `stashes` array (with `total: 0`) when no stashes exist
- The stash index is parsed from the `%gd` format specifier (e.g., `stash@{0}`)
