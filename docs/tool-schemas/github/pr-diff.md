# github > pr-diff

Returns file-level diff statistics for a pull request. Optionally includes full patch content.

**Command**: `gh pr diff 42`

## Input Parameters

| Parameter | Type    | Default      | Description                                                |
| --------- | ------- | ------------ | ---------------------------------------------------------- |
| `pr`      | number  | —            | Pull request number                                        |
| `repo`    | string  | current repo | Repository in OWNER/REPO format                            |
| `full`    | boolean | `false`      | Include full patch content in chunks                       |
| `compact` | boolean | `true`       | Auto-compact when structured output exceeds raw CLI tokens |

## Success

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
diff --git a/src/theme.ts b/src/theme.ts
new file mode 100644
--- /dev/null
+++ b/src/theme.ts
@@ -0,0 +1,25 @@
+export const darkTheme = {
+  background: '#1a1a1a',
+  text: '#ffffff',
+};
...

diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,3 +10,5 @@
 import { config } from './config';
+import { darkTheme } from './theme';
+
...
```

</td>
<td>

~60 tokens

```json
{
  "files": [
    { "file": "src/theme.ts", "status": "added", "additions": 25, "deletions": 0 },
    { "file": "src/app.ts", "status": "modified", "additions": 12, "deletions": 3 },
    { "file": "src/styles.css", "status": "modified", "additions": 40, "deletions": 10 }
  ],
  "totalAdditions": 77,
  "totalDeletions": 13,
  "totalFiles": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~50 tokens

```json
{
  "files": [
    { "file": "src/theme.ts", "status": "added", "additions": 25, "deletions": 0 },
    { "file": "src/app.ts", "status": "modified", "additions": 12, "deletions": 3 },
    { "file": "src/styles.css", "status": "modified", "additions": 40, "deletions": 10 }
  ],
  "totalFiles": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 3 files changed | ~400       | ~60       | ~50          | 85-88%  |
| Large PR (20+)  | ~2000+     | ~250      | ~200         | 88-90%  |

## Notes

- Without `full: true`, only file-level stats are returned (no patch content)
- With `full: true`, each file includes a `chunks` array with `header` and `lines` for each hunk
- File status is inferred from diff headers: `added`, `modified`, `deleted`, `renamed`, or `copied`
- Renamed files include an `oldFile` field
- Compact mode drops `totalAdditions` and `totalDeletions`, keeping file-level stats and `totalFiles`
