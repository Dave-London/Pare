# npm > list

Lists installed packages as structured dependency data with version information. Auto-detects package manager via lock files.

**Command**: `npm ls --json --depth=0` / `pnpm list --json --depth=0` / `yarn list --json --depth=0`

## Input Parameters

| Parameter        | Type                            | Default     | Description                                                                           |
| ---------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `path`           | string                          | cwd         | Project root path                                                                     |
| `depth`          | number                          | `0`         | Dependency tree depth (0 = top-level only)                                            |
| `compact`        | boolean                         | `true`      | Auto-compact when structured output exceeds raw CLI tokens. Set false for full schema |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified                |
| `filter`         | string                          | —           | pnpm workspace filter pattern (e.g., `@scope/pkg`). Only used with pnpm               |

## Success — Top-Level Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
my-app@1.0.0 /home/user/my-app
├── express@4.18.3
├── lodash@4.17.21
├── typescript@5.7.2
└── vitest@4.0.1
```

</td>
<td>

~60 tokens

```json
{
  "packageManager": "npm",
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": { "version": "4.18.3" },
    "lodash": { "version": "4.17.21" },
    "typescript": { "version": "5.7.2" },
    "vitest": { "version": "4.0.1" }
  },
  "total": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~45 tokens — flattens nested dependencies into a `name -> version` string map.

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "4.18.3",
    "lodash": "4.17.21",
    "typescript": "5.7.2",
    "vitest": "4.0.1"
  },
  "total": 4
}
```

</td>
</tr>
</table>

## Success — Nested Dependencies (depth=1)

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
my-app@1.0.0 /home/user/my-app
├─┬ express@4.18.3
│ ├── accepts@1.3.8
│ ├── body-parser@1.20.2
│ └── cookie@0.6.0
├── lodash@4.17.21
└─┬ vitest@4.0.1
  ├── @vitest/runner@4.0.1
  └── tinybench@2.6.0
```

</td>
<td>

~100 tokens

```json
{
  "packageManager": "npm",
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": {
      "version": "4.18.3",
      "dependencies": {
        "accepts": { "version": "1.3.8" },
        "body-parser": { "version": "1.20.2" },
        "cookie": { "version": "0.6.0" }
      }
    },
    "lodash": { "version": "4.17.21" },
    "vitest": {
      "version": "4.0.1",
      "dependencies": {
        "@vitest/runner": { "version": "4.0.1" },
        "tinybench": { "version": "2.6.0" }
      }
    }
  },
  "total": 8
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~70 tokens — flattens nested deps with `>` separator.

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "4.18.3",
    "express>accepts": "1.3.8",
    "express>body-parser": "1.20.2",
    "express>cookie": "0.6.0",
    "lodash": "4.17.21",
    "vitest": "4.0.1",
    "vitest>@vitest/runner": "4.0.1",
    "vitest>tinybench": "2.6.0"
  },
  "total": 8
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| 4 top-level deps | ~100       | ~60       | ~45          | 40–55%  |
| 8 deps (depth=1) | ~250       | ~100      | ~70          | 60–72%  |

## Notes

- Default depth is 0 (top-level dependencies only). Increase depth to see transitive dependencies
- Compact mode flattens the nested dependency tree into a flat `name -> version` string map, using `>` as a path separator for nested deps (e.g., `express>accepts`)
- pnpm returns an array of workspace entries; the tool normalizes this to a single object matching npm's format
- Yarn Classic output uses a different JSON structure (`{ type: "tree", data: { trees: [...] } }`), which is parsed separately
