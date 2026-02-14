# cargo > remove

Removes dependencies from a Rust project and returns structured output with removed package names.

**Command**: `cargo remove <packages>`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `packages` | string[] | --      | Package names to remove                                    |
| `dev`      | boolean  | `false` | Remove from dev dependencies (--dev)                       |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Removing Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
    Removing serde from dependencies
    Removing tokio from dependencies
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "removed": ["serde", "tokio"],
  "total": 2
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (compact retains the same fields for remove).

</td>
</tr>
</table>

## Error — Package Not in Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~60 tokens

```
error: the dependency `nonexistent` could not be found in `dependencies`
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "removed": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| Removing 2 packages | ~80        | ~25       | ~25          | 69%     |
| Package not found   | ~60        | ~15       | ~15          | 75%     |

## Notes

- Package names are validated against flag injection before execution
- The `dev` flag uses `--dev` to remove from `[dev-dependencies]`
- Parses `Removing <name> from dependencies` lines from combined stdout/stderr
- Compact mode retains the same fields since the output is already minimal
