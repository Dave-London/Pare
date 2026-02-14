# npm > audit

Runs npm/pnpm/yarn audit and returns structured vulnerability data with severity breakdown. Auto-detects package manager via lock files.

**Command**: `npm audit --json` / `pnpm audit --json` / `yarn audit --json`

## Input Parameters

| Parameter        | Type                             | Default     | Description                                                            |
| ---------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `path`           | string                           | cwd         | Project root path                                                      |
| `packageManager` | `"npm"` \| `"pnpm"` \| `"yarn"` | auto-detect | Package manager to use. Auto-detected from lock files if not specified |

## Success — No Vulnerabilities

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
found 0 vulnerabilities
```

</td>
<td>

~25 tokens

```json
{
  "packageManager": "npm",
  "vulnerabilities": [],
  "summary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "moderate": 0,
    "low": 0,
    "info": 0
  }
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for audit).

</td>
</tr>
</table>

## Success — Vulnerabilities Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
# npm audit report

lodash  <4.17.21
  Severity: critical
  Prototype Pollution - https://github.com/advisories/GHSA-jf85-cpcp-j695
  fix available via `npm audit fix`
  node_modules/lodash

tar  <6.1.9
  Severity: high
  Arbitrary File Creation/Overwrite via insufficient symlink protection
  fix available via `npm audit fix`
  node_modules/tar

minimatch  <3.0.5
  Severity: moderate
  Regular Expression Denial of Service
  No fix available
  node_modules/minimatch

3 vulnerabilities (1 moderate, 1 high, 1 critical)
```

</td>
<td>

~100 tokens

```json
{
  "packageManager": "npm",
  "vulnerabilities": [
    {
      "name": "lodash",
      "severity": "critical",
      "title": "Prototype Pollution",
      "url": "https://github.com/advisories/GHSA-jf85-cpcp-j695",
      "range": "<4.17.21",
      "fixAvailable": true
    },
    {
      "name": "tar",
      "severity": "high",
      "title": "Arbitrary File Creation/Overwrite via insufficient symlink protection",
      "fixAvailable": true
    },
    {
      "name": "minimatch",
      "severity": "moderate",
      "title": "Regular Expression Denial of Service",
      "range": "<3.0.5",
      "fixAvailable": false
    }
  ],
  "summary": {
    "total": 3,
    "critical": 1,
    "high": 1,
    "moderate": 1,
    "low": 0,
    "info": 0
  }
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Savings |
| --------------------- | ---------- | --------- | ------- |
| No vulnerabilities    | ~30        | ~25       | 17%     |
| 3 vulnerabilities     | ~250       | ~100      | 60%     |

## Notes

- `npm audit` returns exit code 1 when vulnerabilities are found; this is expected behavior and not treated as an error
- The parser handles three different JSON formats: npm v7+ (`vulnerabilities` object), pnpm classic (`advisories` object), and Yarn Classic NDJSON (`auditAdvisory` entries)
- Each vulnerability entry includes `fixAvailable: true/false` to indicate whether a fix can be applied via `npm audit fix`
- The `url` and `range` fields are optional and may not be present for all vulnerabilities
