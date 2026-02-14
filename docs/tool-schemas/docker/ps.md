# docker > ps

Lists Docker containers with structured status, ports, and state information. Use instead of running `docker ps` in the terminal.

**Command**: `docker ps --format json --no-trunc [-a]`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `all`     | boolean | `true`  | Show all containers including stopped                      |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Containers Running

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS          PORTS                  NAMES
a1b2c3d4e5f6   nginx:latest   "/docker-entrypoint.…"   2 hours ago    Up 2 hours      0.0.0.0:8080->80/tcp   web
f6e5d4c3b2a1   postgres:16    "docker-entrypoint.s…"   2 hours ago    Up 2 hours      5432/tcp               db
b1c2d3e4f5a6   redis:7        "docker-entrypoint.s…"   3 hours ago    Exited (0) 1h                          cache
```

</td>
<td>

~120 tokens

```json
{
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "name": "web",
      "image": "nginx:latest",
      "status": "Up 2 hours",
      "state": "running",
      "ports": [{ "host": 8080, "container": 80, "protocol": "tcp" }],
      "created": "2 hours ago"
    },
    {
      "id": "f6e5d4c3b2a1",
      "name": "db",
      "image": "postgres:16",
      "status": "Up 2 hours",
      "state": "running",
      "ports": [{ "container": 5432, "protocol": "tcp" }],
      "created": "2 hours ago"
    },
    {
      "id": "b1c2d3e4f5a6",
      "name": "cache",
      "image": "redis:7",
      "status": "Exited (0) 1 hour ago",
      "state": "exited",
      "ports": [],
      "created": "3 hours ago"
    }
  ],
  "total": 3,
  "running": 2,
  "stopped": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~75 tokens

```json
{
  "containers": [
    { "id": "a1b2c3d4e5f6", "name": "web", "image": "nginx:latest", "status": "Up 2 hours" },
    { "id": "f6e5d4c3b2a1", "name": "db", "image": "postgres:16", "status": "Up 2 hours" },
    { "id": "b1c2d3e4f5a6", "name": "cache", "image": "redis:7", "status": "Exited (0) 1 hour ago" }
  ],
  "total": 3,
  "running": 2,
  "stopped": 1
}
```

</td>
</tr>
</table>

## Error — Docker Daemon Not Running

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

</td>
<td>

~25 tokens

```json
{
  "containers": [],
  "total": 0,
  "running": 0,
  "stopped": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| 3 containers          | ~250       | ~120      | ~75          | 52-70%  |
| Docker daemon offline | ~30        | ~25       | ~25          | 17%     |

## Notes

- The `all` parameter defaults to `true`, showing both running and stopped containers (equivalent to `docker ps -a`)
- Port mappings are parsed from Docker's string format (e.g., `0.0.0.0:8080->80/tcp`) into structured objects with `host`, `container`, and `protocol` fields
- Container IDs are truncated to 12 characters
- Compact mode drops `state`, `ports`, and `created` fields, keeping only `id`, `name`, `image`, and `status`
