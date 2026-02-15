# build > vite-build

Runs Vite production build and returns structured output files with sizes.

**Command**: `npx vite build [--mode <mode>]`

## Input Parameters

| Parameter | Type     | Default        | Description                                                |
| --------- | -------- | -------------- | ---------------------------------------------------------- |
| `path`    | string   | cwd            | Project root path                                          |
| `mode`    | string   | `"production"` | Build mode                                                 |
| `args`    | string[] | `[]`           | Additional Vite build flags                                |
| `compact` | boolean  | `true`         | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- Build With Output Files

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~140 tokens

```
$ npx vite build

vite v5.4.2 building for production...
transforming (143) src/main.tsx
rendering chunks (5)...
computing gzip size (5)...

dist/assets/index-abc123.js    142.50 kB | gzip: 45.20 kB
dist/assets/vendor-def456.js    89.30 kB | gzip: 28.10 kB
dist/assets/style-789ghi.css     8.12 kB | gzip:  2.40 kB
dist/index.html                  0.45 kB | gzip:  0.29 kB

built in 2.8s
```

</td>
<td>

~60 tokens

```json
{
  "success": true,
  "duration": 2.8,
  "outputs": [
    { "file": "dist/assets/index-abc123.js", "size": "142.50 kB" },
    { "file": "dist/assets/vendor-def456.js", "size": "89.30 kB" },
    { "file": "dist/assets/style-789ghi.css", "size": "8.12 kB" },
    { "file": "dist/index.html", "size": "0.45 kB" }
  ],
  "errors": [],
  "warnings": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~12 tokens

```json
{
  "success": true,
  "duration": 2.8
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

~100 tokens

```
$ npx vite build

vite v5.4.2 building for production...
transforming (42) src/main.tsx

[vite]: Rollup failed to resolve import "missing-module" from "src/App.tsx".
This is most commonly caused by a missing package.
error during build:
Error: Could not resolve import
```

</td>
<td>

~30 tokens

```json
{
  "success": false,
  "duration": 1.2,
  "outputs": [],
  "errors": ["error during build:"],
  "warnings": []
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~12 tokens

```json
{
  "success": false,
  "duration": 1.2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 4 output files | ~140       | ~60       | ~12          | 57-91%  |
| Build failure  | ~100       | ~30       | ~12          | 70-88%  |

## Notes

- Output files and sizes are parsed from Vite's tabular output format (`file  size | gzip: size`)
- The `mode` parameter defaults to `"production"`; custom modes (e.g., `"staging"`) are passed via `--mode`
- In compact mode, `outputs`, `errors`, and `warnings` arrays are all omitted, returning only `success` and `duration`
- Error and warning lines are detected by scanning for `error` and `warn` keywords in the combined output
- Duration is measured by the tool wrapper, not parsed from Vite's "built in Xs" line
