# swift > test

Runs swift test and returns structured test results (name, status, pass/fail counts).

**Command**: `swift test`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `filter`   | string  | —       | Test name filter pattern (--filter)                        |
| `parallel` | boolean | `true`  | Run tests in parallel (--parallel)                         |
| `path`     | string  | cwd     | Project root path                                          |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ swift test --parallel
Building for testing...
Build complete! (1.23s)
Test Suite 'All tests' started at 2024-01-15 10:30:00
Test Suite 'MyAppTests' started at 2024-01-15 10:30:00
Test Case 'MyAppTests.testAddition' passed (0.002 seconds)
Test Case 'MyAppTests.testSubtraction' passed (0.001 seconds)
Test Case 'MyAppTests.testMultiplication' passed (0.003 seconds)
Test Suite 'MyAppTests' passed at 2024-01-15 10:30:00
	 Executed 3 tests, with 0 failures (0 unexpected) in 0.006 (0.008) seconds
Test Suite 'All tests' passed at 2024-01-15 10:30:00
	 Executed 3 tests, with 0 failures (0 unexpected) in 0.006 (0.008) seconds
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "passed": 3,
  "failed": 0,
  "skipped": 0,
  "total": 3,
  "testCases": [
    { "name": "MyAppTests.testAddition", "status": "passed", "duration": 0.002 },
    { "name": "MyAppTests.testSubtraction", "status": "passed", "duration": 0.001 },
    { "name": "MyAppTests.testMultiplication", "status": "passed", "duration": 0.003 }
  ],
  "duration": 1238
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
  "exitCode": 0,
  "passed": 3,
  "failed": 0,
  "skipped": 0,
  "total": 3,
  "duration": 1238
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

~300 tokens

```
$ swift test --parallel
Building for testing...
Build complete! (1.45s)
Test Suite 'All tests' started at 2024-01-15 10:30:00
Test Suite 'MyAppTests' started at 2024-01-15 10:30:00
Test Case 'MyAppTests.testAddition' passed (0.001 seconds)
Test Case 'MyAppTests.testDivision' failed (0.004 seconds)
/home/user/MyApp/Tests/MyAppTests.swift:18: error: MyAppTests.testDivision : XCTAssertEqual failed: ("nan") is not equal to ("inf")
Test Suite 'MyAppTests' failed at 2024-01-15 10:30:00
	 Executed 2 tests, with 1 failure (0 unexpected) in 0.005 (0.007) seconds
Test Suite 'All tests' failed at 2024-01-15 10:30:00
	 Executed 2 tests, with 1 failure (0 unexpected) in 0.005 (0.007) seconds
```

</td>
<td>

~90 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "passed": 1,
  "failed": 1,
  "skipped": 0,
  "total": 2,
  "testCases": [
    { "name": "MyAppTests.testAddition", "status": "passed", "duration": 0.001 },
    { "name": "MyAppTests.testDivision", "status": "failed", "duration": 0.004 }
  ],
  "duration": 1457
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
  "exitCode": 1,
  "passed": 1,
  "failed": 1,
  "skipped": 0,
  "total": 2,
  "duration": 1457
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| All tests pass | ~200       | ~100      | ~30          | 50-85%  |
| Tests fail     | ~300       | ~90       | ~30          | 70-90%  |

## Notes

- The `parallel` parameter defaults to `true` and maps to `--parallel` for concurrent test execution
- The `filter` parameter is validated against flag injection
- Test case names use the `Suite.testMethod` format (e.g., `MyAppTests.testAddition`)
- Test statuses can be `"passed"`, `"failed"`, or `"skipped"`
- Each test case includes an optional `duration` field in seconds
- Compact mode drops the `testCases` array, keeping only summary counts and duration
