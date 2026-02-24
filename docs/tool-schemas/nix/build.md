# nix > build

Builds a Nix derivation and returns structured output paths and diagnostics.

**Command**: `nix build <installable> --print-out-paths`

## Input Parameters

| Parameter     | Type    | Default | Description                                                |
| ------------- | ------- | ------- | ---------------------------------------------------------- |
| `installable` | string  | `"."`   | Installable reference (e.g. `.#package`, `nixpkgs#hello`)  |
| `outLink`     | string  | —       | Output link path (`--out-link`)                            |
| `noLink`      | boolean | —       | Do not create output link (`--no-link`)                    |
| `path`        | string  | cwd     | Project root path                                          |
| `compact`     | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Build Package

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ nix build .#default --print-out-paths
/nix/store/abc123def456-myapp-1.0.0
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "outputs": [
    { "path": "/nix/store/abc123def456-myapp-1.0.0" }
  ],
  "duration": 12450,
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
  "outputCount": 1,
  "duration": 12450,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Success — Multiple Outputs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ nix build .#default --print-out-paths
/nix/store/abc123def456-myapp-1.0.0
/nix/store/xyz789ghi012-myapp-1.0.0-dev
/nix/store/jkl345mno678-myapp-1.0.0-doc
```

</td>
<td>

~70 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "outputs": [
    { "path": "/nix/store/abc123def456-myapp-1.0.0" },
    { "path": "/nix/store/xyz789ghi012-myapp-1.0.0-dev" },
    { "path": "/nix/store/jkl345mno678-myapp-1.0.0-doc" }
  ],
  "duration": 28300,
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
  "outputCount": 3,
  "duration": 28300,
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

~150 tokens

```
$ nix build .#default --print-out-paths
error: builder for '/nix/store/abc123-myapp-1.0.0.drv' failed with exit code 1;
       last 10 log lines:
       > Running phase: buildPhase
       > build flags: SHELL=/nix/store/xyz-bash-5.2/bin/bash
       > src/main.c:15:10: fatal error: missing_header.h: No such file or directory
       >    15 | #include "missing_header.h"
       >       |          ^~~~~~~~~~~~~~~~~~
       > compilation terminated.
       For full logs, run 'nix log /nix/store/abc123-myapp-1.0.0.drv'.
```

</td>
<td>

~55 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "outputs": [],
  "errors": [
    "builder for '/nix/store/abc123-myapp-1.0.0.drv' failed with exit code 1;"
  ],
  "duration": 8200,
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
  "outputCount": 0,
  "duration": 8200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Single output    | ~60        | ~50       | ~25          | 17-58%  |
| Multiple outputs | ~80        | ~70       | ~25          | 13-69%  |
| Build failure    | ~150       | ~55       | ~25          | 63-83%  |

## Notes

- Always uses `--print-out-paths` to capture output store paths from stdout
- Output paths are filtered to only include lines starting with `/nix/store/`
- Errors are extracted from stderr lines starting with `error:`
- The `timedOut` flag is set when the build exceeds the configured timeout
- Compact mode drops the `outputs` array and `errors`, replacing with `outputCount`
- The `noLink` option is useful in CI where symlinks are unnecessary
