# db > mysql-query

Executes a MySQL query and returns structured tabular output.

**Command**: `mysql --batch --raw -e <query>`

## Input Parameters

| Parameter  | Type    | Default | Description                                                |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `query`    | string  | --      | SQL query to execute                                       |
| `database` | string  | --      | Database name to connect to                                |
| `host`     | string  | --      | Database host                                              |
| `port`     | number  | `3306`  | Database port                                              |
| `user`     | string  | --      | Database user                                              |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- SELECT Query

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~90 tokens

```
$ mysql --batch --raw -e "SELECT id, name, status FROM orders LIMIT 4" shop
id	name	status
1	Order #1001	shipped
2	Order #1002	pending
3	Order #1003	delivered
4	Order #1004	cancelled
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "columns": ["id", "name", "status"],
  "rows": [
    { "id": "1", "name": "Order #1001", "status": "shipped" },
    { "id": "2", "name": "Order #1002", "status": "pending" },
    { "id": "3", "name": "Order #1003", "status": "delivered" },
    { "id": "4", "name": "Order #1004", "status": "cancelled" }
  ],
  "rowCount": 4,
  "exitCode": 0,
  "duration": 35
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
  "rowCount": 4,
  "exitCode": 0,
  "duration": 35
}
```

</td>
</tr>
</table>

## Error -- Unknown Database

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ mysql --batch --raw -e "SELECT 1" nonexistent
ERROR 1049 (42000): Unknown database 'nonexistent'
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "rowCount": 0,
  "exitCode": 1,
  "duration": 18,
  "error": "ERROR 1049 (42000): Unknown database 'nonexistent'"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "success": false,
  "rowCount": 0,
  "exitCode": 1,
  "duration": 18,
  "error": "ERROR 1049 (42000): Unknown database 'nonexistent'"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 4-row SELECT   | ~90        | ~80       | ~15          | 11-83%  |
| Unknown DB     | ~20        | ~20       | ~20          | 0%      |

## Notes

- WARNING: The query is executed as-is against the target database -- do not pass untrusted input
- Uses `--batch --raw` for tab-separated output without escaping, enabling reliable parsing
- All row values are returned as strings or null, matching MySQL's text output format
- Compact mode drops `columns` and `rows` arrays, keeping only `rowCount` and metadata
- Token savings scale with result set size
