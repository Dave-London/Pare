# python > poetry

Runs Poetry commands and returns structured output for dependency management and project building.

**Command**: `poetry install` / `poetry add <packages>` / `poetry remove <packages>` / `poetry show --no-ansi` / `poetry build`

## Input Parameters

| Parameter  | Type                                                          | Default | Description                                                |
| ---------- | ------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `action`   | `"install"` \| `"add"` \| `"remove"` \| `"show"` \| `"build"` | --      | Poetry action to perform (required)                        |
| `packages` | string[]                                                      | --      | Packages for add/remove actions                            |
| `path`     | string                                                        | cwd     | Working directory                                          |
| `compact`  | boolean                                                       | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Action: show -- List Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
certifi          2024.2.2  Python package for providing Mozilla's CA Bundle.
charset-normalizer 3.3.2   The Real First Universal Charset Detector.
idna             3.6       Internationalized Domain Names in Applications (IDNA)
requests         2.31.0    Python HTTP for Humans.
urllib3          2.1.0     HTTP library with thread-safe connection pooling
```

</td>
<td>

~45 tokens

```json
{
  "success": true,
  "action": "show",
  "packages": [
    { "name": "certifi", "version": "2024.2.2" },
    { "name": "charset-normalizer", "version": "3.3.2" },
    { "name": "idna", "version": "3.6" },
    { "name": "requests", "version": "2.31.0" },
    { "name": "urllib3", "version": "2.1.0" }
  ],
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
  "action": "show",
  "total": 5
}
```

</td>
</tr>
</table>

## Action: add -- Add Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
Using version ^2.31.0 for requests

Updating dependencies
Resolving dependencies... (1.2s)

Package operations: 5 installs, 0 updates, 0 removals

  - Installing certifi (2024.2.2)
  - Installing charset-normalizer (3.3.2)
  - Installing idna (3.6)
  - Installing urllib3 (2.1.0)
  - Installing requests (2.31.0)
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "action": "add",
  "packages": [
    { "name": "certifi", "version": "2024.2.2" },
    { "name": "charset-normalizer", "version": "3.3.2" },
    { "name": "idna", "version": "3.6" },
    { "name": "urllib3", "version": "2.1.0" },
    { "name": "requests", "version": "2.31.0" }
  ],
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
  "action": "add",
  "total": 5
}
```

</td>
</tr>
</table>

## Action: build -- Build Package

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Building myproject (0.1.0)
  - Built myproject-0.1.0.tar.gz
  - Built myproject-0.1.0-py3-none-any.whl
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "action": "build",
  "artifacts": [
    { "file": "myproject-0.1.0.tar.gz" },
    { "file": "myproject-0.1.0-py3-none-any.whl" }
  ],
  "total": 2
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
  "action": "build",
  "total": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| show (5 packages)   | ~80        | ~45       | ~15          | 44-81%  |
| add (5 packages)    | ~100       | ~50       | ~15          | 50-85%  |
| build (2 artifacts) | ~30        | ~25       | ~15          | 17-50%  |

## Notes

- The `show` action uses `--no-ansi` for clean output parsing
- The `packages` parameter is only used with `add` and `remove` actions
- For `install`, `add`, and `remove` actions, packages are parsed from lines matching `Installing/Updating/Removing <name> (<version>)`
- For `build`, artifacts are extracted from lines matching `Built <filename>`
- Compact mode drops individual package/artifact details, keeping only `success`, `action`, and `total`
