# jvm > gradle-build

Runs `gradle build` and returns structured output with diagnostics, task counts, and exit code.

**Command**: `gradle build`

## Input Parameters

| Parameter | Type     | Default     | Description                                                |
| --------- | -------- | ----------- | ---------------------------------------------------------- |
| `path`    | string   | cwd         | Project root path                                          |
| `tasks`   | string[] | `["build"]` | Gradle tasks to run (default: build)                       |
| `args`    | string[] | `[]`        | Additional Gradle arguments                                |
| `compact` | boolean  | `true`      | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Build

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
> Task :compileJava
> Task :processResources
> Task :classes
> Task :jar
> Task :assemble
> Task :compileTestJava
> Task :processTestResources NO-SOURCE
> Task :testClasses
> Task :test
> Task :check
> Task :build

BUILD SUCCESSFUL in 4s
10 actionable tasks: 10 executed
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 4200,
  "timedOut": false,
  "tasksExecuted": 10,
  "tasksFailed": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 4200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Build Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
> Task :compileJava FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':compileJava'.
> Compilation failed; see the compiler error output for details.

* Try:
> Run with --stacktrace option to get the stack trace.

/home/user/myapp/src/main/java/com/example/App.java:10: error: cannot find symbol
        String result = unknownMethod();
                        ^
  symbol:   method unknownMethod()
  location: class App

BUILD FAILED in 2s
1 actionable task: 1 executed
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 2100,
  "timedOut": false,
  "tasksExecuted": 1,
  "tasksFailed": 1,
  "diagnostics": [
    {
      "severity": "error",
      "message": "cannot find symbol",
      "file": "/home/user/myapp/src/main/java/com/example/App.java",
      "line": 10
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

~50 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 2100,
  "timedOut": false,
  "diagnostics": [
    {
      "severity": "error",
      "message": "cannot find symbol",
      "file": "/home/user/myapp/src/main/java/com/example/App.java",
      "line": 10
    }
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Clean build   | ~200       | ~40       | ~20          | 80-90%  |
| Build failure | ~400       | ~80       | ~50          | 80-88%  |

## Notes

- The `tasks` parameter accepts multiple Gradle task names (e.g. `["clean", "build"]`)
- The `args` parameter allows passing additional Gradle flags (e.g. `["--stacktrace"]`)
- Task names are validated against flag injection before execution
- The `duration` field is in milliseconds, measured from the Node.js process
- The `timedOut` field is `true` if the build exceeded the timeout limit
- Compact mode drops `tasksExecuted`, `tasksFailed`, `stdout`, and `stderr`; diagnostics are preserved
