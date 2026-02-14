# git > show

Shows commit details and diff statistics for a given ref.

**Command**: `git show --no-patch --format=<custom> <ref>` + `git show --numstat --format= <ref>`

## Input Parameters

| Parameter | Type    | Default  | Description                                                |
| --------- | ------- | -------- | ---------------------------------------------------------- |
| `path`    | string  | cwd      | Repository path                                            |
| `ref`     | string  | `"HEAD"` | Commit hash, branch, or tag                                |
| `compact` | boolean | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
commit abc1234def5678901234567890abcdef12345678
Author: Alice <alice@example.com>
Date:   2 days ago

    feat: add user authentication

 src/auth.ts   | 45 +++++++++++++++++++++++++++++++++++++++++++++
 src/index.ts  |  3 ++-
 tests/auth.test.ts | 32 ++++++++++++++++++++++++++++++++
 3 files changed, 79 insertions(+), 1 deletion(-)
```

</td>
<td>

~100 tokens

```json
{
  "hash": "abc1234def5678901234567890abcdef12345678",
  "hashShort": "abc1234",
  "author": "Alice <alice@example.com>",
  "date": "2 days ago",
  "message": "feat: add user authentication",
  "diff": {
    "files": [
      { "file": "src/auth.ts", "status": "added", "additions": 45, "deletions": 0 },
      { "file": "src/index.ts", "status": "modified", "additions": 2, "deletions": 1 },
      { "file": "tests/auth.test.ts", "status": "added", "additions": 32, "deletions": 0 }
    ],
    "totalAdditions": 79,
    "totalDeletions": 1,
    "totalFiles": 3
  }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "hashShort": "abc1234",
  "message": "feat: add user authentication"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| Commit with 3 files | ~300       | ~100      | ~20          | 67-93%  |

## Notes

- Two git commands run internally: one for commit metadata, one for numstat diff
- Compact mode drops everything except `hashShort` and the first line of the commit message
- The `diff` field contains the same structure as the `diff` tool output
