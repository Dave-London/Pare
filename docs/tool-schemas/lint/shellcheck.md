# lint > shellcheck

Runs ShellCheck (shell script linter) and returns structured diagnostics (file, line, rule, severity, message).

**Command**: `shellcheck --format=json <files>`

## Input Parameters

| Parameter  | Type                                               | Default | Description                                                |
| ---------- | -------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `path`     | string                                             | cwd     | Project root path                                          |
| `patterns` | string[]                                           | `["."]` | File patterns to check                                     |
| `severity` | `"error"` \| `"warning"` \| `"info"` \| `"style"` | --      | Minimum severity level to report (default: style)          |
| `compact`  | boolean                                            | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ shellcheck deploy.sh

(no output — clean exit)
```

</td>
<td>

~25 tokens

```json
{
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0,
  "filesChecked": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no diagnostics).

</td>
</tr>
</table>

## Success — With Diagnostics

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
$ shellcheck --format=json deploy.sh setup.sh

In deploy.sh line 8:
  rm -rf $DEPLOY_DIR/*
         ^----------^ SC2086: Double quote to prevent globbing and word splitting.

In deploy.sh line 15:
  if [ $STATUS == 0 ]; then
       ^------^ SC2086: Double quote to prevent globbing and word splitting.

In setup.sh line 3:
  echo $1
       ^-- SC2086: Double quote to prevent globbing and word splitting.

In setup.sh line 12:
  cat /etc/passwd | grep root
                    ^-- SC2002: Useless cat. Consider 'cmd < file | ..' or 'cmd file | ..' instead.

Found 4 issues (0 errors, 2 warnings, 2 info).
```

</td>
<td>

~120 tokens

```json
{
  "diagnostics": [
    {
      "file": "deploy.sh",
      "line": 8,
      "severity": "warning",
      "rule": "SC2086",
      "message": "Double quote to prevent globbing and word splitting."
    },
    {
      "file": "deploy.sh",
      "line": 15,
      "severity": "warning",
      "rule": "SC2086",
      "message": "Double quote to prevent globbing and word splitting."
    },
    {
      "file": "setup.sh",
      "line": 3,
      "severity": "info",
      "rule": "SC2086",
      "message": "Double quote to prevent globbing and word splitting."
    },
    {
      "file": "setup.sh",
      "line": 12,
      "severity": "info",
      "rule": "SC2002",
      "message": "Useless cat. Consider 'cmd < file | ..' or 'cmd file | ..' instead."
    }
  ],
  "total": 4,
  "errors": 0,
  "warnings": 2,
  "filesChecked": 2
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
  "total": 4,
  "errors": 0,
  "warnings": 2,
  "filesChecked": 2
}
```

</td>
</tr>
</table>

## Error — ShellCheck Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: shellcheck: command not found
```

</td>
<td>

~25 tokens

```json
{
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0,
  "filesChecked": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| No issues             | ~20        | ~25       | ~25          | 0%      |
| 4 diagnostics         | ~300       | ~120      | ~20          | 60-93%  |
| ShellCheck not found  | ~30        | ~25       | ~25          | 17%     |

## Notes

- ShellCheck JSON output (`--format=json`) is an array of findings, each with `file`, `line`, `level`, `code`, and `message`
- Rule codes are prefixed with `SC` (e.g., `SC2086`) and mapped from the numeric `code` field
- ShellCheck levels `"style"` and `"info"` both map to `"info"` in the Pare diagnostic schema
- The `severity` parameter maps to `--severity=<level>` to filter findings by minimum severity
- File count in `filesChecked` is derived from unique file paths across diagnostics
- Compact mode drops the `diagnostics` array entirely, keeping only aggregate counts
