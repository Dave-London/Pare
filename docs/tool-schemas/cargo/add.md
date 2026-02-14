# cargo > add

Adds dependencies to a Rust project and returns structured output with added packages.

**Command**: `cargo add <packages>`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `packages` | string[] | --      | Packages to add (e.g. `["serde", "tokio@1.0"]`)           |
| `dev`      | boolean  | `false` | Add as dev dependency (--dev)                              |
| `features` | string[] | --      | Features to enable (e.g. `["derive", "full"]`)             |
| `dryRun`   | boolean  | `false` | Preview without modifying Cargo.toml (--dry-run)           |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Adding Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
    Updating crates.io index
      Adding serde v1.0.217 to dependencies
             Features:
             + derive
             + serde_derive
             + std
      Adding tokio v1.42.0 to dependencies
             Features:
             + full
             + io-util
             + macros
             + net
             + rt-multi-thread
```

</td>
<td>

~45 tokens

```json
{
  "success": true,
  "added": [
    { "name": "serde", "version": "1.0.217" },
    { "name": "tokio", "version": "1.42.0" }
  ],
  "total": 2
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
  "success": true,
  "packages": ["serde", "tokio"],
  "total": 2
}
```

</td>
</tr>
</table>

## Error — Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~60 tokens

```
    Updating crates.io index
error: could not find `nonexistent-crate` in registry `crates-io`
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "added": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Adding 2 packages  | ~150       | ~45       | ~20          | 70-87%  |
| Package not found  | ~60        | ~15       | ~15          | 75%     |

## Notes

- Package names and features are validated against flag injection before execution
- The `dryRun` flag appends `--dry-run` to preview changes without modifying `Cargo.toml`
- The `dev` flag uses `--dev` to add packages to `[dev-dependencies]`
- Features are joined with commas and passed via `--features`
- Compact mode drops version details, keeping only package names
- WARNING: Adding crates downloads and compiles third-party code which may include build scripts (`build.rs`). Only add trusted crates.
