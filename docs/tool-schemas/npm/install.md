# npm > install

Runs npm/pnpm/yarn install and returns available package counts and vulnerability information. Auto-detects package manager via lock files. Supports quiet pnpm installs through a typed reporter option.

**Command**: `npm install --ignore-scripts` / `pnpm install --ignore-scripts` / `yarn install`

## Input Parameters

| Parameter        | Type                            | Default     | Description                                                                                                               |
| ---------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `path`           | string                          | cwd         | Project root path                                                                                                         |
| `args`           | string[]                        | `[]`        | Additional arguments (e.g., package names to install)                                                                     |
| `ignoreScripts`  | boolean                         | `true`      | Skip lifecycle scripts (preinstall/postinstall). Set to false if packages need postinstall scripts (e.g., esbuild, sharp) |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified                                                    |
| `filter`         | string                          | —           | pnpm workspace filter pattern (e.g., `@scope/pkg`). Only used with pnpm                                                   |
| `pnpmReporter`   | `"silent"`                      | —           | Maps to `--reporter=silent`; rejected for npm/yarn. Omits output-derived statistics                                       |

## Silent pnpm install

Call `install` with:

```json
{
  "path": "/path/to/project",
  "packageManager": "pnpm",
  "pnpmReporter": "silent",
  "ignoreScripts": false
}
```

Successful structured output contains independently measured information:

```json
{
  "packageManager": "pnpm",
  "lockfileChanged": true
}
```

`lockfileChanged` compares the package manager's lockfile directly in `path`. A workspace-root lockfile outside that directory is not observed; `false` does not rule out changes to that workspace-root lockfile.

`added`, `removed`, `changed`, `packageDetails`, `funding`, and `vulnerabilities` are omitted because silent output cannot establish them. The count fields are optional in the output schema; clients must distinguish missing counts from zero. The readable summary says `package counts unavailable`. Calls without `pnpmReporter` keep their existing summary behavior.

Lifecycle scripts remain disabled by default. `ignoreScripts: false` removes the tool's `--ignore-scripts` flag; pnpm and project policy still govern which scripts may run. Package operands in `args` retain flag-injection protection; reporter flags must use the typed option.

A nonzero install exit code produces an MCP error even if output is empty or `node_modules` already exists. Launch failures and timeouts also remain errors. Failure diagnostics compact stderr and stdout separately, reserve the budget for stderr first, preserve both ends when a stream exceeds the character budget, and are sanitized and bounded using the shared compact-output limits, with truncation explicitly indicated. The silent reporter may suppress cause details; the exit code is still reported. Omit `pnpmReporter` when detailed package-manager output is needed for diagnosis.

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

```json
{
  "error": "npm install failed (exit code 1):\nnpm ERR! code E404"
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

## Notes

- Lifecycle scripts are skipped by default (`--ignore-scripts`) for safety. Set `ignoreScripts: false` if packages need postinstall scripts to function (e.g., esbuild, sharp)
- Package manager is auto-detected from lock files: `pnpm-lock.yaml` -> pnpm, `yarn.lock` -> yarn, otherwise npm
- The `filter` parameter is only used with pnpm workspaces and maps to `--filter=<value>`
- Vulnerability summary is only included in the response when vulnerabilities are detected
- The `funding` field is only included when npm reports packages looking for funding
