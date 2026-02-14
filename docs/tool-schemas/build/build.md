# build > build

Runs a build command and returns structured success/failure with errors and warnings.

**Command**: `<command> <args>` (e.g., `npm run build`, `pnpm run build`)

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `command` | string   | ---     | Build command to run (e.g., `npm`, `npx`, `pnpm`)          |
| `args`    | string[] | `[]`    | Arguments for the build command (e.g., `['run', 'build']`) |
| `path`    | string   | cwd     | Working directory                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- Build Passes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ npm run build

> my-app@1.0.0 build
> tsc && vite build

vite v5.4.2 building for production...
transforming (143) src/main.tsx
rendering chunks (5)...
computing gzip size (5)...
dist/assets/index-abc123.js   142.50 kB | gzip: 45.20 kB
dist/assets/vendor-def456.js   89.30 kB | gzip: 28.10 kB
dist/index.html                 0.45 kB | gzip:  0.29 kB
built in 3.2s
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "duration": 3.2,
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

~15 tokens

```json
{
  "success": true,
  "duration": 3.2
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

~180 tokens

```
$ npm run build

> my-app@1.0.0 build
> tsc && vite build

src/index.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/utils.ts(8,3): error TS7006: Parameter 'x' implicitly has an 'any' type.

Found 2 errors in 2 files.

npm ERR! Lifecycle script `build` failed with error:
npm ERR! Error: command failed
```

</td>
<td>

~40 tokens

```json
{
  "success": false,
  "duration": 1.5,
  "errors": [
    "src/index.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.",
    "src/utils.ts(8,3): error TS7006: Parameter 'x' implicitly has an 'any' type."
  ],
  "warnings": []
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
  "success": false,
  "duration": 1.5
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| Build passes | ~120       | ~25       | ~15          | 79--88% |
| Build fails  | ~180       | ~40       | ~15          | 78--92% |

## Notes

- The `command` parameter is validated against an allow-list of safe commands (e.g., `npm`, `npx`, `pnpm`, `yarn`, `node`, `make`)
- Error and warning lines are extracted by scanning output for lines containing `error` or `warn` keywords
- In compact mode, the `errors` and `warnings` arrays are omitted, returning only `success` and `duration`
- Duration is measured by the tool wrapper, not parsed from command output
- This is a generic build runner; for framework-specific structured output, prefer the dedicated `tsc`, `esbuild`, `vite-build`, or `webpack` tools
