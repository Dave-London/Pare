# go > vet

Runs go vet and returns structured static analysis diagnostics. Use instead of running `go vet` in the terminal.

**Command**: `go vet ./...`

## Input Parameters

| Parameter  | Type     | Default   | Description                                                |
| ---------- | -------- | --------- | ---------------------------------------------------------- |
| `path`     | string   | cwd       | Project root path                                          |
| `packages` | string[] | `[./...]` | Packages to vet                                            |
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

~10 tokens

```json
{
  "diagnostics": [],
  "total": 0
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

## Error — Issues Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
# myapp/server
./server/handler.go:18:2: printf: fmt.Sprintf format %d has arg of wrong type string
./server/handler.go:42:15: unreachable: unreachable code
./server/router.go:7:9: unusedresult: result of fmt.Errorf call not used
```

</td>
<td>

~70 tokens

```json
{
  "diagnostics": [
    {
      "file": "./server/handler.go",
      "line": 18,
      "column": 2,
      "message": "printf: fmt.Sprintf format %d has arg of wrong type string"
    },
    {
      "file": "./server/handler.go",
      "line": 42,
      "column": 15,
      "message": "unreachable: unreachable code"
    },
    {
      "file": "./server/router.go",
      "line": 7,
      "column": 9,
      "message": "unusedresult: result of fmt.Errorf call not used"
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

~5 tokens

```json
{
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| No issues     | ~5         | ~10       | ~10          | 0%      |
| 3 diagnostics | ~100       | ~70       | ~5           | 30-95%  |

## Notes

- `go vet` performs static analysis checks such as printf format mismatches, unreachable code, and unused results
- Diagnostics are parsed from stderr using the standard Go error format (`file:line:col: message`)
- The column number is optional and may not always be present
- Compact mode drops individual diagnostic details, keeping only the total count
