# python > ruff-format

Runs ruff format and returns structured results with file change counts and changed file list.

**Command**: `ruff format <patterns>` / `ruff format --check <patterns>`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `patterns` | string[] | `["."]` | Files or directories to format                             |
| `check`    | boolean  | `false` | Check mode (report without modifying files)                |
| `path`     | string   | cwd     | Project root path                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- All Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
12 files left unchanged
```

</td>
<td>

~10 tokens

```json
{
  "success": true,
  "filesChanged": 0
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

## Success -- Files Reformatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
reformatted: src/api/views.py
reformatted: src/utils/helpers.py
2 files reformatted, 10 files left unchanged
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "filesChanged": 2,
  "files": [
    "src/api/views.py",
    "src/utils/helpers.py"
  ]
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
  "filesChanged": 2
}
```

</td>
</tr>
</table>

## Check Mode -- Would Reformat

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
Would reformat: src/api/views.py
Would reformat: src/utils/helpers.py
2 files would be reformatted, 10 files left unchanged
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "filesChanged": 2,
  "files": [
    "src/api/views.py",
    "src/utils/helpers.py"
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| All formatted   | ~10        | ~10       | ~10          | 0%      |
| 2 reformatted   | ~40        | ~25       | ~10          | 38-75%  |
| Check mode (2)  | ~40        | ~25       | ~10          | 38-75%  |

## Notes

- Ruff format writes file-level output to stderr; the parser handles both stdout and stderr
- In check mode (`--check`), `success` is `false` when files would be reformatted
- The `files` array is only present when there are changed files; it is omitted when empty
- Compact mode drops the `files` list, keeping only `success` and `filesChanged`
