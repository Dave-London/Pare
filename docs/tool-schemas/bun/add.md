# bun > add

Runs `bun add` to add one or more packages and returns structured output.

**Command**: `bun add <packages>`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `packages` | string[] | —       | Package names to add (required, e.g. `["typescript", "zod@3.22"]`) |
| `dev`      | boolean  | `false` | Add as devDependency (--dev / -D)                          |
| `exact`    | boolean  | —       | Add exact version (--exact)                                |
| `path`     | string   | cwd     | Project root path                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Package Added

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ bun add zod
bun add v1.1.0 (abcdef01)

 installed zod@3.23.8

 1 package installed [85ms]
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "packages": ["zod"],
  "dev": false,
  "duration": 85,
  "stdout": " installed zod@3.23.8\n\n 1 package installed [85ms]"
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
  "packages": ["zod"],
  "dev": false,
  "duration": 85
}
```

</td>
</tr>
</table>

## Error — Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ bun add nonexistent-pkg-xyz
bun add v1.1.0 (abcdef01)

error: package "nonexistent-pkg-xyz" not found
GET https://registry.npmjs.org/nonexistent-pkg-xyz - 404
```

</td>
<td>

~45 tokens

```json
{
  "success": false,
  "packages": ["nonexistent-pkg-xyz"],
  "dev": false,
  "duration": 420,
  "stderr": "error: package \"nonexistent-pkg-xyz\" not found\nGET https://registry.npmjs.org/nonexistent-pkg-xyz - 404"
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
  "packages": ["nonexistent-pkg-xyz"],
  "dev": false,
  "duration": 420
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Package added     | ~50        | ~40       | ~20          | 20-60%  |
| Package not found | ~60        | ~45       | ~25          | 25-58%  |

## Notes

- Package names are validated against flag injection
- The `dev` field in the response reflects whether packages were added as devDependencies
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `success`, `packages`, `dev`, and `duration`
