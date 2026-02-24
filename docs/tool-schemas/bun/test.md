# bun > test

Runs `bun test` and returns structured pass/fail results with per-test details.

**Command**: `bun test`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `files`   | string[] | —       | Specific test files or patterns to run                     |
| `filter`  | string   | —       | Filter tests by name pattern (--test-name-pattern)         |
| `timeout` | number   | —       | Test timeout in milliseconds (--timeout)                   |
| `path`    | string   | cwd     | Project root path                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
$ bun test
bun test v1.1.0 (abcdef01)

src/utils.test.ts:
  ✓ adds two numbers [0.12ms]
  ✓ handles negative numbers [0.05ms]
  ✓ returns zero for empty input [0.03ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 files. [52.00ms]
```

</td>
<td>

~90 tokens

```json
{
  "success": true,
  "passed": 3,
  "failed": 0,
  "skipped": 0,
  "total": 3,
  "duration": 52,
  "tests": [
    { "name": "adds two numbers", "passed": true, "duration": 0.12 },
    { "name": "handles negative numbers", "passed": true, "duration": 0.05 },
    { "name": "returns zero for empty input", "passed": true, "duration": 0.03 }
  ]
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
  "passed": 3,
  "failed": 0,
  "skipped": 0,
  "total": 3,
  "duration": 52
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

~200 tokens

```
$ bun test
bun test v1.1.0 (abcdef01)

src/math.test.ts:
  ✓ adds two numbers [0.10ms]
  ✗ divides by zero [0.08ms]
    expect(received).toBe(expected)
    Expected: Infinity
    Received: NaN

 1 pass
 1 fail
 2 expect() calls
Ran 2 tests across 1 files. [38.00ms]
```

</td>
<td>

~85 tokens

```json
{
  "success": false,
  "passed": 1,
  "failed": 1,
  "skipped": 0,
  "total": 2,
  "duration": 38,
  "tests": [
    { "name": "adds two numbers", "passed": true, "duration": 0.1 },
    {
      "name": "divides by zero",
      "passed": false,
      "duration": 0.08,
      "error": "expect(received).toBe(expected)\nExpected: Infinity\nReceived: NaN"
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

~25 tokens

```json
{
  "success": false,
  "passed": 1,
  "failed": 1,
  "skipped": 0,
  "total": 2,
  "duration": 38
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| All tests pass | ~150       | ~90       | ~25          | 40-83%  |
| Tests fail     | ~200       | ~85       | ~25          | 58-88%  |

## Notes

- The `filter` parameter maps to `--test-name-pattern` for filtering tests by name
- The `files` parameter is validated against flag injection
- `tests` array is omitted from compact mode to reduce token usage
- `stderr` is only included in the response when non-empty
- Each test case in `tests` includes optional `duration` (milliseconds) and `error` (failure message) fields
