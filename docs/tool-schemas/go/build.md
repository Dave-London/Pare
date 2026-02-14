# go > build

Runs go build and returns structured error list (file, line, column, message). Use instead of running `go build` in the terminal.

**Command**: `go build ./...`

## Input Parameters

| Parameter  | Type     | Default   | Description                                                |
| ---------- | -------- | --------- | ---------------------------------------------------------- |
| `path`     | string   | cwd       | Project root path                                          |
| `packages` | string[] | `[./...]` | Packages to build                                          |
| `compact`  | boolean  | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Build Passes

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

~15 tokens

```json
{
  "success": true,
  "errors": [],
  "total": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when build succeeds).

</td>
</tr>
</table>

## Error — Build Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
# myapp/server
./server/handler.go:24:15: undefined: ParseRequest
./server/handler.go:31:9: cannot use resp (variable of type string) as int value in return statement
./server/middleware.go:12:3: too many arguments in call to logRequest
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "errors": [
    {
      "file": "./server/handler.go",
      "line": 24,
      "column": 15,
      "message": "undefined: ParseRequest"
    },
    {
      "file": "./server/handler.go",
      "line": 31,
      "column": 9,
      "message": "cannot use resp (variable of type string) as int value in return statement"
    },
    {
      "file": "./server/middleware.go",
      "line": 12,
      "column": 3,
      "message": "too many arguments in call to logRequest"
    }
  ],
  "total": 3
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
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| Build passes   | ~5         | ~15       | ~15          | 0%      |
| 3 build errors | ~120       | ~80       | ~10          | 33-92%  |

## Notes

- On success, `go build` produces no output; the structured response adds clarity with an explicit `success: true`
- Each error includes file path, line number, and optional column number extracted via regex parsing
- The `packages` parameter accepts the same patterns as `go build` (e.g., `./cmd/...`, `./internal/server`)
- Compact mode drops the full error details, keeping only the count
