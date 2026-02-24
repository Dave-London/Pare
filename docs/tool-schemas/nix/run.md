# nix > run

Runs a Nix application from an installable and returns stdout, stderr, exit code, and duration.

**Command**: `nix run <installable> [-- <args>]`

## Input Parameters

| Parameter     | Type     | Default | Description                                                |
| ------------- | -------- | ------- | ---------------------------------------------------------- |
| `installable` | string   | `"."`   | Installable reference (e.g. `.#app`, `nixpkgs#hello`)      |
| `args`        | string[] | `[]`    | Arguments to pass to the application after `--`            |
| `path`        | string   | cwd     | Project root path                                          |
| `compact`     | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Run Application

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ nix run nixpkgs#hello
Hello, world!
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "Hello, world!",
  "duration": 3200,
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
  "duration": 3200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Non-zero Exit

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ nix run .#myapp -- --validate config.yaml
Error: invalid configuration at line 12
  missing required field 'database.host'
  missing required field 'database.port'
```

</td>
<td>

~55 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "stderr": "Error: invalid configuration at line 12\n  missing required field 'database.host'\n  missing required field 'database.port'",
  "duration": 1850,
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
  "exitCode": 1,
  "duration": 1850,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Run success   | ~30        | ~40       | ~25          | 17%     |
| Non-zero exit | ~80        | ~55       | ~25          | 31-69%  |

## Notes

- Arguments after `--` are passed directly to the application
- Both `stdout` and `stderr` are captured and omitted from the response when empty
- The `timedOut` flag is set when the process exceeds the configured timeout (exit code 124)
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `exitCode`, `duration`, and `timedOut`
