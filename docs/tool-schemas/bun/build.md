# bun > build

Runs `bun build` to bundle JavaScript/TypeScript and returns structured output with artifact info.

**Command**: `bun build <entrypoints>`

## Input Parameters

| Parameter     | Type                                 | Default | Description                                                |
| ------------- | ------------------------------------ | ------- | ---------------------------------------------------------- |
| `entrypoints` | string[]                             | —       | Entry point files to bundle (required)                     |
| `outdir`      | string                               | —       | Output directory (--outdir)                                |
| `outfile`     | string                               | —       | Output file path (--outfile)                               |
| `target`      | `"browser"` \| `"bun"` \| `"node"`  | —       | Build target environment (--target)                        |
| `format`      | `"esm"` \| `"cjs"` \| `"iife"`      | —       | Output module format (--format)                            |
| `minify`      | boolean                              | —       | Minify the output (--minify)                               |
| `sourcemap`   | `"none"` \| `"inline"` \| `"external"` | —    | Source map generation (--sourcemap)                         |
| `splitting`   | boolean                              | —       | Enable code splitting (--splitting)                        |
| `path`        | string                               | cwd     | Project root path                                          |
| `compact`     | boolean                              | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Bundle Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ bun build src/index.ts --outdir dist
  dist/index.js  12.4 KB

[8ms] bundle 1 modules
```

</td>
<td>

~65 tokens

```json
{
  "success": true,
  "entrypoints": ["src/index.ts"],
  "artifacts": [
    { "path": "dist/index.js", "size": "12.4 KB" }
  ],
  "duration": 8,
  "stdout": "  dist/index.js  12.4 KB\n\n[8ms] bundle 1 modules"
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
  "entrypoints": ["src/index.ts"],
  "duration": 8
}
```

</td>
</tr>
</table>

## Error — Build Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
$ bun build src/index.ts --outdir dist
error: Could not resolve "nonexistent-module"
    at src/index.ts:1:0

Build failed with 1 error
```

</td>
<td>

~55 tokens

```json
{
  "success": false,
  "entrypoints": ["src/index.ts"],
  "duration": 12,
  "stderr": "error: Could not resolve \"nonexistent-module\"\n    at src/index.ts:1:0\n\nBuild failed with 1 error"
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
  "entrypoints": ["src/index.ts"],
  "duration": 12
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| Build passes | ~80        | ~65       | ~25          | 19-69%  |
| Build fails  | ~100       | ~55       | ~25          | 45-75%  |

## Notes

- Entry point files are validated against flag injection
- The `artifacts` array contains output file paths and sizes when the build produces output
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout`, `stderr`, and `artifacts`, keeping only `success`, `entrypoints`, and `duration`
- The `target` option affects how the bundler resolves built-in modules (e.g., `node:fs`)
