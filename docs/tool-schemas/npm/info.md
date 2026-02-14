# npm > info

Shows detailed package metadata from the npm registry. Returns structured data with name, version, description, license, dependencies, and tarball URL.

**Command**: `npm info <package> --json` / `pnpm info <package> --json` / `yarn info <package> --json`

## Input Parameters

| Parameter        | Type                            | Default      | Description                                                                           |
| ---------------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `package`        | string                          | _(required)_ | Package name to look up (e.g., `express`, `lodash@4.17.21`)                           |
| `path`           | string                          | cwd          | Project root path                                                                     |
| `compact`        | boolean                         | `true`       | Auto-compact when structured output exceeds raw CLI tokens. Set false for full schema |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect  | Package manager to use. Auto-detected from lock files if not specified                |

## Success — Package Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
express@5.0.1 | MIT | deps: 31 | versions: 279
Fast, unopinionated, minimalist web framework
https://expressjs.com/

dist-tags:
latest: 5.0.1  next: 5.0.0-beta.3

dependencies:
accepts: ~2.0.0
body-parser: 2.0.2
content-disposition: 1.0.0
cookie: 0.7.2
... (27 more)

dist:
tarball: https://registry.npmjs.org/express/-/express-5.0.1.tgz
shasum: abc123def456...
```

</td>
<td>

~120 tokens

```json
{
  "packageManager": "npm",
  "name": "express",
  "version": "5.0.1",
  "description": "Fast, unopinionated, minimalist web framework",
  "homepage": "https://expressjs.com/",
  "license": "MIT",
  "dependencies": {
    "accepts": "~2.0.0",
    "body-parser": "2.0.2",
    "content-disposition": "1.0.0",
    "cookie": "0.7.2"
  },
  "dist": {
    "tarball": "https://registry.npmjs.org/express/-/express-5.0.1.tgz"
  }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens — drops `dependencies` and `dist` fields.

```json
{
  "name": "express",
  "version": "5.0.1",
  "description": "Fast, unopinionated, minimalist web framework",
  "license": "MIT",
  "homepage": "https://expressjs.com/"
}
```

</td>
</tr>
</table>

## Error — Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~40 tokens

```
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-pkg-xyz
npm ERR! 404 'nonexistent-pkg-xyz' is not in this registry.
```

</td>
<td>

Throws an error:

```
npm info failed: 404 Not Found - 'nonexistent-pkg-xyz' is not in this registry.
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Package found     | ~350       | ~120      | ~35          | 66–90%  |
| Package not found | ~40        | error     | error        | n/a     |

## Notes

- The `package` parameter accepts version specifiers (e.g., `lodash@4.17.21`) to look up specific versions
- All package managers query the same npm registry; the `packageManager` parameter only affects which CLI tool is invoked
- Compact mode drops `dependencies` and `dist` fields, keeping only `name`, `version`, `description`, `license`, and `homepage`
- Yarn Classic wraps its response in a `{ type: "inspect", data: { ... } }` envelope, which is automatically unwrapped
- When the package is not found, the tool throws an error rather than returning a structured response
