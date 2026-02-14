# npm > outdated

Checks for outdated packages and returns structured update information with current, wanted, and latest versions. Auto-detects package manager via lock files.

**Command**: `npm outdated --json` / `pnpm outdated --json` / `yarn outdated --json`

## Input Parameters

| Parameter        | Type                             | Default     | Description                                                            |
| ---------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `path`           | string                           | cwd         | Project root path                                                      |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified |
| `filter`         | string                           | —           | pnpm workspace filter pattern (e.g., `@scope/pkg`). Only used with pnpm |

## Success — All Up To Date

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(empty output)
```

</td>
<td>

~15 tokens

```json
{
  "packageManager": "npm",
  "packages": [],
  "total": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for outdated).

</td>
</tr>
</table>

## Success — Outdated Packages Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
Package      Current  Wanted  Latest  Location              Deptype
lodash       4.17.15  4.17.21 4.17.21 node_modules/lodash   dependencies
typescript   5.3.3    5.3.3   5.7.2   node_modules/ts       devDependencies
express      4.18.2   4.18.3  5.0.1   node_modules/express  dependencies
```

</td>
<td>

~70 tokens

```json
{
  "packageManager": "npm",
  "packages": [
    {
      "name": "lodash",
      "current": "4.17.15",
      "wanted": "4.17.21",
      "latest": "4.17.21",
      "location": "node_modules/lodash",
      "type": "dependencies"
    },
    {
      "name": "typescript",
      "current": "5.3.3",
      "wanted": "5.3.3",
      "latest": "5.7.2",
      "location": "node_modules/typescript",
      "type": "devDependencies"
    },
    {
      "name": "express",
      "current": "4.18.2",
      "wanted": "4.18.3",
      "latest": "5.0.1",
      "location": "node_modules/express",
      "type": "dependencies"
    }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Savings |
| ------------------- | ---------- | --------- | ------- |
| All up to date      | ~5         | ~15       | -200%   |
| 3 outdated packages | ~120       | ~70       | 42%     |

## Notes

- `npm outdated` returns exit code 1 when outdated packages are found; this is expected behavior and not treated as an error
- The parser handles both npm-style object format (`{ [name]: { current, wanted, latest } }`) and pnpm array format
- Yarn Classic output uses NDJSON table format, which is parsed separately
- `wanted` is the maximum version satisfying the semver range in package.json; `latest` is the newest version on the registry
- The `location` and `type` fields are optional and may not be present for all package managers
