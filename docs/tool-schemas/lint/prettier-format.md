# lint > prettier-format

Formats files with Prettier (`--write`) and returns a structured list of changed files.

**Command**: `prettier --write .`

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

~30 tokens

```
All matched files use Prettier code style!
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
src/index.ts 85ms
src/utils.ts 12ms
src/components/App.tsx 23ms
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

## Error — Prettier Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: prettier: command not found
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

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Already formatted  | ~30        | ~15       | ~15          | 50%     |
| 3 files formatted  | ~80        | ~30       | ~10          | 63-88%  |
| Prettier not found | ~30        | ~15       | ~15          | 50%     |

## Notes

- Prettier `--write` modifies files in place and outputs processed file paths to stdout
- Lines starting with `[`, `Checking`, or `All ` are filtered out as non-file-path lines
- Compact mode drops the `files` array, keeping only `success` and `filesChanged`
- Input patterns are validated against flag injection
