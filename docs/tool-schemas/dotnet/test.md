# dotnet > test

Runs dotnet test and returns structured test results (name, status, pass/fail counts).

**Command**: `dotnet test --logger console;verbosity=detailed`

## Input Parameters

| Parameter       | Type    | Default | Description                                                        |
| --------------- | ------- | ------- | ------------------------------------------------------------------ |
| `path`          | string  | cwd     | Project root path                                                  |
| `project`       | string  | --      | Path to the test project or solution file                          |
| `filter`        | string  | --      | Filter expression to select tests (--filter)                       |
| `configuration` | string  | --      | Build configuration (e.g. Debug, Release)                          |
| `framework`     | string  | --      | Target framework (e.g. net8.0)                                     |
| `noRestore`     | boolean | `false` | Skip automatic restore before testing (--no-restore)               |
| `noBuild`       | boolean | `false` | Skip build before testing (--no-build)                             |
| `verbosity`     | enum    | --      | MSBuild verbosity level (quiet/minimal/normal/detailed/diagnostic) |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens         |

## Success — All Tests Passing

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
  Determining projects to restore...
  All projects are up-to-date for restore.
  MyApp.Tests -> /home/user/MyApp.Tests/bin/Debug/net8.0/MyApp.Tests.dll
Test run for /home/user/MyApp.Tests/bin/Debug/net8.0/MyApp.Tests.dll (.NETCoreApp,Version=v8.0)
Microsoft (R) Test Execution Command Line Tool Version 17.8.0
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.
  Passed UserServiceTests.CreateUser_ReturnsSuccess [42 ms]
  Passed UserServiceTests.DeleteUser_ReturnsNotFound [12 ms]
  Passed OrderServiceTests.PlaceOrder_ValidInput [28 ms]
  Passed OrderServiceTests.PlaceOrder_InvalidInput_Throws [8 ms]

Passed!  - Failed:     0, Passed:     4, Skipped:     0, Total:     4, Duration: 90 ms
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "total": 4,
  "passed": 4,
  "failed": 0,
  "skipped": 0,
  "tests": [
    {
      "name": "UserServiceTests.CreateUser_ReturnsSuccess",
      "status": "Passed",
      "duration": "42 ms"
    },
    {
      "name": "UserServiceTests.DeleteUser_ReturnsNotFound",
      "status": "Passed",
      "duration": "12 ms"
    },
    { "name": "OrderServiceTests.PlaceOrder_ValidInput", "status": "Passed", "duration": "28 ms" },
    {
      "name": "OrderServiceTests.PlaceOrder_InvalidInput_Throws",
      "status": "Passed",
      "duration": "8 ms"
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
  "success": true,
  "total": 4,
  "passed": 4,
  "failed": 0,
  "skipped": 0,
  "tests": []
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
  MyApp.Tests -> /home/user/MyApp.Tests/bin/Debug/net8.0/MyApp.Tests.dll
Test run for /home/user/MyApp.Tests/bin/Debug/net8.0/MyApp.Tests.dll (.NETCoreApp,Version=v8.0)
Starting test execution, please wait...
A total of 1 test files matched the specified pattern.
  Passed UserServiceTests.CreateUser_ReturnsSuccess [42 ms]
  Failed OrderServiceTests.PlaceOrder_ValidInput [55 ms]
  Error Message:
   Assert.Equal() Failure
          Expected: 201
          Actual:   400
  Stack Trace:
     at MyApp.Tests.OrderServiceTests.PlaceOrder_ValidInput() in /home/user/MyApp.Tests/OrderTests.cs:line 25
  Passed UserServiceTests.DeleteUser_ReturnsNotFound [12 ms]
  Failed OrderServiceTests.CancelOrder_NotFound [18 ms]
  Error Message:
   System.InvalidOperationException : Order not found

Failed!  - Failed:     2, Passed:     2, Skipped:     0, Total:     4, Duration: 127 ms
```

</td>
<td>

~100 tokens

```json
{
  "success": false,
  "total": 4,
  "passed": 2,
  "failed": 2,
  "skipped": 0,
  "tests": [
    {
      "name": "UserServiceTests.CreateUser_ReturnsSuccess",
      "status": "Passed",
      "duration": "42 ms"
    },
    {
      "name": "OrderServiceTests.PlaceOrder_ValidInput",
      "status": "Failed",
      "duration": "55 ms",
      "errorMessage": "Assert.Equal() Failure\n          Expected: 201\n          Actual:   400"
    },
    {
      "name": "UserServiceTests.DeleteUser_ReturnsNotFound",
      "status": "Passed",
      "duration": "12 ms"
    },
    {
      "name": "OrderServiceTests.CancelOrder_NotFound",
      "status": "Failed",
      "duration": "18 ms",
      "errorMessage": "System.InvalidOperationException : Order not found"
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
  "total": 4,
  "passed": 2,
  "failed": 2,
  "skipped": 0,
  "tests": []
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| 4 tests passing     | ~300       | ~80       | ~25          | 73-92%  |
| 4 tests, 2 failures | ~500       | ~100      | ~25          | 80-95%  |

## Notes

- Uses `--logger console;verbosity=detailed` to get per-test results with names and durations
- Test status values are `Passed`, `Failed`, or `Skipped` (matching .NET test framework conventions)
- The `filter` parameter maps to `--filter` for MSTest/xUnit/NUnit filter expressions
- Compact mode drops individual test entries, keeping only aggregate counts
- The `noBuild` flag skips compilation when tests are already built
- The `errorMessage` field is included for failed tests when available
