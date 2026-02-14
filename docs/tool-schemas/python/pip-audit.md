# python > pip-audit

Runs pip-audit and returns a structured vulnerability report with package names, CVE IDs, descriptions, and fix versions.

**Command**: `pip-audit --format json`

## Input Parameters

| Parameter      | Type    | Default | Description                                                |
| -------------- | ------- | ------- | ---------------------------------------------------------- |
| `path`         | string  | cwd     | Project root path                                          |
| `requirements` | string  | --      | Path to requirements file                                  |
| `compact`      | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- No Vulnerabilities

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
No known vulnerabilities found
```

</td>
<td>

~10 tokens

```json
{
  "vulnerabilities": [],
  "total": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no vulnerabilities).

</td>
</tr>
</table>

## Success -- Vulnerabilities Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
Name       Version ID                  Fix Versions
---------- ------- ------------------- ------------
setuptools 65.5.0  GHSA-cx63-2mw6-8hw5 65.5.1
pip        22.3    GHSA-mq26-g339-26xf 23.3
requests   2.25.0  CVE-2023-32681      2.31.0

Found 3 known vulnerabilities in 3 packages
```

</td>
<td>

~90 tokens

```json
{
  "vulnerabilities": [
    {
      "name": "setuptools",
      "version": "65.5.0",
      "id": "GHSA-cx63-2mw6-8hw5",
      "description": "Remote code execution via crafted package URL",
      "fixVersions": ["65.5.1"]
    },
    {
      "name": "pip",
      "version": "22.3",
      "id": "GHSA-mq26-g339-26xf",
      "description": "Command injection via requirements file",
      "fixVersions": ["23.3"]
    },
    {
      "name": "requests",
      "version": "2.25.0",
      "id": "CVE-2023-32681",
      "description": "Unintended leak of Proxy-Authorization header",
      "fixVersions": ["2.31.0"]
    }
  ],
  "total": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| No vulnerabilities | ~20        | ~10       | ~10          | 50%     |
| 3 vulnerabilities  | ~150       | ~90       | ~5           | 40-97%  |

## Notes

- Uses `pip-audit --format json` to get structured vulnerability data directly
- When `requirements` is provided, audits that specific file with `-r <file>` instead of the current environment
- Each vulnerability includes `fixVersions` showing available patched versions
- Compact mode drops all individual vulnerability details, keeping only the `total` count
