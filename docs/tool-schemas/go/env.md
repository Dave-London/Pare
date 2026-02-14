# go > env

Returns Go environment variables as structured JSON. Optionally request specific variables. Use instead of running `go env` in the terminal.

**Command**: `go env -json`

## Input Parameters

| Parameter | Type     | Default | Description                                                          |
| --------- | -------- | ------- | -------------------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                                    |
| `vars`    | string[] | --      | Specific environment variables to query (e.g., `['GOROOT', 'GOPATH']`) |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens           |

## Success — Full Environment

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
GO111MODULE=""
GOARCH="amd64"
GOBIN=""
GOCACHE="/home/user/.cache/go-build"
GOENV="/home/user/.config/go/env"
GOFLAGS=""
GOHOSTARCH="amd64"
GOHOSTOS="linux"
GOMODCACHE="/home/user/go/pkg/mod"
GOOS="linux"
GOPATH="/home/user/go"
GOROOT="/usr/local/go"
GOVERSION="go1.22.2"
... (40+ more variables)
```

</td>
<td>

~250 tokens

```json
{
  "vars": {
    "GO111MODULE": "",
    "GOARCH": "amd64",
    "GOBIN": "",
    "GOCACHE": "/home/user/.cache/go-build",
    "GOOS": "linux",
    "GOPATH": "/home/user/go",
    "GOROOT": "/usr/local/go",
    "GOVERSION": "go1.22.2"
  },
  "goroot": "/usr/local/go",
  "gopath": "/home/user/go",
  "goversion": "go1.22.2",
  "goos": "linux",
  "goarch": "amd64"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "goroot": "/usr/local/go",
  "gopath": "/home/user/go",
  "goversion": "go1.22.2",
  "goos": "linux",
  "goarch": "amd64"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Full environment   | ~400       | ~250      | ~30          | 38-93%  |

## Notes

- Uses `go env -json` to get structured output from the Go toolchain
- The `vars` parameter allows querying specific variables (e.g., `['GOROOT', 'GOPATH']`), which limits the JSON output
- Key fields (`goroot`, `gopath`, `goversion`, `goos`, `goarch`) are extracted to top-level properties for convenience
- Compact mode drops the full `vars` map, keeping only the five key fields
- The full `vars` map typically contains 40+ variables; compact mode provides significant savings
