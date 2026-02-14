# python > uv-install

Runs uv pip install and returns a structured summary of installed packages with timing information.

**Command**: `uv pip install <packages>` / `uv pip install -r requirements.txt`

## Input Parameters

| Parameter      | Type     | Default | Description                                                |
| -------------- | -------- | ------- | ---------------------------------------------------------- |
| `path`         | string   | cwd     | Working directory                                          |
| `packages`     | string[] | --      | Packages to install                                        |
| `requirements` | string   | --      | Path to requirements file                                  |
| `dryRun`       | boolean  | `false` | Preview what would be installed without actually installing |
| `compact`      | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Packages Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Resolved 4 packages in 120ms
  + flask==3.0.0
  + werkzeug==3.0.1
  + jinja2==3.1.2
  + markupsafe==2.1.3
Installed 4 packages in 0.8s
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "installed": [
    { "name": "flask", "version": "3.0.0" },
    { "name": "werkzeug", "version": "3.0.1" },
    { "name": "jinja2", "version": "3.1.2" },
    { "name": "markupsafe", "version": "2.1.3" }
  ],
  "total": 4,
  "duration": 0.8
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
  "total": 4,
  "duration": 0.8
}
```

</td>
</tr>
</table>

## Error -- Install Failed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
error: Could not find a version of `nonexistent-pkg` that satisfies the requirement
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "installed": [],
  "total": 0,
  "duration": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| 4 packages installed | ~80        | ~50       | ~15          | 38-81%  |
| Install failed       | ~30        | ~15       | ~15          | 50%     |

## Notes

- When no `packages` or `requirements` are provided, defaults to `uv pip install -r requirements.txt`
- Parses `+ package==version` lines from uv output to extract installed packages
- The `duration` field is extracted from the `Installed N packages in Xs` summary line
- The `dryRun` flag maps to `--dry-run` for previewing installations
- WARNING: Installing packages may execute arbitrary setup.py code during build. Only install trusted packages
- Compact mode drops individual package details, keeping only `success`, `total`, and `duration`
