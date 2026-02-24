# deno > fmt

Runs `deno fmt` to check or write code formatting. Returns structured list of affected files.

**Command**: `deno fmt [--check]`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `files`   | string[] | —       | Files or directories to format (default: current directory) |
| `path`    | string   | cwd     | Project root path                                          |
| `check`   | boolean  | `true`  | Check formatting without writing (--check). Defaults to true. |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Files Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ deno fmt --check
Checked 12 files
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "mode": "check",
  "total": 12
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
  "success": true,
  "mode": "check",
  "total": 12
}
```

</td>
</tr>
</table>

## Error — Formatting Issues Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ deno fmt --check
error: Found 3 not formatted files in 12 files
src/main.ts
src/utils.ts
src/config.ts
```

</td>
<td>

~40 tokens

```json
{
  "success": false,
  "mode": "check",
  "files": ["src/main.ts", "src/utils.ts", "src/config.ts"],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "success": false,
  "mode": "check",
  "total": 3
}
```

</td>
</tr>
</table>

## Success — Files Written

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ deno fmt
src/main.ts
src/utils.ts
src/config.ts
Formatted 3 files
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "mode": "write",
  "files": ["src/main.ts", "src/utils.ts", "src/config.ts"],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "success": true,
  "mode": "write",
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Check passes       | ~20        | ~20       | ~20          | 0%      |
| Check finds issues | ~80        | ~40       | ~15          | 50-81%  |
| Write mode         | ~50        | ~40       | ~15          | 20-70%  |

## Notes

- The `check` parameter defaults to `true` for safety; set to `false` to actually write formatted files
- The `mode` field in the response is `"check"` or `"write"` to indicate which operation was performed
- The `files` array lists affected files (unformatted in check mode, formatted in write mode)
- `files` is omitted when empty (all files already formatted)
- Compact mode drops the `files` array, keeping only `success`, `mode`, and `total`
