# go > run

Runs a Go program and returns structured output (stdout, stderr, exit code). Use instead of running `go run` in the terminal.

**Command**: `go run .`

## Input Parameters

| Parameter   | Type     | Default | Description                                                |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `path`      | string   | cwd     | Project root path                                          |
| `file`      | string   | `.`     | Go file or package to run                                  |
| `args`      | string[] | `[]`    | Arguments to pass to the program                           |
| `buildArgs` | string[] | `[]`    | Build flags to pass to go run (e.g., -race, -tags)         |
| `compact`   | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Program Runs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Server starting on :8080
Connected to database
Ready to accept connections
```

</td>
<td>

~30 tokens

```json
{
  "exitCode": 0,
  "stdout": "Server starting on :8080\nConnected to database\nReady to accept connections",
  "stderr": "",
  "success": true
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
  "exitCode": 0,
  "success": true
}
```

</td>
</tr>
</table>

## Error — Program Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
panic: runtime error: index out of range [5] with length 3

goroutine 1 [running]:
main.main()
	/home/user/app/main.go:12 +0x1a
exit status 2
```

</td>
<td>

~40 tokens

```json
{
  "exitCode": 2,
  "stdout": "",
  "stderr": "panic: runtime error: index out of range [5] with length 3\n\ngoroutine 1 [running]:\nmain.main()\n\t/home/user/app/main.go:12 +0x1a\nexit status 2",
  "success": false
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
  "exitCode": 2,
  "success": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Program runs  | ~30        | ~30       | ~10          | 0-67%   |
| Program fails | ~50        | ~40       | ~10          | 20-80%  |

## Notes

- The `file` parameter accepts a Go file path (e.g., `main.go`) or a package path (e.g., `./cmd/server`)
- Program arguments in `args` are separated from build flags using `--`
- Build flags in `buildArgs` are placed before the file/package argument (e.g., `-race`, `-tags integration`)
- Compact mode drops stdout/stderr, keeping only exit code and success status
- The `file` parameter is validated against flag injection
