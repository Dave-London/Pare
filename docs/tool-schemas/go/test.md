# go > test

Runs go test and returns structured test results (name, status, package, elapsed). Use instead of running `go test` in the terminal.

**Command**: `go test -json ./...`

## Input Parameters

| Parameter  | Type     | Default   | Description                                                |
| ---------- | -------- | --------- | ---------------------------------------------------------- |
| `path`     | string   | cwd       | Project root path                                          |
| `packages` | string[] | `[./...]` | Packages to test                                           |
| `run`      | string   | --        | Test name filter regex                                     |
| `compact`  | boolean  | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
ok  	myapp/auth     0.12s
ok  	myapp/server   0.34s
--- PASS: TestLogin (0.01s)
--- PASS: TestLogout (0.02s)
--- PASS: TestHealthCheck (0.00s)
--- PASS: TestListUsers (0.05s)
PASS
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "tests": [
    { "package": "myapp/auth", "name": "TestLogin", "status": "pass", "elapsed": 0.01 },
    { "package": "myapp/auth", "name": "TestLogout", "status": "pass", "elapsed": 0.02 },
    { "package": "myapp/server", "name": "TestHealthCheck", "status": "pass", "elapsed": 0 },
    { "package": "myapp/server", "name": "TestListUsers", "status": "pass", "elapsed": 0.05 }
  ],
  "total": 4,
  "passed": 4,
  "failed": 0,
  "skipped": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "success": true,
  "total": 4,
  "passed": 4,
  "failed": 0,
  "skipped": 0
}
```

</td>
</tr>
</table>

## Success — With Failures

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
--- PASS: TestLogin (0.01s)
--- PASS: TestLogout (0.02s)
--- FAIL: TestCreateUser (0.03s)
    user_test.go:45: expected status 201, got 400
--- PASS: TestHealthCheck (0.00s)
--- FAIL: TestDeleteUser (0.01s)
    user_test.go:78: expected nil error, got "not found"
FAIL
FAIL	myapp/auth     0.12s
FAIL	myapp/server   0.08s
```

</td>
<td>

~120 tokens

```json
{
  "success": false,
  "tests": [
    { "package": "myapp/auth", "name": "TestLogin", "status": "pass", "elapsed": 0.01 },
    { "package": "myapp/auth", "name": "TestLogout", "status": "pass", "elapsed": 0.02 },
    { "package": "myapp/auth", "name": "TestCreateUser", "status": "fail", "elapsed": 0.03 },
    { "package": "myapp/server", "name": "TestHealthCheck", "status": "pass", "elapsed": 0 },
    { "package": "myapp/server", "name": "TestDeleteUser", "status": "fail", "elapsed": 0.01 }
  ],
  "total": 5,
  "passed": 3,
  "failed": 2,
  "skipped": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "success": false,
  "total": 5,
  "passed": 3,
  "failed": 2,
  "skipped": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| 4 tests passing      | ~150       | ~100      | ~25          | 33-83%  |
| 5 tests, 2 failures  | ~300       | ~120      | ~25          | 60-92%  |

## Notes

- Uses `go test -json` which outputs newline-delimited JSON events (Action: run/pass/fail/skip/output)
- The `run` parameter maps to `-run` flag for test name regex filtering
- Each test result includes the package path, test name, pass/fail/skip status, and elapsed time
- Compact mode drops individual test details, keeping only aggregate counts
- Subtests are tracked by their full name (e.g., `TestAuth/Login`)
