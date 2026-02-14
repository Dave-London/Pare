# npm > run

Runs a package.json script and returns structured output with exit code, stdout, stderr, and duration. Auto-detects package manager via lock files.

**Command**: `npm run <script>` / `pnpm run <script>` / `yarn run <script>`

## Input Parameters

| Parameter        | Type                             | Default     | Description                                                            |
| ---------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `path`           | string                           | cwd         | Project root path                                                      |
| `script`         | string                           | *(required)* | The package.json script name to run                                   |
| `args`           | string[]                         | `[]`        | Additional arguments passed after `--` to the script                   |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified |
| `filter`         | string                           | —           | pnpm workspace filter pattern (e.g., `@scope/pkg`). Only used with pnpm |

## Success — Script Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
> my-app@1.0.0 build
> tsc && vite build

vite v5.4.1 building for production...
✓ 42 modules transformed.
dist/index.js  12.5 kB │ gzip: 4.2 kB
✓ built in 1.23s
```

</td>
<td>

~50 tokens

```json
{
  "packageManager": "npm",
  "script": "build",
  "exitCode": 0,
  "stdout": "vite v5.4.1 building for production...\n✓ 42 modules transformed.\ndist/index.js  12.5 kB │ gzip: 4.2 kB\n✓ built in 1.23s",
  "stderr": "",
  "success": true,
  "duration": 3.2
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for run).

</td>
</tr>
</table>

## Error — Script Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~120 tokens

```
> my-app@1.0.0 build
> tsc && vite build

src/index.ts(15,3): error TS2322: Type 'string' is not assignable to type 'number'.

npm ERR! Lifecycle script `build` failed with error:
npm ERR! Error: command failed
npm ERR!   in workspace: my-app@1.0.0
```

</td>
<td>

~60 tokens

```json
{
  "packageManager": "npm",
  "script": "build",
  "exitCode": 1,
  "stdout": "",
  "stderr": "src/index.ts(15,3): error TS2322: Type 'string' is not assignable to type 'number'.",
  "success": false,
  "duration": 1.8
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Savings |
| --------------- | ---------- | --------- | ------- |
| Script succeeds | ~80        | ~50       | 38%     |
| Script fails    | ~120       | ~60       | 50%     |

## Notes

- The `script` parameter must match a script name defined in `package.json`
- Additional arguments are passed after `--` to the underlying script
- The `filter` parameter is only used with pnpm workspaces and is inserted before `run` in the command
- Both stdout and stderr are captured and returned separately
- The `success` field is a convenience boolean derived from `exitCode === 0`
