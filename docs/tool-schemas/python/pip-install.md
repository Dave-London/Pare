# python > pip-install

Runs pip install and returns a structured summary of installed packages with satisfaction status.

**Command**: `pip install <packages>` / `pip install -r requirements.txt`

## Input Parameters

| Parameter      | Type     | Default | Description                                                |
| -------------- | -------- | ------- | ---------------------------------------------------------- |
| `packages`     | string[] | `[]`    | Packages to install (empty for requirements.txt)           |
| `requirements` | string   | --      | Path to requirements file                                  |
| `path`         | string   | cwd     | Working directory                                          |
| `dryRun`       | boolean  | `false` | Preview what would be installed without actually installing |
| `compact`      | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Packages Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
Collecting requests>=2.28
  Downloading requests-2.31.0-py3-none-any.whl (62 kB)
Collecting urllib3<3,>=1.21.1
  Downloading urllib3-2.1.0-py3-none-any.whl (104 kB)
Collecting charset-normalizer<4,>=2
  Downloading charset_normalizer-3.3.2-py3-none-any.whl (48 kB)
Collecting idna<4,>=2.5
  Downloading idna-3.6-py3-none-any.whl (61 kB)
Collecting certifi>=2017.4.17
  Downloading certifi-2024.2.2-py3-none-any.whl (163 kB)
Installing collected packages: urllib3, idna, charset-normalizer, certifi, requests
Successfully installed certifi-2024.2.2 charset-normalizer-3.3.2 idna-3.6 requests-2.31.0 urllib3-2.1.0
```

</td>
<td>

~55 tokens

```json
{
  "success": true,
  "installed": [
    { "name": "certifi", "version": "2024.2.2" },
    { "name": "charset-normalizer", "version": "3.3.2" },
    { "name": "idna", "version": "3.6" },
    { "name": "requests", "version": "2.31.0" },
    { "name": "urllib3", "version": "2.1.0" }
  ],
  "alreadySatisfied": false,
  "total": 5
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
  "total": 5,
  "alreadySatisfied": false
}
```

</td>
</tr>
</table>

## Success -- Already Satisfied

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~25 tokens

```
Requirement already satisfied: requests in /usr/lib/python3/dist-packages (2.31.0)
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "installed": [],
  "alreadySatisfied": true,
  "total": 0
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

~35 tokens

```
ERROR: Could not find a version that satisfies the requirement nonexistent-pkg
ERROR: No matching distribution found for nonexistent-pkg
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "installed": [],
  "alreadySatisfied": false,
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| 5 packages installed | ~120    | ~55       | ~15          | 54-88%  |
| Already satisfied | ~25        | ~20       | ~20          | 20%     |
| Package not found | ~35        | ~20       | ~20          | 43%     |

## Notes

- When no `packages` or `requirements` are provided, defaults to `pip install -r requirements.txt`
- The `dryRun` flag maps to `--dry-run`, showing what would be installed without modifying the environment
- Compact mode drops individual package details, keeping only `success`, `total`, and `alreadySatisfied`
- WARNING: Installing packages may execute arbitrary setup.py code. Only install trusted packages
