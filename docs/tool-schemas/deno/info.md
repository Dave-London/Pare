# deno > info

Runs `deno info` to show dependency information for a module. Returns structured dependency data.

**Command**: `deno info --json [module]`

## Input Parameters

| Parameter | Type    | Default | Description                                                        |
| --------- | ------- | ------- | ------------------------------------------------------------------ |
| `module`  | string  | —       | Module specifier or file path to inspect (shows cache info if omitted) |
| `path`    | string  | cwd     | Project root path                                                  |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens         |

## Success — Module Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ deno info main.ts
local: /home/user/main.ts
type: TypeScript
dependencies: 5 unique
size: 12,345

file:///home/user/main.ts (1.2KB)
├── https://deno.land/std@0.224.0/path/mod.ts (3.4KB)
├── https://deno.land/std@0.224.0/fs/mod.ts (5.1KB)
├── file:///home/user/utils.ts (0.8KB)
├── npm:zod@3.23.8 (1.2KB)
└── file:///home/user/config.ts (0.6KB)
```

</td>
<td>

~120 tokens

```json
{
  "success": true,
  "module": "main.ts",
  "type": "TypeScript",
  "local": "/home/user/main.ts",
  "totalDependencies": 5,
  "totalSize": 12345,
  "dependencies": [
    { "specifier": "https://deno.land/std@0.224.0/path/mod.ts", "type": "remote", "size": 3400 },
    { "specifier": "https://deno.land/std@0.224.0/fs/mod.ts", "type": "remote", "size": 5100 },
    { "specifier": "file:///home/user/utils.ts", "type": "local", "size": 800 },
    { "specifier": "npm:zod@3.23.8", "type": "npm", "size": 1200 },
    { "specifier": "file:///home/user/config.ts", "type": "local", "size": 600 }
  ]
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
  "success": true,
  "module": "main.ts",
  "type": "TypeScript",
  "totalDependencies": 5,
  "totalSize": 12345
}
```

</td>
</tr>
</table>

## Success — No Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ deno info hello.ts
local: /home/user/hello.ts
type: TypeScript
dependencies: 0 unique
size: 256
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "module": "hello.ts",
  "type": "TypeScript",
  "local": "/home/user/hello.ts",
  "totalDependencies": 0,
  "totalSize": 256
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
  "success": true,
  "module": "hello.ts",
  "type": "TypeScript",
  "totalDependencies": 0,
  "totalSize": 256
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 5 dependencies     | ~200       | ~120      | ~25          | 40-88%  |
| No dependencies    | ~50        | ~25       | ~25          | 50%     |

## Notes

- Uses `--json` flag internally for reliable structured parsing
- Falls back to text parsing if JSON output is unavailable
- The `module` parameter is validated against flag injection
- If `module` is omitted, returns cache-level information instead of module-specific data
- Each dependency includes `specifier`, optional `type` (`"local"`, `"remote"`, or `"npm"`), and optional `size` (bytes)
- `dependencies` array is omitted from compact mode to reduce token usage
- The `totalSize` field is the combined size of all dependencies in bytes
