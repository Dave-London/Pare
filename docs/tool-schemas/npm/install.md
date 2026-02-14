# npm > install

Runs npm/pnpm/yarn install and returns a structured summary of added/removed packages and vulnerabilities. Auto-detects package manager via lock files.

**Command**: `npm install --ignore-scripts` / `pnpm install --ignore-scripts` / `yarn install`

## Input Parameters

| Parameter        | Type                            | Default     | Description                                                                                                               |
| ---------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `path`           | string                          | cwd         | Project root path                                                                                                         |
| `args`           | string[]                        | `[]`        | Additional arguments (e.g., package names to install)                                                                     |
| `ignoreScripts`  | boolean                         | `true`      | Skip lifecycle scripts (preinstall/postinstall). Set to false if packages need postinstall scripts (e.g., esbuild, sharp) |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified                                                    |
| `filter`         | string                          | —           | pnpm workspace filter pattern (e.g., `@scope/pkg`). Only used with pnpm                                                   |

## Success — Clean Install

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
added 152 packages, and audited 153 packages in 8s

24 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

</td>
<td>

~30 tokens

```json
{
  "packageManager": "npm",
  "added": 152,
  "removed": 0,
  "changed": 0,
  "duration": 8.0,
  "packages": 153,
  "funding": 24
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for install).

</td>
</tr>
</table>

## Success — Install With Vulnerabilities

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
added 87 packages, and audited 88 packages in 5s

12 packages are looking for funding
  run `npm fund` for details

3 vulnerabilities (1 moderate, 2 high)

To address all issues, run:
  npm audit fix
```

</td>
<td>

~50 tokens

```json
{
  "packageManager": "npm",
  "added": 87,
  "removed": 0,
  "changed": 0,
  "duration": 5.0,
  "packages": 88,
  "funding": 12,
  "vulnerabilities": {
    "total": 3,
    "critical": 0,
    "high": 2,
    "moderate": 1,
    "low": 0,
    "info": 0
  }
}
```

</td>
</tr>
</table>

## Error — Install Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~50 tokens

```
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-pkg-xyz
npm ERR! 404 'nonexistent-pkg-xyz' is not in this registry.
```

</td>
<td>

~20 tokens

```json
{
  "packageManager": "npm",
  "added": 0,
  "removed": 0,
  "changed": 0,
  "duration": 1.2,
  "packages": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                 | CLI Tokens | Pare Full | Savings |
| ------------------------ | ---------- | --------- | ------- |
| Clean install (152 pkgs) | ~60        | ~30       | 50%     |
| Install with vulns       | ~80        | ~50       | 38%     |
| Install failure          | ~50        | ~20       | 60%     |

## Notes

- Lifecycle scripts are skipped by default (`--ignore-scripts`) for safety. Set `ignoreScripts: false` if packages need postinstall scripts to function (e.g., esbuild, sharp)
- Package manager is auto-detected from lock files: `pnpm-lock.yaml` -> pnpm, `yarn.lock` -> yarn, otherwise npm
- The `filter` parameter is only used with pnpm workspaces and maps to `--filter=<value>`
- Vulnerability summary is only included in the response when vulnerabilities are detected
- The `funding` field is only included when npm reports packages looking for funding
