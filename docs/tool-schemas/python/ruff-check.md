# python > ruff-check

Runs ruff check and returns structured lint diagnostics with file locations, rule codes, messages, and fixability info.

**Command**: `ruff check --output-format json <targets>`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `targets` | string[] | `["."]` | Files or directories to check                              |
| `fix`     | boolean  | `false` | Auto-fix problems                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
All checks passed!
```

</td>
<td>

~15 tokens

```json
{
  "diagnostics": [],
  "total": 0,
  "fixable": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no diagnostics).

</td>
</tr>
</table>

## Success -- With Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
src/api/views.py:5:1: F401 [*] `os` imported but unused
src/api/views.py:12:80: E501 Line too long (95 > 88 characters)
src/utils/helpers.py:23:5: E711 Comparison to `None`
Found 3 errors.
[*] 1 fixable with the `--fix` option.
```

</td>
<td>

~80 tokens

```json
{
  "diagnostics": [
    {
      "file": "src/api/views.py",
      "line": 5,
      "column": 1,
      "code": "F401",
      "message": "`os` imported but unused",
      "fixable": true
    },
    {
      "file": "src/api/views.py",
      "line": 12,
      "column": 80,
      "code": "E501",
      "message": "Line too long (95 > 88 characters)",
      "fixable": false
    },
    {
      "file": "src/utils/helpers.py",
      "line": 23,
      "column": 5,
      "code": "E711",
      "message": "Comparison to `None`",
      "fixable": false
    }
  ],
  "total": 3,
  "fixable": 1
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
  "total": 3,
  "fixable": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| No issues     | ~10        | ~15       | ~15          | 0%      |
| 3 diagnostics | ~100       | ~80       | ~10          | 20-90%  |

## Notes

- Uses `--output-format json` to get structured JSON directly from ruff, avoiding text parsing
- Each diagnostic includes `endLine` and `endColumn` when ruff reports the end location of the issue
- The `fixable` boolean on each diagnostic indicates whether `--fix` can auto-resolve it
- The `fix` parameter appends `--fix` to auto-fix resolvable issues in-place
- Compact mode drops all individual diagnostics, keeping only `total` and `fixable` counts
