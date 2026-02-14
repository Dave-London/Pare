# go > generate

Runs go generate directives in Go source files. Use instead of running `go generate` in the terminal.

**Command**: `go generate ./...`

## Input Parameters

| Parameter  | Type     | Default   | Description                                                |
| ---------- | -------- | --------- | ---------------------------------------------------------- |
| `path`     | string   | cwd       | Project root path                                          |
| `patterns` | string[] | `[./...]` | Packages to generate                                       |
| `compact`  | boolean  | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Generate Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
mockgen -source=service.go -destination=mock_service.go
stringer -type=Status
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "output": "mockgen -source=service.go -destination=mock_service.go\nstringer -type=Status"
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
  "success": true
}
```

</td>
</tr>
</table>

## Error — Generate Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
main.go:3: running "mockgen": exec: "mockgen": executable file not found in $PATH
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "output": "main.go:3: running \"mockgen\": exec: \"mockgen\": executable file not found in $PATH"
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
  "success": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Generate succeeds | ~20        | ~20       | ~5           | 0-75%   |
| Generate fails    | ~40        | ~20       | ~5           | 50-88%  |

## Notes

- WARNING: `go generate` executes arbitrary commands embedded in `//go:generate` directives in source files; only use on trusted, reviewed code
- The `output` field contains the combined stdout and stderr from the generate run
- When there are no `//go:generate` directives, the output will be empty and success will be `true`
- Compact mode drops the output text, keeping only the success boolean
