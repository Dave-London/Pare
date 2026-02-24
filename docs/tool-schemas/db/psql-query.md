# db > psql-query

Executes a PostgreSQL query via psql and returns structured tabular output.

**Command**: `psql -A -c <query>`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `query`    | string  | --      | SQL query to execute                                       |
| `database` | string  | --      | Database name to connect to                                |
| `host`     | string  | --      | Database host                                              |
| `port`     | number  | `5432`  | Database port                                              |
| `user`     | string  | --      | Database user                                              |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- SELECT Query

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ psql -A -d myapp -c "SELECT id, name, email FROM users LIMIT 5"
id|name|email
1|Alice|alice@example.com
2|Bob|bob@example.com
3|Carol|carol@example.com
4|Dave|dave@example.com
5|Eve|eve@example.com
(5 rows)
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "columns": ["id", "name", "email"],
  "rows": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" },
    { "id": "2", "name": "Bob", "email": "bob@example.com" },
    { "id": "3", "name": "Carol", "email": "carol@example.com" },
    { "id": "4", "name": "Dave", "email": "dave@example.com" },
    { "id": "5", "name": "Eve", "email": "eve@example.com" }
  ],
  "rowCount": 5,
  "exitCode": 0,
  "duration": 42
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
  "rowCount": 5,
  "exitCode": 0,
  "duration": 42
}
```

</td>
</tr>
</table>

## Error -- Connection Refused

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ psql -A -h badhost -c "SELECT 1"
psql: error: connection to server at "badhost", port 5432 failed: could not translate host name "badhost" to address: Name or service not known
```

</td>
<td>

~30 tokens

```json
{
  "success": false,
  "rowCount": 0,
  "exitCode": 2,
  "duration": 1200,
  "error": "connection to server at \"badhost\", port 5432 failed: could not translate host name \"badhost\" to address: Name or service not known"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "success": false,
  "rowCount": 0,
  "exitCode": 2,
  "duration": 1200,
  "error": "connection to server at \"badhost\", port 5432 failed: could not translate host name \"badhost\" to address: Name or service not known"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| 5-row SELECT      | ~120       | ~100      | ~15          | 17-88%  |
| Connection error  | ~40        | ~30       | ~25          | 25-38%  |

## Notes

- WARNING: The query is executed as-is against the target database -- do not pass untrusted input
- Uses `psql -A` (unaligned output mode) for reliable parsing of column-separated data
- All row values are returned as strings or null, matching psql's text output format
- Compact mode drops `columns` and `rows` arrays, keeping only `rowCount` and metadata
- Token savings scale with the number of rows returned; large result sets see the highest savings
