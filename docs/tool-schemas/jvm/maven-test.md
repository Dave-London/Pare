# jvm > maven-test

Runs `mvn test` and returns structured Surefire test results with pass/fail/error counts.

**Command**: `mvn test`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `filter`  | string   | --      | Test filter pattern (passed via -Dtest=pattern)            |
| `args`    | string[] | `[]`    | Additional Maven arguments                                 |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.example.UserServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.123 s -- in com.example.UserServiceTest
[INFO] Running com.example.OrderServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.089 s -- in com.example.OrderServiceTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
[INFO] Total time:  3.456 s
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 3500,
  "timedOut": false,
  "totalTests": 4,
  "passed": 4,
  "failed": 0,
  "errors": 0,
  "skipped": 0,
  "tests": [
    { "name": "testCreateUser", "className": "com.example.UserServiceTest", "passed": true },
    { "name": "testDeleteUser", "className": "com.example.UserServiceTest", "passed": true },
    { "name": "testPlaceOrder", "className": "com.example.OrderServiceTest", "passed": true },
    { "name": "testCancelOrder", "className": "com.example.OrderServiceTest", "passed": true }
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
  "success": true,
  "exitCode": 0,
  "duration": 3500,
  "timedOut": false,
  "totalTests": 4,
  "passed": 4,
  "failed": 0,
  "errors": 0,
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

~600 tokens

```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.example.UserServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.123 s
[INFO] Running com.example.OrderServiceTest
[ERROR] Tests run: 2, Failures: 1, Errors: 1, Skipped: 0, Time elapsed: 0.234 s <<< FAILURE! -- in com.example.OrderServiceTest
[ERROR] com.example.OrderServiceTest.testPlaceOrder -- Time elapsed: 0.045 s <<< FAILURE!
org.opentest4j.AssertionFailedError: expected: <201> but was: <400>
[ERROR] com.example.OrderServiceTest.testCancelOrder -- Time elapsed: 0.012 s <<< ERROR!
java.lang.IllegalStateException: Order not found
[INFO]
[INFO] Results:
[INFO]
[ERROR] Failures:
[ERROR]   OrderServiceTest.testPlaceOrder:25 expected: <201> but was: <400>
[ERROR] Errors:
[ERROR]   OrderServiceTest.testCancelOrder:42 Order not found
[INFO]
[ERROR] Tests run: 4, Failures: 1, Errors: 1, Skipped: 0
[INFO] BUILD FAILURE
```

</td>
<td>

~120 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 3800,
  "timedOut": false,
  "totalTests": 4,
  "passed": 2,
  "failed": 1,
  "errors": 1,
  "skipped": 0,
  "tests": [
    { "name": "testCreateUser", "className": "com.example.UserServiceTest", "passed": true },
    { "name": "testDeleteUser", "className": "com.example.UserServiceTest", "passed": true },
    {
      "name": "testPlaceOrder",
      "className": "com.example.OrderServiceTest",
      "passed": false,
      "failure": "expected: <201> but was: <400>"
    },
    {
      "name": "testCancelOrder",
      "className": "com.example.OrderServiceTest",
      "passed": false,
      "failure": "Order not found"
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
  "exitCode": 1,
  "duration": 3800,
  "timedOut": false,
  "totalTests": 4,
  "passed": 2,
  "failed": 1,
  "errors": 1,
  "skipped": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------------- | ---------- | --------- | ------------ | ------- |
| 4 tests passing         | ~400       | ~100      | ~35          | 75-91%  |
| 4 tests, 1 fail + 1 err | ~600       | ~120      | ~35          | 80-94%  |

## Notes

- Uses Maven Surefire for test execution; parses the `T E S T S` section of Maven output
- The `filter` parameter maps to `-Dtest=pattern` for Surefire test filtering
- Maven distinguishes between `failed` (assertion failures) and `errors` (exceptions) -- both are tracked
- Test results include `name`, `className`, `passed` boolean, and optional `failure` message
- Compact mode drops the `tests` array and `stdout`/`stderr`, keeping only aggregate counts
- The `timedOut` field is `true` if the test process exceeded the timeout limit
