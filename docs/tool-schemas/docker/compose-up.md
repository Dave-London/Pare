# docker > compose-up

Starts Docker Compose services and returns structured status. Use instead of running `docker compose up` in the terminal.

**Command**: `docker compose [-f file] up [-d] [--build] [services...]`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `path`     | string   | ---     | Directory containing docker-compose.yml (required)         |
| `services` | string[] | `[]`    | Specific services to start (default: all)                  |
| `detach`   | boolean  | `true`  | Run in background                                          |
| `build`    | boolean  | `false` | Build images before starting                               |
| `file`     | string   | ---     | Compose file path (default: docker-compose.yml)            |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Services Started

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
[+] Running 3/3
 ✔ Network myapp_default  Created          0.1s
 ✔ Container myapp-db-1   Started          1.2s
 ✔ Container myapp-web-1  Started          1.5s
 ✔ Container myapp-cache-1 Started         0.8s
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "services": ["myapp-db-1", "myapp-web-1", "myapp-cache-1"],
  "started": 3
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
  "success": true,
  "started": 3
}
```

</td>
</tr>
</table>

## Error — Compose File Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
no configuration file provided: not found
```

</td>
<td>

Throws `Error`: `docker compose up failed: no configuration file provided: not found`

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 3 services started | ~120       | ~25       | ~10          | 79-92%  |

## Notes

- Service names are extracted from Docker Compose output by matching `Container <name> Started/Running/Created` patterns
- The `detach` parameter defaults to `true`; without it, the tool would block until services exit
- The `build` flag triggers `--build`, which rebuilds images before starting services
- Compact mode drops the `services` array, keeping only `success` and `started` count
- Throws an error if compose up fails and no services were started
