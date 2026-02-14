# go > mod-tidy

Runs go mod tidy to add missing and remove unused module dependencies. Use instead of running `go mod tidy` in the terminal.

**Command**: `go mod tidy`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Already Tidy

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(no output when already tidy)
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "summary": "go.mod and go.sum are already tidy."
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

## Error — Tidy Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
go: finding module for package github.com/example/missing
go: myapp imports
	github.com/example/missing: cannot find module providing package github.com/example/missing
```

</td>
<td>

~30 tokens

```json
{
  "success": false,
  "summary": "go: myapp imports\n\tgithub.com/example/missing: cannot find module providing package github.com/example/missing"
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

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| Already tidy | ~5         | ~15       | ~5           | 0%      |
| Tidy fails   | ~40        | ~30       | ~5           | 25-88%  |

## Notes

- `go mod tidy` adds missing module requirements and removes unused ones from `go.mod` and `go.sum`
- When modules are already tidy, the tool produces no CLI output; the Pare response adds an explicit success message
- The `summary` field contains the combined stdout/stderr output for diagnostic purposes
- Compact mode drops the summary text, keeping only the success boolean
