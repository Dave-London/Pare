# build > webpack

Runs webpack build with JSON stats output and returns structured assets, errors, and warnings.

**Command**: `npx webpack --json [--config <file>] [--mode <mode>]`

## Input Parameters

| Parameter | Type                                          | Default | Description                                                |
| --------- | --------------------------------------------- | ------- | ---------------------------------------------------------- |
| `path`    | string                                        | cwd     | Project root path                                          |
| `config`  | string                                        | ---     | Path to webpack config file                                |
| `mode`    | `"production"` \| `"development"` \| `"none"` | ---     | Build mode                                                 |
| `args`    | string[]                                      | `[]`    | Additional webpack flags                                   |
| `compact` | boolean                                       | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- Build With Assets

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
$ npx webpack --json --mode production

{
  "assets": [
    { "name": "main.js", "size": 145920 },
    { "name": "vendor.js", "size": 92160 },
    { "name": "styles.css", "size": 8320 }
  ],
  "errors": [],
  "warnings": [],
  "modules": 87,
  "time": 4200
}
```

</td>
<td>

~55 tokens

```json
{
  "success": true,
  "duration": 4.2,
  "assets": [
    { "name": "main.js", "size": 145920 },
    { "name": "vendor.js", "size": 92160 },
    { "name": "styles.css", "size": 8320 }
  ],
  "errors": [],
  "warnings": [],
  "modules": 87
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~18 tokens

```json
{
  "success": true,
  "duration": 4.2,
  "modules": 87
}
```

</td>
</tr>
</table>

## Error --- Build Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ npx webpack --json --mode production

{
  "assets": [],
  "errors": [
    {
      "message": "Module not found: Error: Can't resolve './missing' in '/app/src'",
      "moduleId": "./src/index.js"
    },
    {
      "message": "Module build failed: SyntaxError: Unexpected token (10:5)",
      "moduleId": "./src/utils.js"
    }
  ],
  "warnings": [],
  "modules": 12,
  "time": 1800
}
```

</td>
<td>

~45 tokens

```json
{
  "success": false,
  "duration": 1.8,
  "assets": [],
  "errors": [
    "Module not found: Error: Can't resolve './missing' in '/app/src'",
    "Module build failed: SyntaxError: Unexpected token (10:5)"
  ],
  "warnings": [],
  "modules": 12
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~18 tokens

```json
{
  "success": false,
  "duration": 1.8,
  "modules": 12
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| 3 assets, OK | ~250       | ~55       | ~18          | 78-93%  |
| 2 errors     | ~200       | ~45       | ~18          | 78-91%  |

## Notes

- The `--json` flag is always appended automatically to get structured stats output from webpack
- When JSON parsing succeeds, assets, errors, warnings, and module count are extracted from the stats object
- When JSON parsing fails (e.g., non-JSON output), the parser falls back to text-based error/warning detection
- Error objects from webpack's JSON stats are flattened to their `message` string
- In compact mode, `assets`, `errors`, and `warnings` arrays are omitted; `modules` count is preserved
- Asset `size` values are in bytes (as returned by webpack's stats JSON)
