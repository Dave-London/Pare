# git > diff

Returns file-level diff statistics as structured data. Optionally includes full patch content.

**Command**: `git diff --numstat` (and `git diff` for full patch when `full=true`)

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Repository path                                            |
| `staged`  | boolean | `false` | Show staged changes (`--cached`)                           |
| `ref`     | string  | --      | Compare against a specific ref (branch, tag, commit)       |
| `file`    | string  | --      | Limit diff to a specific file                              |
| `full`    | boolean | `false` | Include full patch content in chunks                       |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Unstaged Changes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
diff --git a/src/index.ts b/src/index.ts
index abc1234..def5678 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,6 +10,8 @@ export function main() {
   const config = loadConfig();
+  const logger = createLogger();
+  logger.info("Starting...");
   return run(config);
 }

diff --git a/src/utils.ts b/src/utils.ts
index 111aaaa..222bbbb 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -5,7 +5,6 @@ export function formatDate(d: Date) {
-  return d.toISOString();
+  return d.toLocaleDateString();
 }
```

</td>
<td>

~60 tokens

```json
{
  "files": [
    { "file": "src/index.ts", "status": "modified", "additions": 2, "deletions": 0 },
    { "file": "src/utils.ts", "status": "modified", "additions": 1, "deletions": 1 }
  ],
  "totalAdditions": 3,
  "totalDeletions": 1,
  "totalFiles": 2
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
    { "file": "src/index.ts", "status": "modified", "additions": 2, "deletions": 0 },
    { "file": "src/utils.ts", "status": "modified", "additions": 1, "deletions": 1 }
  ],
  "totalFiles": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| 2 files, small changes | ~350       | ~60       | ~50          | 83-86%  |
| 10 files, large diff   | ~2000      | ~200      | ~160         | 90-92%  |

## Notes

- By default, only numstat summaries are returned (additions/deletions per file)
- Set `full=true` to include per-file patch chunks with header and diff lines
- Compact mode drops `totalAdditions` and `totalDeletions`, keeping per-file stats and `totalFiles`
- Renames are detected and include an `oldFile` field
- File path resolution handles case sensitivity on Windows
