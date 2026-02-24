# bun > pm-ls

Runs `bun pm ls` to list installed packages and returns structured package info.

**Command**: `bun pm ls`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `all`     | boolean | —       | Show all transitive dependencies (--all)                   |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — List Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
$ bun pm ls
/home/user/my-app node_modules (148)
├── @types/node@22.5.0
├── typescript@5.6.2
├── vitest@2.1.0
├── zod@3.23.8
└── esbuild@0.23.0
```

</td>
<td>

~70 tokens

```json
{
  "success": true,
  "packages": [
    { "name": "@types/node", "version": "22.5.0" },
    { "name": "typescript", "version": "5.6.2" },
    { "name": "vitest", "version": "2.1.0" },
    { "name": "zod", "version": "3.23.8" },
    { "name": "esbuild", "version": "0.23.0" }
  ],
  "total": 5,
  "duration": 120
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
  "total": 5,
  "duration": 120
}
```

</td>
</tr>
</table>

## Success — Empty Project

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ bun pm ls
/home/user/empty-app node_modules (0)
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "packages": [],
  "total": 0,
  "duration": 45
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
  "total": 0,
  "duration": 45
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| 5 packages    | ~100       | ~70       | ~15          | 30-85%  |
| Empty project | ~20        | ~15       | ~15          | 25%     |

## Notes

- The `all` flag shows transitive dependencies in addition to direct dependencies
- Each package entry includes `name` and optionally `version`
- Compact mode drops the `packages` array, keeping only `success`, `total`, and `duration`
- The `total` field reflects the count of packages in the `packages` array
