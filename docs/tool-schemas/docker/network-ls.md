# docker > network-ls

Lists Docker networks with structured driver and scope information. Use instead of running `docker network ls` in the terminal.

**Command**: `docker network ls --format json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Networks Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
NETWORK ID     NAME              DRIVER    SCOPE
a1b2c3d4e5f6   bridge            bridge    local
b2c3d4e5f6a7   host              host      local
c3d4e5f6a7b8   none              null      local
d4e5f6a7b8c9   myapp_default     bridge    local
```

</td>
<td>

~60 tokens

```json
{
  "networks": [
    { "id": "a1b2c3d4e5f6", "name": "bridge", "driver": "bridge", "scope": "local" },
    { "id": "b2c3d4e5f6a7", "name": "host", "driver": "host", "scope": "local" },
    { "id": "c3d4e5f6a7b8", "name": "none", "driver": "null", "scope": "local" },
    { "id": "d4e5f6a7b8c9", "name": "myapp_default", "driver": "bridge", "scope": "local" }
  ],
  "total": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "networks": [
    { "name": "bridge", "driver": "bridge" },
    { "name": "host", "driver": "host" },
    { "name": "none", "driver": "null" },
    { "name": "myapp_default", "driver": "bridge" }
  ],
  "total": 4
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------- | ---------- | --------- | ------------ | ------- |
| 4 networks | ~120       | ~60       | ~35          | 50-71%  |

## Notes

- Network IDs are truncated to 12 characters
- Default Docker installations typically have three built-in networks: `bridge`, `host`, and `none`
- Compact mode drops `id` and `scope` fields, keeping only `name` and `driver`
