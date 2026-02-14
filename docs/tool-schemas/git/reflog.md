# git > reflog

Returns reference log entries as structured data, useful for recovery operations.

**Command**: `git reflog show --format=<format> [--max-count=N] [<ref>]`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `path`     | string  | cwd     | Repository path                                            |
| `maxCount` | number  | `20`    | Number of entries to return                                |
| `ref`      | string  | HEAD    | Which ref to show                                          |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
a1b2c3d HEAD@{0}: commit: Update dependencies
b2c3d4e HEAD@{1}: pull origin main: Fast-forward
c3d4e5f HEAD@{2}: checkout: moving from feature/auth to main
d4e5f6a HEAD@{3}: commit: Implement token refresh
e5f6a7b HEAD@{4}: commit: Add auth middleware
f6a7b8c HEAD@{5}: checkout: moving from main to feature/auth
```

</td>
<td>

~200 tokens

```json
{
  "entries": [
    {
      "hash": "a1b2c3d4e5f6...",
      "shortHash": "a1b2c3d",
      "selector": "HEAD@{0}",
      "action": "commit",
      "description": "Update dependencies",
      "date": "2026-02-14 10:30:00 +0000"
    },
    {
      "hash": "b2c3d4e5f6a7...",
      "shortHash": "b2c3d4e",
      "selector": "HEAD@{1}",
      "action": "pull",
      "description": "origin main: Fast-forward",
      "date": "2026-02-14 09:15:00 +0000"
    },
    {
      "hash": "c3d4e5f6a7b8...",
      "shortHash": "c3d4e5f",
      "selector": "HEAD@{2}",
      "action": "checkout",
      "description": "moving from feature/auth to main",
      "date": "2026-02-13 17:00:00 +0000"
    },
    {
      "hash": "d4e5f6a7b8c9...",
      "shortHash": "d4e5f6a",
      "selector": "HEAD@{3}",
      "action": "commit",
      "description": "Implement token refresh",
      "date": "2026-02-13 16:45:00 +0000"
    },
    {
      "hash": "e5f6a7b8c9d0...",
      "shortHash": "e5f6a7b",
      "selector": "HEAD@{4}",
      "action": "commit",
      "description": "Add auth middleware",
      "date": "2026-02-13 15:30:00 +0000"
    },
    {
      "hash": "f6a7b8c9d0e1...",
      "shortHash": "f6a7b8c",
      "selector": "HEAD@{5}",
      "action": "checkout",
      "description": "moving from main to feature/auth",
      "date": "2026-02-13 14:00:00 +0000"
    }
  ],
  "total": 6
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~60 tokens

```json
{
  "entries": [
    "a1b2c3d HEAD@{0} commit: Update dependencies",
    "b2c3d4e HEAD@{1} pull: origin main: Fast-forward",
    "c3d4e5f HEAD@{2} checkout: moving from feature/auth to main",
    "d4e5f6a HEAD@{3} commit: Implement token refresh",
    "e5f6a7b HEAD@{4} commit: Add auth middleware",
    "f6a7b8c HEAD@{5} checkout: moving from main to feature/auth"
  ],
  "total": 6
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------- | ---------- | --------- | ------------ | ------- |
| 6 entries  | ~180       | ~200      | ~60          | 0-67%   |
| 20 entries | ~600       | ~650      | ~200         | 0-67%   |
| 50 entries | ~1500      | ~1600     | ~500         | 0-67%   |

## Notes

- Full mode includes the complete hash, short hash, selector, action, description, and date for each entry
- Full mode may slightly exceed CLI token count due to structured field names, but compact mode provides significant savings
- Compact mode collapses each entry into a single string with short hash, selector, action, and description
- The `ref` parameter allows viewing reflogs for specific branches (e.g., `main`, `feature/auth`) instead of HEAD
- The internal format string `%H\t%h\t%gd\t%gs\t%ci` extracts structured fields directly from git
- Useful for recovering lost commits, understanding branch movements, and debugging rebase/reset operations
