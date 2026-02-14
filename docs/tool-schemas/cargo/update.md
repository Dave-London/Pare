# cargo > update

Updates dependencies in the lock file and returns structured output.

**Command**: `cargo update`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `package` | string  | --      | Specific package to update (e.g. `serde`). Omit to update all. |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Updating All Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
    Updating crates.io index
     Locking 3 packages to latest compatible versions
    Updating serde v1.0.215 -> v1.0.217
    Updating serde_derive v1.0.215 -> v1.0.217
    Updating tokio v1.41.0 -> v1.42.0
```

</td>
<td>

~60 tokens

```json
{
  "success": true,
  "output": "Updating crates.io index\n Locking 3 packages to latest compatible versions\nUpdating serde v1.0.215 -> v1.0.217\nUpdating serde_derive v1.0.215 -> v1.0.217\nUpdating tokio v1.41.0 -> v1.42.0"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "success": true
}
```

</td>
</tr>
</table>

## Success — Already Up to Date

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
    Updating crates.io index
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "output": "Updating crates.io index"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "success": true
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 3 packages updated | ~200       | ~60       | ~5           | 70-98%  |
| Already up to date | ~30        | ~15       | ~5           | 50-83%  |

## Notes

- The `package` parameter uses `-p` to update a single crate (e.g., `cargo update -p serde`)
- The `package` parameter is validated against flag injection
- Full mode returns the raw combined stdout/stderr as the `output` field
- Compact mode drops the output text entirely, keeping only the `success` flag
- Only updates `Cargo.lock` -- does not modify `Cargo.toml` version constraints
