# process > run

Runs a command and returns structured output with stdout, stderr, exit code, duration, and timeout status. Use instead of running commands directly in the terminal.

**Command**: `<command> [args...]`

## Input Parameters

| Parameter | Type                   | Default      | Description                                                |
| --------- | ---------------------- | ------------ | ---------------------------------------------------------- |
| `command` | string                 | _(required)_ | Command to run (e.g., `node`, `python`, `echo`)            |
| `args`    | string[]               | `[]`         | Arguments to pass to the command                           |
| `cwd`     | string                 | cwd          | Working directory                                          |
| `timeout` | number                 | `60000`      | Timeout in milliseconds (min: 1, max: 600000)              |
| `env`     | Record<string, string> | —            | Additional environment variables as key-value pairs        |
| `compact` | boolean                | `true`       | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Command Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ node -e "console.log('hello world')"
hello world
```

</td>
<td>

~45 tokens

```json
{
  "command": "node",
  "exitCode": 0,
  "success": true,
  "stdout": "hello world",
  "stderr": "",
  "duration": 128,
  "timedOut": false
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
  "command": "node",
  "exitCode": 0,
  "success": true,
  "duration": 128,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Command Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ python script.py
Traceback (most recent call last):
  File "script.py", line 3, in <module>
    import nonexistent_module
ModuleNotFoundError: No module named 'nonexistent_module'
```

</td>
<td>

~55 tokens

```json
{
  "command": "python",
  "exitCode": 1,
  "success": false,
  "stdout": "",
  "stderr": "Traceback (most recent call last):\n  File \"script.py\", line 3, in <module>\n    import nonexistent_module\nModuleNotFoundError: No module named 'nonexistent_module'",
  "duration": 214,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Command Times Out

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~15 tokens

```
$ sleep 120
(killed after timeout)
```

</td>
<td>

~50 tokens

```json
{
  "command": "sleep",
  "exitCode": 124,
  "success": false,
  "stdout": "",
  "stderr": "Command timed out after 60000ms and was killed (SIGTERM).",
  "duration": 60012,
  "timedOut": true,
  "signal": "SIGTERM"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Command succeeds  | ~40        | ~45       | ~30          | 25%     |
| Command fails     | ~60        | ~55       | ~30          | 8-50%   |
| Command times out | ~15        | ~50       | ~30          | —       |

## Notes

- The `command` parameter is validated against a configurable allow/deny policy before execution
- The `cwd` parameter is validated against allowed root directories for security
- The `signal` field is only present when the command is killed due to timeout (e.g., `SIGTERM`)
- Exit code 124 is used as the standard timeout exit code, matching Unix conventions
- Environment variables from `env` are merged with the current process environment
- Both stdout and stderr are captured and returned separately
- The `success` field is a convenience boolean derived from `exitCode === 0`
- Compact mode drops `stdout` and `stderr` fields when the structured output exceeds raw CLI token count
