# go > get

Downloads and installs Go packages and their dependencies. Use instead of running `go get` in the terminal.

**Command**: `go get github.com/pkg/errors@latest`

## Input Parameters

| Parameter  | Type     | Default | Description                                                        |
| ---------- | -------- | ------- | ------------------------------------------------------------------ |
| `packages` | string[] | --      | Packages to install (e.g., `['github.com/pkg/errors@latest']`) (required) |
| `path`     | string   | cwd     | Project root path                                                  |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens         |

## Success — Package Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
go: downloading github.com/pkg/errors v0.9.1
go: added github.com/pkg/errors v0.9.1
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "output": "go: downloading github.com/pkg/errors v0.9.1\ngo: added github.com/pkg/errors v0.9.1"
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

## Error — Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
go: module github.com/example/nonexistent: no matching versions for query "latest"
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "output": "go: module github.com/example/nonexistent: no matching versions for query \"latest\""
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

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| Package installed   | ~30        | ~20       | ~5           | 33-83%  |
| Package not found   | ~40        | ~20       | ~5           | 50-88%  |

## Notes

- The `packages` parameter is required and accepts version suffixes (e.g., `@latest`, `@v1.2.3`)
- Multiple packages can be installed in a single call (e.g., `['github.com/pkg/errors@latest', 'golang.org/x/sync@latest']`)
- The `output` field contains the combined stdout/stderr from the `go get` command
- Compact mode drops the output text, keeping only the success boolean
- Package arguments are validated against flag injection
