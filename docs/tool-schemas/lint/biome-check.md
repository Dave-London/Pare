# lint > biome-check

Runs Biome check (lint + format) and returns structured diagnostics (file, line, rule, severity, message).

**Command**: `biome check --reporter=json .`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `patterns` | string[] | `["."]` | File patterns to check                                     |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ biome check .

Checked 15 files in 120ms. No fixes needed.
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

~300 tokens

```
$ biome check --reporter=json .

src/index.ts:5:1 lint/suspicious/noDoubleEquals
  Use === instead of ==

src/utils.ts:12:3 lint/complexity/noForEach
  Prefer for...of instead of forEach

src/utils.ts:20:1 lint/style/useConst
  This let declaration can be made const

3 diagnostics (1 error, 2 warnings)
```

</td>
<td>

~100 tokens

```json
{
  "diagnostics": [
    {
      "file": "src/index.ts",
      "line": 0,
      "severity": "error",
      "rule": "lint/suspicious/noDoubleEquals",
      "message": "Use === instead of =="
    },
    {
      "file": "src/utils.ts",
      "line": 0,
      "severity": "warning",
      "rule": "lint/complexity/noForEach",
      "message": "Prefer for...of instead of forEach"
    },
    {
      "file": "src/utils.ts",
      "line": 0,
      "severity": "warning",
      "rule": "lint/style/useConst",
      "message": "This let declaration can be made const"
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

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| No issues       | ~50        | ~25       | ~25          | 50%     |
| 3 diagnostics   | ~300       | ~100      | ~20          | 67-93%  |
| Biome not found | ~30        | ~25       | ~25          | 17%     |

## Notes

- Biome JSON reporter outputs a `{ diagnostics: [...] }` object; each diagnostic includes `category` (mapped to `rule`), `severity`, `description` (mapped to `message`), and `location.path.file`
- Biome severity levels `"fatal"` and `"error"` map to `"error"`, `"warning"` stays as-is, and `"information"` / `"hint"` map to `"info"`
- Line numbers come from `location.sourceCode.lineNumber` when available; they default to `0` because Biome uses byte-offset spans rather than line/column positions
- Compact mode drops the `diagnostics` array entirely, keeping only aggregate counts
