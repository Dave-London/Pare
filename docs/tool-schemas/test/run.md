# test > run

Auto-detects test framework (pytest/jest/vitest/mocha), runs tests, and returns structured results with failures.

**Command**: `npx vitest run --reporter=json` / `python -m pytest -v` / `npx jest --json` / `npx mocha --reporter json`

## Input Parameters

| Parameter         | Type                                              | Default     | Description                                                |
| ----------------- | ------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `path`            | string                                            | cwd         | Project root path                                          |
| `framework`       | `"pytest"` \| `"jest"` \| `"vitest"` \| `"mocha"` | auto-detect | Force a specific framework                                 |
| `filter`          | string                                            | —           | Test filter pattern (file path or test name)               |
| `updateSnapshots` | boolean                                           | `false`     | Update snapshots (vitest/jest only)                        |
| `args`            | string[]                                          | `[]`        | Additional arguments to pass to the test runner            |
| `compact`         | boolean                                           | `true`      | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
tests/test_auth.py::test_login_success PASSED
tests/test_auth.py::test_login_failure PASSED
tests/test_auth.py::test_logout PASSED
tests/test_api.py::test_get_users PASSED
tests/test_api.py::test_create_user PASSED

====== 5 passed in 0.47s ======
```

</td>
<td>

~35 tokens

```json
{
  "framework": "pytest",
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "skipped": 0,
    "duration": 0.47
  },
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

## Success — With Failures

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~450 tokens

```
$ npx jest --json

FAIL  src/__tests__/api.test.ts
  api
    ✓ GET /users should return list (12 ms)
    ✓ POST /users should create user (8 ms)
    ✗ POST /users should validate email (15 ms)
    ✓ DELETE /users should remove user (5 ms)

FAIL  src/__tests__/utils.test.ts
  utils
    ✓ should format date (2 ms)
    ✓ should parse JSON (1 ms)
    ✗ should parse config file (3 ms)
    ✓ should validate schema (4 ms)

  ● api > POST /users should validate email

    expect(received).toBe(expected)

    Expected: "valid@email.com"
    Received: undefined

      13 |   const result = validateEmail(input);
      14 |   expect(result).toBe("valid@email.com");
         |                  ^
      15 | });

      at Object.<anonymous> (src/__tests__/api.test.ts:14:18)

  ● utils > should parse config file

    expect(received).toEqual(expected)

    Expected: {"key": "value"}
    Received: null

      40 |   const config = parseConfig("test.json");
      41 |   expect(config).toEqual({"key": "value"});
         |                  ^
      42 | });

      at Object.<anonymous> (src/__tests__/utils.test.ts:41:18)

Tests: 2 failed, 6 passed, 8 total
Time:  0.85s
```

</td>
<td>

~160 tokens

```json
{
  "framework": "jest",
  "summary": {
    "total": 8,
    "passed": 6,
    "failed": 2,
    "skipped": 0,
    "duration": 0.85
  },
  "failures": [
    {
      "name": "api > POST /users should validate email",
      "file": "src/__tests__/api.test.ts",
      "line": 14,
      "message": "Expected: \"valid@email.com\"",
      "expected": "\"valid@email.com\"",
      "actual": "undefined",
      "stack": "expect(received).toBe(expected)\n\nExpected: \"valid@email.com\"\nReceived: undefined\n\n    at Object.<anonymous> (src/__tests__/api.test.ts:14:18)"
    },
    {
      "name": "utils > should parse config file",
      "file": "src/__tests__/utils.test.ts",
      "line": 41,
      "message": "Expected: {\"key\": \"value\"}",
      "expected": "{\"key\": \"value\"}",
      "actual": "null",
      "stack": "expect(received).toEqual(expected)\n\nExpected: {\"key\": \"value\"}\nReceived: null\n\n    at Object.<anonymous> (src/__tests__/utils.test.ts:41:18)"
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

~80 tokens

```json
{
  "framework": "jest",
  "summary": {
    "total": 8,
    "passed": 6,
    "failed": 2,
    "skipped": 0,
    "duration": 0.85
  },
  "failures": [
    {
      "name": "api > POST /users should validate email",
      "message": "Expected: \"valid@email.com\""
    },
    {
      "name": "utils > should parse config file",
      "message": "Expected: {\"key\": \"value\"}"
    }
  ]
}
```

</td>
</tr>
</table>

## Error — Framework Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~40 tokens

```
sh: vitest: command not found
```

</td>
<td>

~35 tokens

```json
{
  "framework": "vitest",
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "duration": 0
  },
  "failures": []
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| 5 tests passing     | ~180       | ~35       | ~35          | 81%     |
| 8 tests, 2 failures | ~450       | ~160      | ~80          | 64–82%  |
| Framework not found | ~40        | ~35       | ~35          | 13%     |

## Notes

- Framework auto-detection checks for `pytest.ini`/`setup.cfg`/`pyproject.toml` (pytest), `jest.config.*` (jest), `vitest.config.*` (vitest), `.mocharc.*` (mocha)
- On Windows, Jest and Vitest write JSON to a temp file to avoid stdout encoding issues
- The `filter` parameter maps to framework-specific flags: `-k` (pytest), `--testPathPattern` (jest), positional arg (vitest), `--grep` (mocha)
- Compact mode drops `file`, `line`, `expected`, `actual`, and `stack` from failures, keeping only `name` and `message`
