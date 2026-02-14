# docker > stats

Returns a snapshot of container resource usage (CPU, memory, network/block I/O, PIDs) as structured data. Use instead of running `docker stats` in the terminal.

**Command**: `docker stats --no-stream --format '{{json .}}' [containers...]`

## Input Parameters

| Parameter    | Type     | Default | Description                                                |
| ------------ | -------- | ------- | ---------------------------------------------------------- |
| `containers` | string[] | ---     | Container names or IDs to filter (default: all running)    |
| `compact`    | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Container Stats

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
CONTAINER ID   NAME    CPU %   MEM USAGE / LIMIT     MEM %   NET I/O          BLOCK I/O        PIDS
a1b2c3d4e5f6   web     2.35%   45.2MiB / 1.945GiB    2.27%   1.2MB / 500kB    8.1MB / 0B       12
f6e5d4c3b2a1   db      8.50%   256MiB / 1.945GiB    12.85%   500kB / 1.5MB    50MB / 25MB      35
b1c2d3e4f5a6   cache   0.15%   12.5MiB / 1.945GiB    0.63%   200kB / 100kB    0B / 0B          4
```

</td>
<td>

~100 tokens

```json
{
  "containers": [
    {
      "id": "a1b2c3d4e5f6",
      "name": "web",
      "cpuPercent": 2.35,
      "memoryUsage": "45.2MiB",
      "memoryLimit": "1.945GiB",
      "memoryPercent": 2.27,
      "netIO": "1.2MB / 500kB",
      "blockIO": "8.1MB / 0B",
      "pids": 12
    },
    {
      "id": "f6e5d4c3b2a1",
      "name": "db",
      "cpuPercent": 8.5,
      "memoryUsage": "256MiB",
      "memoryLimit": "1.945GiB",
      "memoryPercent": 12.85,
      "netIO": "500kB / 1.5MB",
      "blockIO": "50MB / 25MB",
      "pids": 35
    },
    {
      "id": "b1c2d3e4f5a6",
      "name": "cache",
      "cpuPercent": 0.15,
      "memoryUsage": "12.5MiB",
      "memoryLimit": "1.945GiB",
      "memoryPercent": 0.63,
      "netIO": "200kB / 100kB",
      "blockIO": "0B / 0B",
      "pids": 4
    }
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

~50 tokens

```json
{
  "containers": [
    { "id": "a1b2c3d4e5f6", "name": "web", "cpuPercent": 2.35, "memoryPercent": 2.27, "pids": 12 },
    { "id": "f6e5d4c3b2a1", "name": "db", "cpuPercent": 8.5, "memoryPercent": 12.85, "pids": 35 },
    { "id": "b1c2d3e4f5a6", "name": "cache", "cpuPercent": 0.15, "memoryPercent": 0.63, "pids": 4 }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| 3 containers | ~250       | ~100      | ~50          | 60-80%  |

## Notes

- The `--no-stream` flag captures a single snapshot rather than a continuous stream
- CPU and memory percentages are parsed from Docker's string format (e.g., `2.35%` becomes `2.35`)
- Memory usage and limit are split from the `MemUsage` field (e.g., `45.2MiB / 1.945GiB`)
- Container names have the leading `/` stripped
- Compact mode drops `memoryUsage`, `memoryLimit`, `netIO`, and `blockIO`, keeping only `id`, `name`, `cpuPercent`, `memoryPercent`, and `pids`
