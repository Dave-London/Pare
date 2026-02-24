# bun > remove

Runs `bun remove` to remove one or more packages and returns structured output.

**Command**: `bun remove <packages>`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `packages` | string[] | —       | Package names to remove (required)                         |
| `path`     | string   | cwd     | Project root path                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Package Removed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~45 tokens

```
$ bun remove zod
bun remove v1.1.0 (abcdef01)

 - zod@3.23.8

 1 package removed [42ms]
```

</td>
<td>

~35 tokens

```json
{
  "success": true,
  "packages": ["zod"],
  "duration": 42,
  "stdout": " - zod@3.23.8\n\n 1 package removed [42ms]"
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
  "packages": ["zod"],
  "duration": 42
}
```

</td>
</tr>
</table>

## Error — Package Not Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ bun remove nonexistent-pkg
bun remove v1.1.0 (abcdef01)

error: "nonexistent-pkg" is not in a package.json file
```

</td>
<td>

~40 tokens

```json
{
  "success": false,
  "packages": ["nonexistent-pkg"],
  "duration": 30,
  "stderr": "error: \"nonexistent-pkg\" is not in a package.json file"
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
  "packages": ["nonexistent-pkg"],
  "duration": 30
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| Package removed      | ~45        | ~35       | ~15          | 22-67%  |
| Package not installed | ~50       | ~40       | ~15          | 20-70%  |

## Notes

- Package names are validated against flag injection
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `packages`, and `duration`
