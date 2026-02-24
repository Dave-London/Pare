# jvm > maven-build

Runs `mvn package` (or specified goals) and returns structured build output with diagnostics.

**Command**: `mvn package`

## Input Parameters

| Parameter | Type     | Default       | Description                                                |
| --------- | -------- | ------------- | ---------------------------------------------------------- |
| `path`    | string   | cwd           | Project root path                                          |
| `goals`   | string[] | `["package"]` | Maven goals to run (default: package)                      |
| `args`    | string[] | `[]`          | Additional Maven arguments                                 |
| `compact` | boolean  | `true`        | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Build Succeeds

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
[INFO] Scanning for projects...
[INFO]
[INFO] ----------------------< com.example:myapp >-----------------------
[INFO] Building myapp 1.0-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- resources:3.3.1:resources (default-resources) @ myapp ---
[INFO] Copying 1 resource from src/main/resources to target/classes
[INFO]
[INFO] --- compiler:3.12.1:compile (default-compile) @ myapp ---
[INFO] Nothing to compile - all classes are up to date
[INFO]
[INFO] --- jar:3.3.0:jar (default-jar) @ myapp ---
[INFO] Building jar: /home/user/myapp/target/myapp-1.0-SNAPSHOT.jar
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  2.345 s
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 2400,
  "timedOut": false
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal on success).

</td>
</tr>
</table>

## Error — Compilation Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~500 tokens

```
[INFO] Scanning for projects...
[INFO]
[INFO] ----------------------< com.example:myapp >-----------------------
[INFO] Building myapp 1.0-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- compiler:3.12.1:compile (default-compile) @ myapp ---
[ERROR] /home/user/myapp/src/main/java/com/example/App.java:[10,20] cannot find symbol
  symbol:   method unknownMethod()
  location: class com.example.App
[ERROR] /home/user/myapp/src/main/java/com/example/App.java:[15,9] incompatible types: String cannot be converted to int
[INFO] 2 errors
[INFO] ------------------------------------------------------------------------
[INFO] BUILD FAILURE
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  1.234 s
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 1300,
  "timedOut": false,
  "diagnostics": [
    {
      "severity": "error",
      "message": "cannot find symbol",
      "file": "/home/user/myapp/src/main/java/com/example/App.java",
      "line": 10
    },
    {
      "severity": "error",
      "message": "incompatible types: String cannot be converted to int",
      "file": "/home/user/myapp/src/main/java/com/example/App.java",
      "line": 15
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
  "duration": 1300,
  "timedOut": false,
  "diagnostics": [
    {
      "severity": "error",
      "message": "cannot find symbol",
      "file": "/home/user/myapp/src/main/java/com/example/App.java",
      "line": 10
    },
    {
      "severity": "error",
      "message": "incompatible types: String cannot be converted to int",
      "file": "/home/user/myapp/src/main/java/com/example/App.java",
      "line": 15
    }
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| Successful build     | ~400       | ~30       | ~30          | 93%     |
| Compilation failure  | ~500       | ~80       | ~50          | 84-90%  |

## Notes

- The `goals` parameter accepts Maven lifecycle phases and plugin goals (e.g. `["clean", "package"]`)
- Goal names are validated against flag injection before execution
- The `args` parameter allows additional Maven flags (e.g. `["-DskipTests", "-pl", "module-a"]`)
- The `duration` field is in milliseconds, measured from the Node.js process
- Diagnostics are parsed from `[ERROR]` lines in Maven output with file:line patterns
- Compact mode drops `stdout`, `stderr`, `tasksExecuted`, and `tasksFailed`; diagnostics are preserved
- The `timedOut` field is `true` if the build exceeded the timeout limit
