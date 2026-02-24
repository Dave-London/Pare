# bun > install

Runs `bun install` to install project dependencies and returns structured output with package count.

**Command**: `bun install`

## Input Parameters

| Parameter    | Type    | Default | Description                                                |
| ------------ | ------- | ------- | ---------------------------------------------------------- |
| `frozen`     | boolean | —       | Error if lockfile would change (--frozen-lockfile)          |
| `production` | boolean | —       | Skip devDependencies (--production)                        |
| `path`       | string  | cwd     | Project root path                                          |
| `compact`    | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Install Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ bun install
bun install v1.1.0 (abcdef01)

 + @types/node@22.5.0
 + typescript@5.6.2
 + vitest@2.1.0

 148 packages installed [320ms]
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "installedCount": 148,
  "duration": 320,
  "stdout": " + @types/node@22.5.0\n + typescript@5.6.2\n + vitest@2.1.0\n\n 148 packages installed [320ms]"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "success": true,
  "installedCount": 148,
  "duration": 320
}
```

</td>
</tr>
</table>

## Error — Frozen Lockfile Violation

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~70 tokens

```
$ bun install --frozen-lockfile
bun install v1.1.0 (abcdef01)

error: Lockfile is out of date
The lockfile is not up to date with the package.json. Run `bun install` to update it.
```

</td>
<td>

~45 tokens

```json
{
  "success": false,
  "installedCount": 0,
  "duration": 85,
  "stderr": "error: Lockfile is out of date\nThe lockfile is not up to date with the package.json. Run `bun install` to update it."
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "success": false,
  "installedCount": 0,
  "duration": 85
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Install succeeds | ~60        | ~40       | ~15          | 33-75%  |
| Frozen lockfile  | ~70        | ~45       | ~15          | 36-79%  |

## Notes

- The `frozen` flag maps to `--frozen-lockfile`, which causes the install to fail if the lockfile would change
- The `production` flag maps to `--production`, which skips devDependencies
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `installedCount`, and `duration`
