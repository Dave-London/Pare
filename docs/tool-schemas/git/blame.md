# git > blame

Shows commit annotations for a file, grouped by commit. Returns structured blame data with deduplicated commit metadata and their attributed lines.

**Command**: `git blame --porcelain [-L<start>,<end>] -- <file>`

## Input Parameters

| Parameter   | Type    | Default | Description                                                |
| ----------- | ------- | ------- | ---------------------------------------------------------- |
| `path`      | string  | cwd     | Repository path                                            |
| `file`      | string  | --      | File path to blame                                         |
| `startLine` | number  | --      | Start line number for blame range                          |
| `endLine`   | number  | --      | End line number for blame range                            |
| `compact`   | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
abc12345 (Alice 2026-02-10 14:30:00 +0000  1) import { z } from "zod";
abc12345 (Alice 2026-02-10 14:30:00 +0000  2)
def56789 (Bob   2026-02-12 09:00:00 +0000  3) export const Schema = z.object({
def56789 (Bob   2026-02-12 09:00:00 +0000  4)   name: z.string(),
def56789 (Bob   2026-02-12 09:00:00 +0000  5)   value: z.number(),
abc12345 (Alice 2026-02-10 14:30:00 +0000  6) });
```

</td>
<td>

~120 tokens

```json
{
  "commits": [
    {
      "hash": "abc12345",
      "author": "Alice",
      "date": "2026-02-10T14:30:00.000Z",
      "lines": [
        { "lineNumber": 1, "content": "import { z } from \"zod\";" },
        { "lineNumber": 2, "content": "" },
        { "lineNumber": 6, "content": "});" }
      ]
    },
    {
      "hash": "def56789",
      "author": "Bob",
      "date": "2026-02-12T09:00:00.000Z",
      "lines": [
        { "lineNumber": 3, "content": "export const Schema = z.object({" },
        { "lineNumber": 4, "content": "  name: z.string()," },
        { "lineNumber": 5, "content": "  value: z.number()," }
      ]
    }
  ],
  "file": "src/schemas/index.ts",
  "totalLines": 6
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "commits": [
    { "hash": "abc12345", "lines": [1, 2, 6] },
    { "hash": "def56789", "lines": [3, 4, 5] }
  ],
  "file": "src/schemas/index.ts",
  "totalLines": 6
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 6 lines        | ~200       | ~120      | ~35          | 40-83%  |
| 100 lines      | ~3000      | ~1500     | ~150         | 50-95%  |

## Notes

- Commits are deduplicated: each commit hash appears once with all its attributed lines grouped together
- Compact mode drops `author`, `date`, and line `content`, keeping only `hash` and line numbers
- Compact mode also compresses consecutive line numbers into ranges in the human-readable output (e.g., "lines 1-3, 6")
- Line range filtering (`startLine`/`endLine`) maps to git's `-L` flag
- File path resolution handles case sensitivity on Windows
