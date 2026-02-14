# lint > oxlint

Runs Oxlint and returns structured diagnostics (file, line, rule, severity, message). Oxlint is a fast JavaScript/TypeScript linter written in Rust.

**Command**: `oxlint --format json .`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `patterns` | string[] | `["."]` | File patterns to lint                                      |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ oxlint .

Finished in 15ms on 20 files with 0 warnings and 0 errors.
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

~280 tokens

```
$ oxlint --format json .

  x no-unused-vars: 'tempValue' is defined but never used
    ,-[src/index.ts:5:10]
    5 | const tempValue = 42;
      :       ^^^^^^^^^
    `----

  x no-debugger: `debugger` statement is not allowed
    ,-[src/utils.ts:18:3]
   18 | debugger;
      : ^^^^^^^^
    `----

  x eqeqeq: Expected '===' and instead saw '=='
    ,-[src/utils.ts:25:8]
   25 | if (a == b) {
      :      ^^
    `----

Finished in 8ms on 10 files with 1 warning and 2 errors.
```

</td>
<td>

~100 tokens

```json
{
  "diagnostics": [
    {
      "file": "src/index.ts",
      "line": 5,
      "severity": "warning",
      "rule": "no-unused-vars",
      "message": "'tempValue' is defined but never used"
    },
    {
      "file": "src/utils.ts",
      "line": 18,
      "severity": "error",
      "rule": "no-debugger",
      "message": "`debugger` statement is not allowed"
    },
    {
      "file": "src/utils.ts",
      "line": 25,
      "severity": "error",
      "rule": "eqeqeq",
      "message": "Expected '===' and instead saw '=='"
    }
  ],
  "total": 3,
  "errors": 2,
  "warnings": 1,
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
  "errors": 2,
  "warnings": 1,
  "filesChecked": 2
}
```

</td>
</tr>
</table>

## Error — Oxlint Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: oxlint: command not found
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
| No issues          | ~40        | ~25       | ~25          | 38%     |
| 3 diagnostics      | ~280       | ~100      | ~20          | 64-93%  |
| Oxlint not found   | ~30        | ~25       | ~25          | 17%     |

## Notes

- Oxlint outputs NDJSON (one JSON object per line) with `--format json`; each line contains `file`, `line`, `severity`, `ruleId`, and `message`
- Non-diagnostic JSON lines (e.g., summary objects without a `message` field) are skipped during parsing
- Oxlint severity `"off"` and `"info"` both map to `"info"` in the Pare diagnostic schema
- File count in `filesChecked` is derived from unique file paths across diagnostics, not from Oxlint's summary output
- Compact mode drops the `diagnostics` array entirely, keeping only aggregate counts
