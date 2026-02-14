# lint > biome-format

Formats files with Biome (`format --write`) and returns a structured list of changed files.

**Command**: `biome format --write .`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `patterns` | string[] | `["."]` | File patterns to format                                    |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Files Already Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
Formatted 8 files in 45ms. Fixed 0 files.
```

</td>
<td>

~15 tokens

```json
{
  "filesChanged": 0,
  "files": [],
  "success": true
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when no files changed).

</td>
</tr>
</table>

## Success — Files Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
src/index.ts
src/utils.ts
src/components/App.tsx
Formatted 10 files in 60ms. Fixed 3 files.
```

</td>
<td>

~30 tokens

```json
{
  "filesChanged": 3,
  "files": ["src/index.ts", "src/utils.ts", "src/components/App.tsx"],
  "success": true
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "success": true,
  "filesChanged": 3
}
```

</td>
</tr>
</table>

## Error — Biome Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: biome: command not found
```

</td>
<td>

~15 tokens

```json
{
  "filesChanged": 0,
  "files": [],
  "success": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Already formatted | ~40        | ~15       | ~15          | 63%     |
| 3 files formatted | ~80        | ~30       | ~10          | 63-88%  |
| Biome not found   | ~30        | ~15       | ~15          | 50%     |

## Notes

- Biome `format --write` modifies files in place and outputs file paths for changed files
- Summary lines starting with `Formatted `, `Fixed `, or `Checked ` are filtered out; remaining lines ending with a file extension are captured as changed files
- Compact mode drops the `files` array, keeping only `success` and `filesChanged`
- Input patterns are validated against flag injection
