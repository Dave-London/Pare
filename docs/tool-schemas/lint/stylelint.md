# lint > stylelint

Runs Stylelint and returns structured diagnostics (file, line, rule, severity, message) for CSS/SCSS/Less files.

**Command**: `stylelint --formatter json .`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `patterns` | string[] | `["."]` | File patterns to lint                                      |
| `fix`      | boolean  | `false` | Auto-fix problems                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ stylelint "**/*.css"

No issues found in 6 files.
```

</td>
<td>

~25 tokens

```json
{
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0,
  "filesChecked": 6
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

## Success — With Diagnostics

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
$ stylelint --formatter json "**/*.css"

src/styles/main.css
  4:3   error  color-no-invalid-hex        Unexpected invalid hex color "#fff1az"
  12:1  warning  declaration-block-no-duplicate-properties  Unexpected duplicate "color"

src/styles/layout.css
  8:5   warning  selector-class-pattern     Expected class selector to match pattern

3 problems (1 error, 2 warnings)
```

</td>
<td>

~100 tokens

```json
{
  "diagnostics": [
    {
      "file": "src/styles/main.css",
      "line": 4,
      "severity": "error",
      "rule": "color-no-invalid-hex",
      "message": "Unexpected invalid hex color \"#fff1az\""
    },
    {
      "file": "src/styles/main.css",
      "line": 12,
      "severity": "warning",
      "rule": "declaration-block-no-duplicate-properties",
      "message": "Unexpected duplicate \"color\""
    },
    {
      "file": "src/styles/layout.css",
      "line": 8,
      "severity": "warning",
      "rule": "selector-class-pattern",
      "message": "Expected class selector to match pattern"
    }
  ],
  "total": 3,
  "errors": 1,
  "warnings": 2,
  "filesChecked": 2
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
  "total": 3,
  "errors": 1,
  "warnings": 2,
  "filesChecked": 2
}
```

</td>
</tr>
</table>

## Error — Stylelint Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: stylelint: command not found
```

</td>
<td>

~25 tokens

```json
{
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0,
  "filesChecked": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| No issues (6 files) | ~30       | ~25       | ~25          | 17%     |
| 3 diagnostics      | ~250       | ~100      | ~20          | 60-92%  |
| Stylelint not found | ~30       | ~25       | ~25          | 17%     |

## Notes

- Stylelint JSON output (`--formatter json`) is an array of file objects, each containing a `source` path and `warnings` array with `line`, `severity`, `rule`, and `text` fields
- The `fix` parameter appends `--fix` to auto-fix fixable problems before reporting remaining issues
- Stylelint severity is either `"error"` or `"warning"` (no info level); both map directly to the Pare diagnostic schema
- Compact mode drops the `diagnostics` array entirely, keeping only aggregate counts
