# go > fmt

Checks or fixes Go source formatting using gofmt. In check mode, lists unformatted files. In fix mode, rewrites files in place. Use instead of running `gofmt` in the terminal.

**Command**: `gofmt -l .` (check) / `gofmt -w .` (fix)

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `patterns` | string[] | `[.]`   | File patterns to format                                    |
| `check`    | boolean  | `false` | Check mode: list unformatted files without fixing          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Files Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(no output when all files are formatted)
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "filesChanged": 0,
  "files": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when no files need formatting).

</td>
</tr>
</table>

## Check Mode — Unformatted Files Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
server/handler.go
server/middleware.go
internal/utils.go
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "filesChanged": 3,
  "files": [
    "server/handler.go",
    "server/middleware.go",
    "internal/utils.go"
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
  "success": false,
  "filesChanged": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| All formatted        | ~5         | ~15       | ~15          | 0%      |
| 3 unformatted files  | ~30        | ~25       | ~10          | 17-67%  |

## Notes

- In check mode (`check: true`), uses `gofmt -l` to list files that need formatting without modifying them
- In fix mode (`check: false`, the default), uses `gofmt -w` to rewrite files in place
- The `files` array lists all files that were modified (fix mode) or need modification (check mode)
- In check mode, `success` is `false` when any files need formatting, even with exit code 0
- Compact mode drops the individual file list, keeping only the count
