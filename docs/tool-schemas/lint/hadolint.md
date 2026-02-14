# lint > hadolint

Runs Hadolint (Dockerfile linter) and returns structured diagnostics (file, line, rule, severity, message).

**Command**: `hadolint --format=json Dockerfile`

## Input Parameters

| Parameter           | Type     | Default          | Description                                                |
| ------------------- | -------- | ---------------- | ---------------------------------------------------------- |
| `path`              | string   | cwd              | Project root path                                          |
| `patterns`          | string[] | `["Dockerfile"]` | Dockerfile paths to check                                  |
| `trustedRegistries` | string[] | --               | Trusted Docker registries (e.g., `["docker.io", "ghcr.io"]`) |
| `ignoreRules`       | string[] | --               | Rule codes to ignore (e.g., `["DL3008", "DL3013"]`)       |
| `compact`           | boolean  | `true`           | Auto-compact when structured output exceeds raw CLI tokens |

## Success — No Issues

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ hadolint Dockerfile

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

~250 tokens

```
$ hadolint Dockerfile

Dockerfile:3 DL3008 warning: Pin versions in apt get install.
  Instead of `apt-get install <package>` use `apt-get install <package>=<version>`

Dockerfile:7 DL3013 warning: Pin versions in pip install.
  Instead of `pip install <package>` use `pip install <package>==<version>`

Dockerfile:12 DL3025 error: Use arguments JSON notation for CMD and ENTRYPOINT arguments
  Instead of `CMD npm start` use `CMD ["npm", "start"]`

3 issues found.
```

</td>
<td>

~100 tokens

```json
{
  "diagnostics": [
    {
      "file": "Dockerfile",
      "line": 3,
      "severity": "warning",
      "rule": "DL3008",
      "message": "Pin versions in apt get install."
    },
    {
      "file": "Dockerfile",
      "line": 7,
      "severity": "warning",
      "rule": "DL3013",
      "message": "Pin versions in pip install."
    },
    {
      "file": "Dockerfile",
      "line": 12,
      "severity": "error",
      "rule": "DL3025",
      "message": "Use arguments JSON notation for CMD and ENTRYPOINT arguments"
    }
  ],
  "total": 3,
  "errors": 1,
  "warnings": 2,
  "filesChecked": 1
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
  "total": 3,
  "errors": 1,
  "warnings": 2,
  "filesChecked": 1
}
```

</td>
</tr>
</table>

## Error — Hadolint Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: hadolint: command not found
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

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| No issues           | ~15        | ~25       | ~25          | 0%      |
| 3 diagnostics       | ~250       | ~100      | ~20          | 60-92%  |
| Hadolint not found  | ~30        | ~25       | ~25          | 17%     |

## Notes

- Hadolint JSON output (`--format=json`) is an array of findings, each with `file`, `line`, `level`, `code` (string like `"DL3008"`), and `message`
- Hadolint levels `"style"` and `"info"` both map to `"info"` in the Pare diagnostic schema
- The `trustedRegistries` parameter maps to `--trusted-registry=<registry>` for each entry, allowing images from those registries without triggering `DL3026`
- The `ignoreRules` parameter maps to `--ignore=<rule>` for each entry, suppressing specific rule codes
- Default patterns is `["Dockerfile"]` (unlike other lint tools which default to `["."]`)
- Compact mode drops the `diagnostics` array entirely, keeping only aggregate counts
