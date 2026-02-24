# nix > develop

Enters or queries a Nix dev shell. When a command is provided, runs it inside the dev shell and returns the result.

**Command**: `nix develop <installable> [--command sh -c <command>]`

## Input Parameters

| Parameter     | Type    | Default | Description                                                |
| ------------- | ------- | ------- | ---------------------------------------------------------- |
| `installable` | string  | `"."`   | Installable reference for the dev shell (e.g. `.#devShell`) |
| `command`     | string  | —       | Command to run inside the dev shell (uses `--command`)     |
| `path`        | string  | cwd     | Project root path                                          |
| `compact`     | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Run Command in Dev Shell

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ nix develop . --command sh -c "gcc --version"
gcc (GCC) 13.2.0
Copyright (C) 2023 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "gcc (GCC) 13.2.0\nCopyright (C) 2023 Free Software Foundation, Inc.\nThis is free software; see the source for copying conditions.",
  "duration": 5400,
  "timedOut": false
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
  "exitCode": 0,
  "duration": 5400,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Command Fails in Dev Shell

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~70 tokens

```
$ nix develop . --command sh -c "make test"
Running test suite...
FAIL: test_auth (3 assertions, 1 failures)
  Expected: 200, Got: 401
make: *** [Makefile:28: test] Error 1
```

</td>
<td>

~55 tokens

```json
{
  "success": false,
  "exitCode": 2,
  "stdout": "Running test suite...\nFAIL: test_auth (3 assertions, 1 failures)\n  Expected: 200, Got: 401",
  "stderr": "make: *** [Makefile:28: test] Error 1",
  "duration": 4100,
  "timedOut": false
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
  "exitCode": 2,
  "duration": 4100,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Command in dev shell  | ~50        | ~50       | ~25          | 50%     |
| Command fails         | ~70        | ~55       | ~25          | 21-64%  |

## Notes

- When no `command` is provided, the tool enters the dev shell (useful for verifying the shell builds successfully)
- When a `command` is provided, it is executed via `--command sh -c <command>` inside the dev shell
- Both `stdout` and `stderr` are captured and omitted when empty
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `exitCode`, `duration`, and `timedOut`
- The `timedOut` flag is set when the dev shell or command exceeds the configured timeout
