# git > log

Returns commit history as structured data.

**Command**: `git log --format=<custom> --max-count=N`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `path`     | string  | cwd     | Repository path                                            |
| `maxCount` | number  | `10`    | Number of commits to return                                |
| `ref`      | string  | --      | Branch, tag, or commit to start from                       |
| `author`   | string  | --      | Filter by author name or email                             |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
commit e5955b4a1c (HEAD -> main, origin/main)
Author: Alice <alice@example.com>
Date:   2 days ago

    docs: update roadmap for v0.8.0

commit b22708d3f7
Author: Bob <bob@example.com>
Date:   3 days ago

    feat: rebrand for MCP Registry

commit 4d22223e91
Author: Alice <alice@example.com>
Date:   4 days ago

    feat(git): add rebase tool
```

</td>
<td>

~120 tokens

```json
{
  "commits": [
    {
      "hash": "e5955b4a1c3d...",
      "hashShort": "e5955b4",
      "author": "Alice <alice@example.com>",
      "date": "2 days ago",
      "message": "docs: update roadmap for v0.8.0",
      "refs": "HEAD -> main, origin/main"
    },
    {
      "hash": "b22708d3f7a2...",
      "hashShort": "b22708d",
      "author": "Bob <bob@example.com>",
      "date": "3 days ago",
      "message": "feat: rebrand for MCP Registry"
    },
    {
      "hash": "4d22223e91b5...",
      "hashShort": "4d22223",
      "author": "Alice <alice@example.com>",
      "date": "4 days ago",
      "message": "feat(git): add rebase tool"
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

~55 tokens

```json
{
  "commits": [
    { "hashShort": "e5955b4", "message": "docs: update roadmap for v0.8.0", "refs": "HEAD -> main, origin/main" },
    { "hashShort": "b22708d", "message": "feat: rebrand for MCP Registry" },
    { "hashShort": "4d22223", "message": "feat(git): add rebase tool" }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 3 commits       | ~250       | ~120      | ~55          | 52-78%  |
| 10 commits      | ~800       | ~400      | ~170         | 50-79%  |

## Notes

- Compact mode drops `hash`, `author`, and `date`, keeping only `hashShort`, `message`, and `refs` (when present)
- The `ref` parameter accepts branches, tags, or commit hashes
- The `author` filter is passed directly to `git log --author=`
- Refs decoration (branch/tag labels) is only included when present on a commit
