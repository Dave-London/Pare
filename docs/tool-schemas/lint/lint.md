# lint > lint

Runs ESLint and returns structured diagnostics (file, line, rule, severity, message).

**Command**: `eslint --format json .`

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

~50 tokens

```
$ eslint .

No ESLint issues found (12 files checked).
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
  "filesChecked": 12
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

~350 tokens

```
$ eslint --format json .

/project/src/index.ts
   5:10  error    no-unused-vars       'foo' is defined but never used
  12:1   warning  no-console           Unexpected console statement
  18:5   error    @typescript-eslint/no-explicit-any  Unexpected any

/project/src/utils.ts
   3:1   warning  no-console           Unexpected console statement
   9:14  error    eqeqeq               Expected '===' and instead saw '=='

5 problems (3 errors, 2 warnings)
```

</td>
<td>

~130 tokens

```json
{
  "diagnostics": [
    {
      "file": "/project/src/index.ts",
      "line": 5,
      "severity": "error",
      "rule": "no-unused-vars",
      "message": "'foo' is defined but never used"
    },
    {
      "file": "/project/src/index.ts",
      "line": 12,
      "severity": "warning",
      "rule": "no-console",
      "message": "Unexpected console statement"
    },
    {
      "file": "/project/src/index.ts",
      "line": 18,
      "severity": "error",
      "rule": "@typescript-eslint/no-explicit-any",
      "message": "Unexpected any"
    },
    {
      "file": "/project/src/utils.ts",
      "line": 3,
      "severity": "warning",
      "rule": "no-console",
      "message": "Unexpected console statement"
    },
    {
      "file": "/project/src/utils.ts",
      "line": 9,
      "severity": "error",
      "rule": "eqeqeq",
      "message": "Expected '===' and instead saw '=='"
    }
  ],
  "total": 5,
  "errors": 3,
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
  "total": 5,
  "errors": 3,
  "warnings": 2,
  "filesChecked": 2
}
```

</td>
</tr>
</table>

## Error — ESLint Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: eslint: command not found
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

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| No issues (12 files) | ~50        | ~25       | ~25          | 50%     |
| 5 diagnostics        | ~350       | ~130      | ~20          | 63-94%  |
| ESLint not found     | ~30        | ~25       | ~25          | 17%     |

## Notes

- ESLint JSON output is parsed from `--format json`; each file entry contains a `messages` array with `ruleId`, `severity` (1=warning, 2=error), `message`, and `line`
- The `fix` parameter appends `--fix` to auto-fix fixable problems before reporting remaining issues
- Compact mode drops the `diagnostics` array entirely, keeping only aggregate counts (`total`, `errors`, `warnings`, `filesChecked`)
- Input patterns are validated against flag injection (e.g., patterns starting with `--` are rejected)
