# lint > format-check

Checks if files are formatted with Prettier and returns a structured list of files needing formatting.

**Command**: `prettier --check .`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | cwd     | Project root path                                          |
| `patterns` | string[] | `["."]` | File patterns to check                                     |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Formatted

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
Checking formatting...
All matched files use Prettier code style!
```

</td>
<td>

~15 tokens

```json
{
  "formatted": true,
  "files": [],
  "total": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when all files are formatted).

</td>
</tr>
</table>

## Success — Files Need Formatting

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
Checking formatting...
[warn] src/index.ts
[warn] src/utils.ts
[warn] src/components/App.tsx
[warn] tests/helpers.ts
[warn] Code style issues found in the above file(s). Forgot to run Prettier?
```

</td>
<td>

~40 tokens

```json
{
  "formatted": false,
  "files": [
    "src/index.ts",
    "src/utils.ts",
    "src/components/App.tsx",
    "tests/helpers.ts"
  ],
  "total": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "formatted": false,
  "total": 4
}
```

</td>
</tr>
</table>

## Error — Prettier Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
sh: prettier: command not found
```

</td>
<td>

~15 tokens

```json
{
  "formatted": false,
  "files": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| All formatted          | ~40        | ~15       | ~15          | 63%     |
| 4 files need formatting | ~120      | ~40       | ~10          | 67-92%  |
| Prettier not found     | ~30        | ~15       | ~15          | 50%     |

## Notes

- Prettier `--check` exits with code 1 when files need formatting and code 0 when all files pass
- File paths are extracted from `[warn]`-prefixed lines in the Prettier output
- Compact mode drops the `files` array, keeping only `formatted` and `total`
- Input patterns are validated against flag injection
