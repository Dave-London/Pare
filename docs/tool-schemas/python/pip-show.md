# python > pip-show

Runs pip show and returns structured package metadata including name, version, summary, author, license, location, and dependencies.

**Command**: `pip show <package>`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `package` | string  | --      | Package name to show (required)                            |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Package Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Name: requests
Version: 2.31.0
Summary: Python HTTP for Humans.
Home-page: https://requests.readthedocs.io
Author: Kenneth Reitz
License: Apache-2.0
Location: /usr/lib/python3/dist-packages
Requires: certifi, charset-normalizer, idna, urllib3
Required-by: httpx, poetry
```

</td>
<td>

~55 tokens

```json
{
  "name": "requests",
  "version": "2.31.0",
  "summary": "Python HTTP for Humans.",
  "homepage": "https://requests.readthedocs.io",
  "author": "Kenneth Reitz",
  "license": "Apache-2.0",
  "location": "/usr/lib/python3/dist-packages",
  "requires": ["certifi", "charset-normalizer", "idna", "urllib3"]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "name": "requests",
  "version": "2.31.0",
  "summary": "Python HTTP for Humans."
}
```

</td>
</tr>
</table>

## Error -- Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~15 tokens

```
WARNING: Package(s) not found: nonexistent-pkg
```

</td>
<td>

~15 tokens

```json
{
  "name": "",
  "version": "",
  "summary": "",
  "requires": []
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Package found     | ~80        | ~55       | ~20          | 31-75%  |
| Package not found | ~15        | ~15       | ~15          | 0%      |

## Notes

- Parses the key-value output from `pip show` (e.g., `Name: requests`, `Version: 2.31.0`)
- The `homepage`, `author`, `license`, and `location` fields are optional and omitted when empty
- The `requires` array is parsed from the comma-separated `Requires:` field
- Compact mode keeps only `name`, `version`, and `summary`, dropping all other metadata
