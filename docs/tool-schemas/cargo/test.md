# cargo > test

Runs cargo test and returns structured test results (name, status, pass/fail counts).

**Command**: `cargo test`

## Input Parameters

| Parameter | Type   | Default | Description                                                |
| --------- | ------ | ------- | ---------------------------------------------------------- |
| `path`    | string | cwd     | Project root path                                          |
| `filter`  | string | --      | Test name filter pattern                                   |
| `compact` | boolean | `true` | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
   Compiling my-app v0.1.0 (/home/user/my-app)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.50s
     Running unittests src/main.rs (target/debug/deps/my_app-abc123)

running 4 tests
test tests::test_add ... ok
test tests::test_subtract ... ok
test tests::test_multiply ... ok
test tests::test_divide ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
```

</td>
<td>

~70 tokens

```json
{
  "success": true,
  "tests": [
    { "name": "tests::test_add", "status": "ok" },
    { "name": "tests::test_subtract", "status": "ok" },
    { "name": "tests::test_multiply", "status": "ok" },
    { "name": "tests::test_divide", "status": "ok" }
  ],
  "total": 4,
  "passed": 4,
  "failed": 0,
  "ignored": 0
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
  "tests": [],
  "total": 4,
  "passed": 4,
  "failed": 0,
  "ignored": 0
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

~400 tokens

```
running 4 tests
test tests::test_add ... ok
test tests::test_subtract ... ok
test tests::test_multiply ... FAILED
test tests::test_divide ... FAILED

failures:

---- tests::test_multiply stdout ----
thread 'tests::test_multiply' panicked at src/main.rs:25:5:
assertion `left == right` failed
  left: 6
 right: 7
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace

---- tests::test_divide stdout ----
thread 'tests::test_divide' panicked at src/main.rs:30:5:
attempt to divide by zero

failures:
    tests::test_divide
    tests::test_multiply

test result: FAILED. 2 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s
```

</td>
<td>

~75 tokens

```json
{
  "success": false,
  "tests": [
    { "name": "tests::test_add", "status": "ok" },
    { "name": "tests::test_subtract", "status": "ok" },
    { "name": "tests::test_multiply", "status": "FAILED" },
    { "name": "tests::test_divide", "status": "FAILED" }
  ],
  "total": 4,
  "passed": 2,
  "failed": 2,
  "ignored": 0
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
  "tests": [],
  "total": 4,
  "passed": 2,
  "failed": 2,
  "ignored": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| 4 tests passing       | ~200       | ~70       | ~25          | 65-88%  |
| 4 tests, 2 failures   | ~400       | ~75       | ~25          | 81-94%  |

## Notes

- Parses `test name ... ok/FAILED/ignored` lines from cargo test stdout
- The `filter` parameter is passed as a positional argument to `cargo test` to filter test names
- Compact mode drops individual test entries, keeping only summary counts
- The `filter` parameter is validated against flag injection for security
- Does not capture failure messages from stdout (only test name and pass/fail status)
