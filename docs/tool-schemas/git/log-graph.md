# git > log-graph

Returns visual branch topology as structured data. Wraps `git log --graph --oneline --decorate`.

**Command**: `git log --graph --oneline --decorate [--all] [--max-count=N] [<ref>]`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `path`     | string  | cwd     | Repository path                                            |
| `maxCount` | number  | `20`    | Number of commits to return                                |
| `ref`      | string  | --      | Branch, tag, or commit to start from                       |
| `all`      | boolean | `false` | Show all branches (`--all`)                                |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
* a1b2c3d (HEAD -> main, origin/main) Update dependencies
* b2c3d4e Add retry logic to HTTP client
*   c3d4e5f Merge branch 'feature/auth'
|\
| * d4e5f6a Implement token refresh
| * e5f6a7b Add auth middleware
|/
* f6a7b8c Initial project setup
```

</td>
<td>

~120 tokens

```json
{
  "commits": [
    {
      "graph": "*",
      "hashShort": "a1b2c3d",
      "message": "Update dependencies",
      "refs": "HEAD -> main, origin/main"
    },
    { "graph": "*", "hashShort": "b2c3d4e", "message": "Add retry logic to HTTP client" },
    { "graph": "*  ", "hashShort": "c3d4e5f", "message": "Merge branch 'feature/auth'" },
    { "graph": "| *", "hashShort": "d4e5f6a", "message": "Implement token refresh" },
    { "graph": "| *", "hashShort": "e5f6a7b", "message": "Add auth middleware" },
    { "graph": "*", "hashShort": "f6a7b8c", "message": "Initial project setup" }
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
  "commits": [
    "* a1b2c3d (HEAD -> main, origin/main) Update dependencies",
    "* b2c3d4e Add retry logic to HTTP client",
    "*   c3d4e5f Merge branch 'feature/auth'",
    "| * d4e5f6a Implement token refresh",
    "| * e5f6a7b Add auth middleware",
    "* f6a7b8c Initial project setup"
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
| 6 commits  | ~150       | ~120      | ~60          | 20-60%  |
| 20 commits | ~500       | ~400      | ~200         | 20-60%  |
| 50 commits | ~1200      | ~950      | ~450         | 20-63%  |

## Notes

- Each commit entry preserves the `graph` string (ASCII branch artwork like `*`, `| *`, `|\`) for topology visualization
- The `refs` field is only present on decorated commits (branches, tags, HEAD)
- Compact mode collapses each commit into a single string combining graph, hash, refs, and message
- The `--all` flag shows commits from all branches, not just the current one
- The `total` field reflects the actual number of commits returned (may be less than `maxCount` if the history is shorter)
