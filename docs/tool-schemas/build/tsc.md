# build > tsc

Runs the TypeScript compiler and returns structured diagnostics (file, line, column, code, message).

**Command**: `npx tsc --noEmit`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `noEmit`  | boolean | `true`  | Skip emitting output files                                 |
| `project` | string  | ---     | Path to tsconfig.json                                      |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- No Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
$ npx tsc --noEmit

```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0
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

## Error --- Type Errors Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ npx tsc --noEmit
src/index.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/index.ts(25,10): error TS2345: Argument of type 'null' is not assignable to parameter of type 'string'.
src/utils.ts(8,3): error TS7006: Parameter 'x' implicitly has an 'any' type.
src/config.ts(15,1): warning TS6133: 'unusedVar' is declared but its value is never read.

Found 4 errors in 3 files.
```

</td>
<td>

~120 tokens

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/index.ts",
      "line": 12,
      "column": 5,
      "code": 2322,
      "severity": "error",
      "message": "Type 'string' is not assignable to type 'number'."
    },
    {
      "file": "src/index.ts",
      "line": 25,
      "column": 10,
      "code": 2345,
      "severity": "error",
      "message": "Argument of type 'null' is not assignable to parameter of type 'string'."
    },
    {
      "file": "src/utils.ts",
      "line": 8,
      "column": 3,
      "code": 7006,
      "severity": "error",
      "message": "Parameter 'x' implicitly has an 'any' type."
    },
    {
      "file": "src/config.ts",
      "line": 15,
      "column": 1,
      "code": 6133,
      "severity": "warning",
      "message": "'unusedVar' is declared but its value is never read."
    }
  ],
  "total": 4,
  "errors": 3,
  "warnings": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~55 tokens

```json
{
  "success": false,
  "errors": 3,
  "warnings": 1,
  "diagnostics": [
    { "file": "src/index.ts", "line": 12, "severity": "error" },
    { "file": "src/index.ts", "line": 25, "severity": "error" },
    { "file": "src/utils.ts", "line": 8, "severity": "error" },
    { "file": "src/config.ts", "line": 15, "severity": "warning" }
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| No errors     | ~10        | ~20       | ~20          | 0%      |
| 4 diagnostics | ~200       | ~120      | ~55          | 40-73%  |

## Notes

- Diagnostics are parsed from the `file(line,col): severity TScode: message` format emitted by tsc
- In compact mode, `column`, `code`, `message`, and `total` are dropped from diagnostics, keeping only `file`, `line`, and `severity`
- Compact mode limits diagnostics to the first 10 entries
- The `project` parameter maps to `--project` and accepts a path to a custom tsconfig.json
- When `noEmit` is `false`, tsc will emit output files as normal
