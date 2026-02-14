# go > list

Lists Go packages and returns structured package information (dir, importPath, name, goFiles). Use instead of running `go list` in the terminal.

**Command**: `go list -json ./...`

## Input Parameters

| Parameter  | Type     | Default   | Description                                                |
| ---------- | -------- | --------- | ---------------------------------------------------------- |
| `path`     | string   | cwd       | Project root path                                          |
| `packages` | string[] | `[./...]` | Package patterns to list                                   |
| `compact`  | boolean  | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Packages Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```json
{
    "Dir": "/home/user/myapp",
    "ImportPath": "myapp",
    "Name": "main",
    "GoFiles": ["main.go", "config.go"],
    "Imports": ["fmt", "net/http", "myapp/server"],
    ...
}
{
    "Dir": "/home/user/myapp/server",
    "ImportPath": "myapp/server",
    "Name": "server",
    "GoFiles": ["handler.go", "router.go", "middleware.go"],
    "Imports": ["fmt", "net/http"],
    ...
}
```

</td>
<td>

~80 tokens

```json
{
  "packages": [
    {
      "dir": "/home/user/myapp",
      "importPath": "myapp",
      "name": "main",
      "goFiles": ["main.go", "config.go"]
    },
    {
      "dir": "/home/user/myapp/server",
      "importPath": "myapp/server",
      "name": "server",
      "goFiles": ["handler.go", "router.go", "middleware.go"]
    }
  ],
  "total": 2
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
  "total": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 2 packages     | ~250       | ~80       | ~5           | 68-98%  |

## Notes

- Uses `go list -json` which outputs concatenated JSON objects (one per package, not valid JSON array)
- The parser splits concatenated JSON objects by tracking brace depth
- Pare extracts only the essential fields (`dir`, `importPath`, `name`, `goFiles`) from the verbose `go list` output, which contains many additional fields (Imports, Deps, Module, etc.)
- Compact mode drops individual package details, keeping only the total count
- The `packages` parameter accepts Go package patterns (e.g., `./cmd/...`, `./internal/...`)
