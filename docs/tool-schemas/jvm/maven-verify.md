# jvm > maven-verify

Runs `mvn verify` to execute all checks (compile, test, integration-test, verify phases) and returns structured results.

**Command**: `mvn verify`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `path`    | string   | cwd     | Project root path                                          |
| `args`    | string[] | `[]`    | Additional Maven arguments                                 |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Verify Passes

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
[INFO] --- resources:3.3.1:resources (default-resources) @ myapp ---
[INFO] --- compiler:3.12.1:compile (default-compile) @ myapp ---
[INFO] --- resources:3.3.1:testResources (default-testResources) @ myapp ---
[INFO] --- compiler:3.12.1:testCompile (default-testCompile) @ myapp ---
[INFO] --- surefire:3.2.3:test (default-test) @ myapp ---
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] --- jar:3.3.0:jar (default-jar) @ myapp ---
[INFO] --- failsafe:3.2.3:integration-test (default) @ myapp ---
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] --- failsafe:3.2.3:verify (default) @ myapp ---
[INFO] BUILD SUCCESS
[INFO] Total time:  8.234 s
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 8300,
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

## Error — Verify Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~600 tokens

```
[INFO] Scanning for projects...
[INFO] ----------------------< com.example:myapp >-----------------------
[INFO] Building myapp 1.0-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] --- compiler:3.12.1:compile (default-compile) @ myapp ---
[INFO] --- surefire:3.2.3:test (default-test) @ myapp ---
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] --- failsafe:3.2.3:integration-test (default) @ myapp ---
[ERROR] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0
[ERROR]   IntegrationTest.testHealthEndpoint:15 expected: <200> but was: <503>
[INFO] --- failsafe:3.2.3:verify (default) @ myapp ---
[ERROR] There are test failures.
[INFO] BUILD FAILURE
[INFO] Total time:  12.567 s
```

</td>
<td>

~60 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 12600,
  "timedOut": false,
  "diagnostics": [
    {
      "severity": "error",
      "message": "There are test failures."
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

~40 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 12600,
  "timedOut": false,
  "diagnostics": [
    {
      "severity": "error",
      "message": "There are test failures."
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
| Verify passes | ~500       | ~30       | ~30          | 94%     |
| Verify fails  | ~600       | ~60       | ~40          | 90-93%  |

## Notes

- Runs the full Maven lifecycle through the `verify` phase (compile, test, integration-test, verify)
- The `args` parameter allows additional Maven flags (e.g. `["-DskipTests", "-Pfailsafe"]`)
- The `duration` field is in milliseconds, measured from the Node.js process
- Diagnostics are parsed from `[ERROR]` lines in Maven output
- Compact mode drops `stdout` and `stderr`; diagnostics are preserved when present
- The `timedOut` field is `true` if the process exceeded the timeout limit
- Useful as a comprehensive pre-merge check that runs all verification phases
