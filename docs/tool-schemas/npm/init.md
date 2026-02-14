# npm > init

Initializes a new package.json in the target directory. Returns structured output with the package name, version, and path.

**Command**: `npm init -y` / `pnpm init` / `yarn init -y`

## Input Parameters

| Parameter        | Type                             | Default     | Description                                                            |
| ---------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `path`           | string                           | cwd         | Directory to initialize                                                |
| `yes`            | boolean                          | `true`      | Use `-y` flag for non-interactive init with defaults                   |
| `scope`          | string                           | —           | npm scope for the package (e.g., `@myorg`)                             |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified |

## Success — Package Initialized

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
Wrote to /home/user/my-app/package.json:

{
  "name": "my-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

</td>
<td>

~20 tokens

```json
{
  "packageManager": "npm",
  "success": true,
  "packageName": "my-app",
  "version": "1.0.0",
  "path": "/home/user/my-app/package.json"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for init).

</td>
</tr>
</table>

## Success — Scoped Package

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~55 tokens

```
Wrote to /home/user/my-app/package.json:

{
  "name": "@myorg/my-app",
  "version": "1.0.0",
  ...
}
```

</td>
<td>

~20 tokens

```json
{
  "packageManager": "npm",
  "success": true,
  "packageName": "@myorg/my-app",
  "version": "1.0.0",
  "path": "/home/user/my-app/package.json"
}
```

</td>
</tr>
</table>

## Error — Directory Not Writable

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
npm ERR! EACCES: permission denied, open '/opt/package.json'
```

</td>
<td>

~20 tokens

```json
{
  "packageManager": "npm",
  "success": false,
  "packageName": "unknown",
  "version": "0.0.0",
  "path": "/opt/package.json"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Savings |
| ---------------- | ---------- | --------- | ------- |
| Default init     | ~50        | ~20       | 60%     |
| Scoped init      | ~55        | ~20       | 64%     |
| Permission error | ~30        | ~20       | 33%     |

## Notes

- The `-y` flag is enabled by default for non-interactive initialization. Set `yes: false` to skip it (not useful in MCP context since interactive prompts cannot be answered)
- The `scope` parameter maps to `--scope=<value>` and produces a scoped package name like `@myorg/my-app`
- After initialization, the tool reads the generated `package.json` to extract the actual `name` and `version` fields
- If the generated `package.json` cannot be read, `success` is set to `false` even if the init command itself succeeded
