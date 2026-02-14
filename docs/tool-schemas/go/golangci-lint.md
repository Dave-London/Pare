# go > golangci-lint

Runs golangci-lint and returns structured lint diagnostics (file, line, linter, severity, message). Use instead of running `golangci-lint` in the terminal.

**Command**: `golangci-lint run --out-format json ./...`

## Input Parameters

| Parameter  | Type     | Default   | Description                                                |
| ---------- | -------- | --------- | ---------------------------------------------------------- |
| `path`     | string   | cwd       | Project root path                                          |
| `patterns` | string[] | `[./...]` | File patterns or packages to lint                          |
| `config`   | string   | --        | Path to golangci-lint config file                          |
| `compact`  | boolean  | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(no output on success)
```

</td>
<td>

~20 tokens

```json
{
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0,
  "byLinter": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no issues).

</td>
</tr>
</table>

## Issues Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
server/handler.go:24:15: SA1006: printf-style function with dynamic format string (staticcheck)
server/handler.go:31:2: ineffectual assignment to `err` (ineffassign)
server/router.go:7:9: `fmt.Errorf` can be replaced with `errors.New` (perfsprint)
server/router.go:18:4: error returned from external package is unwrapped (wrapcheck)
```

</td>
<td>

~150 tokens

```json
{
  "diagnostics": [
    {
      "file": "server/handler.go",
      "line": 24,
      "column": 15,
      "linter": "staticcheck",
      "severity": "warning",
      "message": "SA1006: printf-style function with dynamic format string",
      "sourceLine": "\tfmt.Sprintf(format, args...)"
    },
    {
      "file": "server/handler.go",
      "line": 31,
      "column": 2,
      "linter": "ineffassign",
      "severity": "warning",
      "message": "ineffectual assignment to `err`"
    },
    {
      "file": "server/router.go",
      "line": 7,
      "column": 9,
      "linter": "perfsprint",
      "severity": "warning",
      "message": "`fmt.Errorf` can be replaced with `errors.New`"
    },
    {
      "file": "server/router.go",
      "line": 18,
      "column": 4,
      "linter": "wrapcheck",
      "severity": "warning",
      "message": "error returned from external package is unwrapped"
    }
  ],
  "total": 4,
  "errors": 0,
  "warnings": 4,
  "byLinter": [
    { "linter": "staticcheck", "count": 1 },
    { "linter": "ineffassign", "count": 1 },
    { "linter": "perfsprint", "count": 1 },
    { "linter": "wrapcheck", "count": 1 }
  ]
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
  "total": 4,
  "errors": 0,
  "warnings": 4
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| No issues      | ~5         | ~20       | ~20          | 0%      |
| 4 lint issues  | ~200       | ~150      | ~15          | 25-93%  |

## Notes

- Uses `golangci-lint run --out-format json` for structured JSON output
- Each diagnostic includes the originating linter name (e.g., `staticcheck`, `ineffassign`, `govet`)
- Severity is mapped from the golangci-lint JSON output: `error`, `warning`, or `info` (defaults to `warning`)
- The `byLinter` array provides a per-linter summary sorted by count (descending)
- The optional `sourceLine` field contains the source code line where the issue was found
- The `config` parameter allows specifying a custom `.golangci.yml` configuration file
- Compact mode drops individual diagnostics and the `byLinter` breakdown, keeping only totals
