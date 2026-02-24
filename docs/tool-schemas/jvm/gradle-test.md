# jvm > gradle-test

Runs `gradle test` and returns structured test results with pass/fail counts and individual test outcomes.

**Command**: `gradle test`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `filter`  | string   | --      | Test filter pattern (passed via --tests)                   |
| `args`    | string[] | `[]`    | Additional Gradle arguments                                |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
> Task :compileJava UP-TO-DATE
> Task :processResources NO-SOURCE
> Task :classes UP-TO-DATE
> Task :compileTestJava UP-TO-DATE
> Task :processTestResources NO-SOURCE
> Task :testClasses UP-TO-DATE
> Task :test

com.example.UserServiceTest > testCreateUser PASSED
com.example.UserServiceTest > testDeleteUser PASSED
com.example.OrderServiceTest > testPlaceOrder PASSED
com.example.OrderServiceTest > testCancelOrder PASSED

BUILD SUCCESSFUL in 3s
4 actionable tasks: 1 executed, 3 up-to-date
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 3100,
  "timedOut": false,
  "totalTests": 4,
  "passed": 4,
  "failed": 0,
  "skipped": 0,
  "tests": [
    { "name": "testCreateUser", "className": "com.example.UserServiceTest", "passed": true, "duration": "0.012s" },
    { "name": "testDeleteUser", "className": "com.example.UserServiceTest", "passed": true, "duration": "0.008s" },
    { "name": "testPlaceOrder", "className": "com.example.OrderServiceTest", "passed": true, "duration": "0.025s" },
    { "name": "testCancelOrder", "className": "com.example.OrderServiceTest", "passed": true, "duration": "0.010s" }
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
  "exitCode": 0,
  "duration": 3100,
  "timedOut": false,
  "totalTests": 4,
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

~500 tokens

```
> Task :test FAILED

com.example.UserServiceTest > testCreateUser PASSED
com.example.UserServiceTest > testDeleteUser PASSED
com.example.OrderServiceTest > testPlaceOrder FAILED
    org.opentest4j.AssertionFailedError: expected: <201> but was: <400>
        at com.example.OrderServiceTest.testPlaceOrder(OrderServiceTest.java:25)
com.example.OrderServiceTest > testCancelOrder FAILED
    java.lang.IllegalStateException: Order not found
        at com.example.OrderServiceTest.testCancelOrder(OrderServiceTest.java:42)

4 tests completed, 2 failed

FAILURE: Build failed with an exception.
BUILD FAILED in 3s
```

</td>
<td>

~120 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 3200,
  "timedOut": false,
  "totalTests": 4,
  "passed": 2,
  "failed": 2,
  "skipped": 0,
  "tests": [
    { "name": "testCreateUser", "className": "com.example.UserServiceTest", "passed": true },
    { "name": "testDeleteUser", "className": "com.example.UserServiceTest", "passed": true },
    { "name": "testPlaceOrder", "className": "com.example.OrderServiceTest", "passed": false, "failure": "expected: <201> but was: <400>" },
    { "name": "testCancelOrder", "className": "com.example.OrderServiceTest", "passed": false, "failure": "Order not found" }
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
  "exitCode": 1,
  "duration": 3200,
  "timedOut": false,
  "totalTests": 4,
  "passed": 2,
  "failed": 2,
  "skipped": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| 4 tests passing     | ~300       | ~100      | ~30          | 67-90%  |
| 4 tests, 2 failures | ~500       | ~120      | ~30          | 76-94%  |

## Notes

- The `filter` parameter maps to `--tests` for Gradle test filtering
- Test results include `name`, `className`, `passed` boolean, optional `duration`, and optional `failure` message
- The `duration` field at the top level is in milliseconds (measured by Node.js), while per-test duration is a string from Gradle
- Compact mode drops the `tests` array and `stdout`/`stderr`, keeping only aggregate counts
- The `timedOut` field is `true` if the test process exceeded the timeout limit
