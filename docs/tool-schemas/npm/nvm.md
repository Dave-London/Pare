# npm > nvm

Lists installed Node.js versions and shows the current version via nvm. Supports both Unix nvm and nvm-windows.

**Command**: `nvm list` / `nvm current`

## Input Parameters

| Parameter | Type                    | Default      | Description                                                                                |
| --------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `action`  | `"list"` \| `"current"` | _(required)_ | Action to perform: `list` shows all installed versions, `current` shows the active version |

## Success — List Versions

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
  * 20.11.1 (Currently using 64-bit executable)
    18.19.0
    16.20.2
```

</td>
<td>

~25 tokens

```json
{
  "current": "v20.11.1",
  "versions": ["v20.11.1", "v18.19.0", "v16.20.2"]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no compact mode for nvm).

</td>
</tr>
</table>

## Success — Current Version Only

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
v20.11.1
```

</td>
<td>

~15 tokens

```json
{
  "current": "v20.11.1",
  "versions": []
}
```

</td>
</tr>
</table>

## Success — Unix nvm With Default Alias

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
->     v20.11.1
       v18.19.0
       v16.20.2
default -> 20.11.1 (-> v20.11.1)
node -> stable (-> v20.11.1)
lts/* -> lts/iron (-> v20.11.1)
```

</td>
<td>

~30 tokens

```json
{
  "current": "v20.11.1",
  "versions": ["v20.11.1", "v18.19.0", "v16.20.2"],
  "default": "v20.11.1"
}
```

</td>
</tr>
</table>

## Error — nvm Not Installed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~15 tokens

```
nvm: command not found
```

</td>
<td>

Throws an error:

```
nvm list failed: nvm: command not found
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Savings |
| -------------------- | ---------- | --------- | ------- |
| 3 versions (Windows) | ~60        | ~25       | 58%     |
| Current version only | ~10        | ~15       | -50%    |
| 3 versions (Unix)    | ~80        | ~30       | 63%     |
| nvm not installed    | ~15        | error     | n/a     |

## Notes

- Supports both nvm-windows (uses `*` prefix for current version) and Unix nvm (uses `->` prefix for current version)
- Version strings are normalized to always include a `v` prefix (e.g., `20.11.1` becomes `v20.11.1`)
- The `default` field is only present on Unix nvm when a default alias is set
- When `action` is `list`, the tool also runs `nvm current` as a fallback to determine the active version
- Alias lines like `node -> stable` and `lts/* -> lts/iron` are skipped; only actual version numbers are included
