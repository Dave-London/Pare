# deno > test

Runs `deno test` and returns structured pass/fail output with per-test results.

**Command**: `deno test`

## Input Parameters

| Parameter  | Type     | Default | Description                                                         |
| ---------- | -------- | ------- | ------------------------------------------------------------------- |
| `files`    | string[] | —       | Test files or directories to run (default: auto-discovered)         |
| `filter`   | string   | —       | Filter tests by name pattern (--filter)                             |
| `path`     | string   | cwd     | Project root path                                                   |
| `allowAll` | boolean  | `true`  | Allow all permissions (-A). Defaults to true for test convenience.  |
| `failFast` | boolean  | —       | Stop on first failure (--fail-fast)                                 |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens          |

## Success — All Tests Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
$ deno test -A
running 4 tests from ./utils_test.ts
test add ... ok (3ms)
test subtract ... ok (1ms)
test multiply ... ok (2ms)
test divide ... ok (1ms)

ok | 4 passed | 0 failed | 0 ignored | 0 measured | 0 filtered out (120ms)
```

</td>
<td>

~120 tokens

```json
{
  "success": true,
  "total": 4,
  "passed": 4,
  "failed": 0,
  "ignored": 0,
  "filtered": 0,
  "measured": 0,
  "duration": 120,
  "tests": [
    { "name": "add", "status": "passed", "duration": 3 },
    { "name": "subtract", "status": "passed", "duration": 1 },
    { "name": "multiply", "status": "passed", "duration": 2 },
    { "name": "divide", "status": "passed", "duration": 1 }
  ]
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
  "success": true,
  "total": 4,
  "passed": 4,
  "failed": 0,
  "ignored": 0,
  "filtered": 0,
  "measured": 0,
  "duration": 120
}
```

</td>
</tr>
</table>

## Error — Tests Fail

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
$ deno test -A
running 3 tests from ./math_test.ts
test add ... ok (2ms)
test divide ... FAILED (3ms)
test subtract ... ok (1ms)

 ERRORS

divide => ./math_test.ts:8:6
error: AssertionError: Values are not equal.

    [Diff] Actual / Expected

-   NaN
+   Infinity

FAILED | 2 passed | 1 failed | 0 ignored | 0 measured | 0 filtered out (85ms)
```

</td>
<td>

~110 tokens

```json
{
  "success": false,
  "total": 3,
  "passed": 2,
  "failed": 1,
  "ignored": 0,
  "filtered": 0,
  "measured": 0,
  "duration": 85,
  "tests": [
    { "name": "add", "status": "passed", "duration": 2 },
    { "name": "divide", "status": "failed", "duration": 3, "error": "AssertionError: Values are not equal.\n\n    [Diff] Actual / Expected\n\n-   NaN\n+   Infinity" },
    { "name": "subtract", "status": "passed", "duration": 1 }
  ]
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
  "success": false,
  "total": 3,
  "passed": 2,
  "failed": 1,
  "ignored": 0,
  "filtered": 0,
  "measured": 0,
  "duration": 85
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| All tests pass  | ~180       | ~120      | ~30          | 33-83%  |
| Tests fail      | ~250       | ~110      | ~30          | 56-88%  |

## Notes

- The `allowAll` parameter defaults to `true` for convenience since tests commonly need file/network access
- The `filter` parameter maps to `--filter` for filtering tests by name pattern
- Test statuses can be `"passed"`, `"failed"`, or `"ignored"` (Deno's equivalent of skipped)
- The `measured` and `filtered` counts come from Deno's built-in benchmark and filter mechanisms
- `tests` array is omitted from compact mode to reduce token usage
- Each test case includes optional `duration` (milliseconds) and `error` (failure message) fields
