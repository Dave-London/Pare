# python > pyenv

Manages Python versions via pyenv. Supports listing, inspecting, installing, and setting Python versions.

**Command**: `pyenv versions --bare` / `pyenv version` / `pyenv install <version>` / `pyenv local <version>` / `pyenv global <version>`

## Input Parameters

| Parameter | Type                                                                  | Default | Description                                                             |
| --------- | --------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| `action`  | `"versions"` \| `"version"` \| `"install"` \| `"local"` \| `"global"` | --      | The pyenv action to perform (required)                                  |
| `version` | string                                                                | --      | Python version string (required for install, optional for local/global) |
| `path`    | string                                                                | cwd     | Working directory                                                       |
| `compact` | boolean                                                               | `true`  | Auto-compact when structured output exceeds raw CLI tokens              |

## Action: versions -- List Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
  3.10.13
  3.11.7
* 3.12.1 (set by /home/user/.pyenv/version)
  3.13.0a3
```

</td>
<td>

~30 tokens

```json
{
  "action": "versions",
  "success": true,
  "versions": ["3.10.13", "3.11.7", "3.12.1", "3.13.0a3"],
  "current": "3.12.1"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "action": "versions",
  "success": true
}
```

</td>
</tr>
</table>

## Action: version -- Current Version

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
3.12.1 (set by /home/user/.pyenv/version)
```

</td>
<td>

~15 tokens

```json
{
  "action": "version",
  "success": true,
  "current": "3.12.1"
}
```

</td>
</tr>
</table>

## Action: install -- Install Version

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
Downloading Python-3.12.1.tar.xz...
-> https://www.python.org/ftp/python/3.12.1/Python-3.12.1.tar.xz
Installing Python-3.12.1...
Installed Python-3.12.1 to /home/user/.pyenv/versions/3.12.1
```

</td>
<td>

~15 tokens

```json
{
  "action": "install",
  "success": true,
  "installed": "3.12.1"
}
```

</td>
</tr>
</table>

## Error -- Action Failed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~20 tokens

```
pyenv: version `3.99.0` is not installed
```

</td>
<td>

~20 tokens

```json
{
  "action": "local",
  "success": false,
  "error": "pyenv: version `3.99.0` is not installed"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| versions (4)  | ~40        | ~30       | ~10          | 25-75%  |
| version       | ~15        | ~15       | ~10          | 0-33%   |
| install       | ~60        | ~15       | ~10          | 75-83%  |
| action failed | ~20        | ~20       | ~10          | 0-50%   |

## Notes

- The `version` parameter is required for `install` and optional for `local`/`global` (omitting it shows the current setting)
- For `versions` action, uses `--bare` flag for cleaner output; the current version is detected from `*` markers
- The `installed` field is extracted from `Installed Python-X.Y.Z` or `Installing Python-X.Y.Z` in the output
- Compact mode drops all version-specific data, keeping only `action` and `success`
