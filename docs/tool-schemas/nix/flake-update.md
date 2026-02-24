# nix > flake-update

Updates flake lock file inputs and returns structured information about what was updated.

**Command**: `nix flake update [<inputs...>] [--flake <flakeRef>]`

## Input Parameters

| Parameter  | Type     | Default | Description                                                                                |
| ---------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `inputs`   | string[] | —       | Specific inputs to update (e.g. `["nixpkgs", "flake-utils"]`). If omitted, all are updated |
| `flakeRef` | string   | —       | Flake reference (defaults to current directory)                                            |
| `path`     | string   | cwd     | Project root path                                                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens                                 |

## Success — Update All Inputs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ nix flake update
warning: updating lock file '/home/user/project/flake.lock':
* Updated input 'nixpkgs':
    'github:NixOS/nixpkgs/abc1234567890abcdef1234567890abcdef123456' (2025-12-01)
  -> 'github:NixOS/nixpkgs/def4567890abcdef1234567890abcdef12345678' (2026-02-15)
* Updated input 'flake-utils':
    'github:numtide/flake-utils/aaa1111222233334444555566667777888899990000' (2025-11-15)
  -> 'github:numtide/flake-utils/bbb2222333344445555666677778888999900001111' (2026-01-20)
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "updatedInputs": [
    {
      "name": "nixpkgs",
      "oldRev": "abc1234567890abcdef1234567890abcdef123456",
      "newRev": "def4567890abcdef1234567890abcdef12345678"
    },
    {
      "name": "flake-utils",
      "oldRev": "aaa1111222233334444555566667777888899990000",
      "newRev": "bbb2222333344445555666677778888999900001111"
    }
  ],
  "errors": [],
  "duration": 8500,
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
  "updatedCount": 2,
  "duration": 8500,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Lock File Error

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ nix flake update
error: getting status of '/nix/store/abc123-source/flake.nix': No such file or directory
error: cannot update flake; it does not have a lock file
```

</td>
<td>

~50 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "updatedInputs": [],
  "errors": [
    "getting status of '/nix/store/abc123-source/flake.nix': No such file or directory",
    "cannot update flake; it does not have a lock file"
  ],
  "duration": 450,
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
  "updatedCount": 0,
  "duration": 450,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Update all inputs | ~200       | ~80       | ~25          | 60-88%  |
| Lock file error   | ~80        | ~50       | ~25          | 38-69%  |

## Notes

- When `inputs` is omitted, all flake inputs are updated
- When specific `inputs` are provided, only those inputs are updated
- Updated input names, old revisions, and new revisions are parsed from stderr
- Supports both `*` and Unicode bullet (`\u2022`) prefixes in the update output
- Supports both `->` and Unicode arrow (`\u2192`) for the new revision line
- The `errors` array is always present (may be empty)
- Compact mode replaces the `updatedInputs` array with `updatedCount` and drops `errors`
