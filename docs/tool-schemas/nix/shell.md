# nix > shell

Makes packages available in the environment and optionally runs a command. Returns stdout, stderr, exit code, and duration.

**Command**: `nix shell <packages...> [--command sh -c <command>]`

## Input Parameters

| Parameter  | Type     | Default | Description                                                          |
| ---------- | -------- | ------- | -------------------------------------------------------------------- |
| `packages` | string[] | —       | Installable references for packages (e.g. `["nixpkgs#jq", "nixpkgs#curl"]`) (required) |
| `command`  | string   | —       | Command to run with the packages available (uses `--command`)        |
| `path`     | string   | cwd     | Project root path                                                    |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens           |

## Success — Run Command with Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ nix shell nixpkgs#jq nixpkgs#curl --command sh -c "curl -s https://api.example.com | jq .version"
"2.4.1"
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "\"2.4.1\"",
  "duration": 4500,
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
  "duration": 4500,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
$ nix shell nixpkgs#nonexistent-pkg --command sh -c "echo hello"
error: flake 'github:NixOS/nixpkgs/abc123' does not provide attribute 'packages.x86_64-linux.nonexistent-pkg',
       'legacyPackages.x86_64-linux.nonexistent-pkg'
       Did you mean one of existing-pkg or existing-pkg2?
```

</td>
<td>

~55 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "stderr": "error: flake 'github:NixOS/nixpkgs/abc123' does not provide attribute 'packages.x86_64-linux.nonexistent-pkg',\n       'legacyPackages.x86_64-linux.nonexistent-pkg'\n       Did you mean one of existing-pkg or existing-pkg2?",
  "duration": 2100,
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
  "duration": 2100,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Command success   | ~40        | ~40       | ~25          | 38%     |
| Package not found | ~100       | ~55       | ~25          | 45-75%  |

## Notes

- The `packages` parameter is required and accepts an array of installable references
- Each package reference is validated against flag injection
- When no `command` is provided, the shell is entered (useful for verifying packages are available)
- Both `stdout` and `stderr` are captured and omitted when empty
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `exitCode`, `duration`, and `timedOut`
