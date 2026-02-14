# docker > volume-ls

Lists Docker volumes with structured driver, mountpoint, and scope information. Use instead of running `docker volume ls` in the terminal.

**Command**: `docker volume ls --format json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Volumes Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
DRIVER    VOLUME NAME
local     myapp_postgres_data
local     myapp_redis_data
local     a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

</td>
<td>

~70 tokens

```json
{
  "volumes": [
    { "name": "myapp_postgres_data", "driver": "local", "mountpoint": "/var/lib/docker/volumes/myapp_postgres_data/_data", "scope": "local" },
    { "name": "myapp_redis_data", "driver": "local", "mountpoint": "/var/lib/docker/volumes/myapp_redis_data/_data", "scope": "local" },
    { "name": "a1b2c3d4e5f6a7b8", "driver": "local", "mountpoint": "/var/lib/docker/volumes/a1b2c3d4e5f6a7b8/_data", "scope": "local" }
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

~30 tokens

```json
{
  "volumes": [
    { "name": "myapp_postgres_data", "driver": "local" },
    { "name": "myapp_redis_data", "driver": "local" },
    { "name": "a1b2c3d4e5f6a7b8", "driver": "local" }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario  | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------- | ---------- | --------- | ------------ | ------- |
| 3 volumes | ~150       | ~70       | ~30          | 53-80%  |

## Notes

- Volume names can be either human-readable (from compose files) or anonymous hash strings
- Compact mode drops `mountpoint` and `scope` fields, keeping only `name` and `driver`
- The `mountpoint` field shows the host filesystem path where the volume data is stored
