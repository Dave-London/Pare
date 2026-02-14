# python > pip-list

Runs pip list and returns a structured list of all installed packages with names and versions.

**Command**: `pip list --format json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Packages Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
Package            Version
------------------ -------
certifi            2024.2.2
charset-normalizer 3.3.2
idna               3.6
numpy              1.26.4
pandas             2.2.0
pip                24.0
requests           2.31.0
setuptools         69.0.3
urllib3             2.1.0
wheel              0.42.0
```

</td>
<td>

~80 tokens

```json
{
  "packages": [
    { "name": "certifi", "version": "2024.2.2" },
    { "name": "charset-normalizer", "version": "3.3.2" },
    { "name": "idna", "version": "3.6" },
    { "name": "numpy", "version": "1.26.4" },
    { "name": "pandas", "version": "2.2.0" },
    { "name": "pip", "version": "24.0" },
    { "name": "requests", "version": "2.31.0" },
    { "name": "setuptools", "version": "69.0.3" },
    { "name": "urllib3", "version": "2.1.0" },
    { "name": "wheel", "version": "0.42.0" }
  ],
  "total": 10
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
  "total": 10
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 10 packages listed | ~150       | ~80       | ~5           | 47-97%  |

## Notes

- Uses `pip list --format json` to get structured JSON directly from pip
- Compact mode drops all individual package details, keeping only the `total` count
- Useful for environment inspection and dependency auditing
- Token savings scale with the number of installed packages; large environments with 100+ packages see the highest savings
