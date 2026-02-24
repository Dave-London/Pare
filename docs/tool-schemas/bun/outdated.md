# bun > outdated

Runs `bun outdated` to check for outdated packages and returns structured version info.

**Command**: `bun outdated`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Outdated Packages Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ bun outdated
┌────────────────┬─────────┬─────────┬────────┐
│ Package        │ Current │ Latest  │ Wanted │
├────────────────┼─────────┼─────────┼────────┤
│ typescript     │ 5.4.5   │ 5.6.2   │ 5.6.2  │
│ @types/node    │ 20.14.0 │ 22.5.0  │ 22.5.0 │
│ vitest         │ 1.6.0   │ 2.1.0   │ 2.1.0  │
└────────────────┴─────────┴─────────┴────────┘
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "packages": [
    { "name": "typescript", "current": "5.4.5", "latest": "5.6.2", "wanted": "5.6.2" },
    { "name": "@types/node", "current": "20.14.0", "latest": "22.5.0", "wanted": "22.5.0" },
    { "name": "vitest", "current": "1.6.0", "latest": "2.1.0", "wanted": "2.1.0" }
  ],
  "total": 3,
  "duration": 650
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
  "total": 3,
  "duration": 650
}
```

</td>
</tr>
</table>

## Success — All Packages Up to Date

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ bun outdated
All packages are up to date.
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "packages": [],
  "total": 0,
  "duration": 280
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
  "duration": 280
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| 3 outdated pkgs   | ~120       | ~80       | ~15          | 33-88%  |
| All up to date    | ~15        | ~15       | ~15          | 0%      |

## Notes

- Each outdated package includes `name`, `current`, `latest`, and optionally `wanted` version fields
- Compact mode drops the `packages` array, keeping only `success`, `total`, and `duration`
- The `wanted` field represents the highest version matching the semver range in package.json
