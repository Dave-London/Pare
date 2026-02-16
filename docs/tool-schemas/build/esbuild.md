# build > esbuild

Runs the esbuild bundler and returns structured errors, warnings, and output files.

**Command**: `npx esbuild <entryPoints> --bundle [flags]`

## Input Parameters

| Parameter     | Type                                   | Default | Description                                                |
| ------------- | -------------------------------------- | ------- | ---------------------------------------------------------- |
| `entryPoints` | string[]                               | ---     | Entry point files to bundle (e.g., `['src/index.ts']`)     |
| `outdir`      | string                                 | ---     | Output directory                                           |
| `outfile`     | string                                 | ---     | Output file (single entry point)                           |
| `bundle`      | boolean                                | `true`  | Bundle dependencies                                        |
| `minify`      | boolean                                | `false` | Minify output                                              |
| `format`      | `"esm"` \| `"cjs"` \| `"iife"`         | ---     | Output format                                              |
| `platform`    | `"browser"` \| `"node"` \| `"neutral"` | ---     | Target platform                                            |
| `sourcemap`   | boolean                                | `false` | Generate source maps                                       |
| `args`        | string[]                               | `[]`    | Additional esbuild flags                                   |
| `path`        | string                                 | cwd     | Project root path                                          |
| `compact`     | boolean                                | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- Bundle Succeeds

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ npx esbuild src/index.ts --bundle --outfile=dist/bundle.js --platform=node

  dist/bundle.js  45.2kb

Done in 42ms
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "outputFiles": ["dist/bundle.js"],
  "duration": 0.1
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
  "duration": 0.1
}
```

</td>
</tr>
</table>

## Error --- Build Errors

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
$ npx esbuild src/index.ts --bundle --outfile=dist/bundle.js

X [ERROR] Could not resolve "missing-package"

    src/index.ts:3:21:
      3 | import foo from "missing-package"
        |                  ^

X [ERROR] Expected ";" but found "const"

    src/utils.ts:10:0:
      10 | const x = 1
         | ^

2 errors
```

</td>
<td>

~60 tokens

```json
{
  "success": false,
  "errors": [
    {
      "file": "src/index.ts",
      "line": 3,
      "column": 21,
      "message": "Could not resolve \"missing-package\""
    },
    {
      "file": "src/utils.ts",
      "line": 10,
      "column": 0,
      "message": "Expected \";\" but found \"const\""
    }
  ],
  "warnings": [],
  "duration": 0.1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~55 tokens

```json
{
  "success": false,
  "errors": [
    {
      "file": "src/index.ts",
      "line": 3,
      "column": 21,
      "message": "Could not resolve \"missing-package\""
    },
    {
      "file": "src/utils.ts",
      "line": 10,
      "column": 0,
      "message": "Expected \";\" but found \"const\""
    }
  ],
  "duration": 0.1
}
```

</td>
</tr>
</table>

## Success --- With Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ npx esbuild src/index.ts --bundle --outfile=dist/bundle.js

▲ [WARNING] Import "foo" will always be undefined because the file "src/shim.ts" has no exports

    src/index.ts:5:9:
      5 | import { foo } from "./shim"
        |          ^

  dist/bundle.js  12.4kb

Done in 35ms
```

</td>
<td>

~35 tokens

```json
{
  "success": true,
  "errors": [],
  "warnings": [
    {
      "file": "src/index.ts",
      "line": 5,
      "message": "Import \"foo\" will always be undefined because the file \"src/shim.ts\" has no exports"
    }
  ],
  "outputFiles": ["dist/bundle.js"],
  "duration": 0.1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "success": true,
  "warnings": [
    {
      "file": "src/index.ts",
      "line": 5,
      "message": "Import \"foo\" will always be undefined because the file \"src/shim.ts\" has no exports"
    }
  ],
  "duration": 0.1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Successful build | ~30        | ~25       | ~12          | 17-60%  |
| 2 build errors   | ~150       | ~60       | ~55          | 60-63%  |
| With warnings    | ~80        | ~35       | ~30          | 56-63%  |

## Notes

- Entry points are validated to prevent flag injection
- The parser handles both modern diagnostic format (`X [ERROR] message`) and older inline format (`> file:line:col: error: message`)
- Output files are detected from stdout lines ending in `.js`, `.mjs`, `.cjs`, `.css`, or `.map`
- In compact mode, the `outputFiles` array is omitted; non-empty `errors` and `warnings` arrays are preserved
- The `bundle` flag defaults to `true`; set to `false` for transform-only mode
