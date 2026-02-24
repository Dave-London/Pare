# db > redis-info

Gets Redis server info with structured sections (server, clients, memory, etc.).

**Command**: `redis-cli INFO [section]`

## Input Parameters

| Parameter  | Type    | Default | Description                                                              |
| ---------- | ------- | ------- | ------------------------------------------------------------------------ |
| `section`  | string  | --      | Specific info section to retrieve (e.g., server, clients, memory, stats) |
| `host`     | string  | --      | Redis host                                                               |
| `port`     | number  | `6379`  | Redis port                                                               |
| `password` | string  | --      | Redis password (AUTH)                                                    |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens               |

## Success -- Memory Section

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ redis-cli INFO memory
# Memory
used_memory:1048576
used_memory_human:1.00M
used_memory_rss:2097152
used_memory_rss_human:2.00M
used_memory_peak:1572864
used_memory_peak_human:1.50M
used_memory_peak_perc:66.67%
used_memory_overhead:524288
used_memory_startup:262144
used_memory_dataset:524288
allocator_allocated:1048576
allocator_active:1310720
allocator_resident:2097152
mem_fragmentation_ratio:2.00
mem_allocator:jemalloc-5.3.0
```

</td>
<td>

~120 tokens

```json
{
  "success": true,
  "sections": [
    {
      "name": "Memory",
      "entries": {
        "used_memory": "1048576",
        "used_memory_human": "1.00M",
        "used_memory_rss": "2097152",
        "used_memory_rss_human": "2.00M",
        "used_memory_peak": "1572864",
        "used_memory_peak_human": "1.50M",
        "used_memory_peak_perc": "66.67%",
        "used_memory_overhead": "524288",
        "used_memory_startup": "262144",
        "used_memory_dataset": "524288",
        "allocator_allocated": "1048576",
        "allocator_active": "1310720",
        "allocator_resident": "2097152",
        "mem_fragmentation_ratio": "2.00",
        "mem_allocator": "jemalloc-5.3.0"
      }
    }
  ],
  "exitCode": 0,
  "duration": 5
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
  "exitCode": 0,
  "duration": 5
}
```

</td>
</tr>
</table>

## Error -- Authentication Required

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ redis-cli INFO
NOAUTH Authentication required.
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "exitCode": 0,
  "duration": 4,
  "error": "NOAUTH Authentication required."
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
  "success": false,
  "exitCode": 0,
  "duration": 4,
  "error": "NOAUTH Authentication required."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| Memory section       | ~200       | ~120      | ~10          | 40-95%  |
| Auth required        | ~15        | ~15       | ~15          | 0%      |

## Notes

- Without a `section` parameter, Redis returns all sections (server, clients, memory, stats, replication, cpu, modules, keyspace, etc.), which can be 500+ tokens of raw output
- Each section is parsed into a structured `{ name, entries }` object with key-value pairs
- Compact mode drops the `sections` array entirely, keeping only `success`, `exitCode`, and `duration`
- Use `section` to request only the data you need (e.g., "memory", "clients", "stats") for smaller responses
