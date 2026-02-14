# python > pytest

Runs pytest and returns structured test results with pass/fail/error/skip counts and failure details.

**Command**: `pytest --tb=short -q <targets>`

## Input Parameters

| Parameter   | Type     | Default | Description                                                |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `path`      | string   | cwd     | Project root path                                          |
| `targets`   | string[] | --      | Test files or directories to run (default: auto-discover)  |
| `markers`   | string   | --      | Pytest marker expression (e.g. `"not slow"`)               |
| `verbose`   | boolean  | `false` | Enable verbose output                                      |
| `exitFirst` | boolean  | `false` | Stop on first failure (`-x`)                               |
| `compact`   | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
tests/test_auth.py::test_login PASSED
tests/test_auth.py::test_logout PASSED
tests/test_api.py::test_get_users PASSED
tests/test_api.py::test_create_user PASSED

4 passed in 0.52s
```

</td>
<td>

~35 tokens

```json
{
  "success": true,
  "passed": 4,
  "failed": 0,
  "errors": 0,
  "skipped": 0,
  "total": 4,
  "duration": 0.52,
  "failures": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no failures).

</td>
</tr>
</table>

## Success -- With Failures

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
tests/test_auth.py::test_login PASSED
tests/test_auth.py::test_token_refresh FAILED
tests/test_api.py::test_get_users PASSED
tests/test_api.py::test_delete_user FAILED

________________________________ test_token_refresh ________________________________
    def test_token_refresh():
        token = refresh_token("expired-token")
>       assert token is not None
E       AssertionError: assert None is not None

________________________________ test_delete_user __________________________________
    def test_delete_user():
>       response = client.delete("/users/999")
E       AssertionError: assert 404 == 200

2 failed, 2 passed in 0.87s
```

</td>
<td>

~70 tokens

```json
{
  "success": false,
  "passed": 2,
  "failed": 2,
  "errors": 0,
  "skipped": 0,
  "total": 4,
  "duration": 0.87,
  "failures": [
    {
      "test": "test_token_refresh",
      "message": "AssertionError: assert None is not None"
    },
    {
      "test": "test_delete_user",
      "message": "AssertionError: assert 404 == 200"
    }
  ]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "success": false,
  "passed": 2,
  "failed": 2,
  "errors": 0,
  "skipped": 0,
  "total": 4,
  "duration": 0.87,
  "failedTests": ["test_token_refresh", "test_delete_user"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| 4 tests passing     | ~80        | ~35       | ~35          | 56%     |
| 4 tests, 2 failures | ~250       | ~70       | ~35          | 72-86%  |

## Notes

- Uses `--tb=short` and `-q` by default for concise output; the `verbose` flag switches from `-q` to `-v`
- The `exitFirst` flag maps to `-x`, stopping on the first failure
- The `markers` parameter maps to `-m` for pytest marker expressions (e.g., `"not slow"`, `"integration"`)
- Failures are extracted from the short traceback blocks, capturing `E ` lines as the error message
- Compact mode replaces `failures` (with messages) with `failedTests` (test names only)
- Exit code 5 (no tests collected) is treated as success when no tests were found
