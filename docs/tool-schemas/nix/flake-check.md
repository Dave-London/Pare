# nix > flake-check

Checks a Nix flake for errors and returns structured check results, warnings, and errors.

**Command**: `nix flake check <flakeRef>`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `flakeRef` | string  | `"."`   | Flake reference (defaults to `.`)                          |
| `path`     | string  | cwd     | Project root path                                          |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Checks Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ nix flake check
warning: Git tree '/home/user/project' is dirty
checking NixOS configuration 'nixosConfigurations.default'...
checking derivation 'checks.x86_64-linux.tests'...
checking derivation 'checks.x86_64-linux.formatting'...
```

</td>
<td>

~90 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "checks": [
    { "name": "nixosConfigurations.default", "status": "pass" },
    { "name": "checks.x86_64-linux.tests", "status": "pass" },
    { "name": "checks.x86_64-linux.formatting", "status": "pass" }
  ],
  "errors": [],
  "warnings": ["Git tree '/home/user/project' is dirty"],
  "duration": 45200,
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
  "success": true,
  "checkCount": 3,
  "errorCount": 0,
  "duration": 45200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Check Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
$ nix flake check
warning: Git tree '/home/user/project' is dirty
checking NixOS configuration 'nixosConfigurations.default'...
checking derivation 'checks.x86_64-linux.tests'...
checking derivation 'checks.x86_64-linux.formatting'...
error: builder for '/nix/store/abc123-formatting-check.drv' failed with exit code 1
error: 1 dependency failed to build
```

</td>
<td>

~100 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "checks": [
    { "name": "nixosConfigurations.default", "status": "unknown" },
    { "name": "checks.x86_64-linux.tests", "status": "unknown" },
    { "name": "checks.x86_64-linux.formatting", "status": "unknown" }
  ],
  "errors": [
    "builder for '/nix/store/abc123-formatting-check.drv' failed with exit code 1",
    "1 dependency failed to build"
  ],
  "warnings": ["Git tree '/home/user/project' is dirty"],
  "duration": 32100,
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
  "success": false,
  "checkCount": 3,
  "errorCount": 2,
  "duration": 32100,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| All checks pass | ~120       | ~90       | ~30          | 25-75%  |
| Check failure   | ~180       | ~100      | ~30          | 44-83%  |

## Notes

- Check names are parsed from stderr lines matching `checking derivation '<name>'...` or `checking NixOS configuration '<name>'...`
- When there are errors, all check statuses are set to `"unknown"` since the tool cannot determine which specific check failed
- When all checks pass (exit code 0), all statuses are set to `"pass"`
- Warnings (e.g. dirty Git tree) and errors are captured separately
- The `errors` and `warnings` arrays are always present (may be empty)
- Compact mode replaces the `checks` array with `checkCount` and `errors` array with `errorCount`
