# db > mysql-list-databases

Lists all MySQL databases with structured output.

**Command**: `mysql --batch -e "SHOW DATABASES"`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `host`    | string  | --      | Database host                                              |
| `port`    | number  | `3306`  | Database port                                              |
| `user`    | string  | --      | Database user                                              |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Databases Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ mysql --batch -e "SHOW DATABASES"
Database
information_schema
myapp_dev
myapp_test
mysql
performance_schema
sys
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "databases": [
    { "name": "information_schema" },
    { "name": "myapp_dev" },
    { "name": "myapp_test" },
    { "name": "mysql" },
    { "name": "performance_schema" },
    { "name": "sys" }
  ],
  "total": 6,
  "exitCode": 0,
  "duration": 22
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
  "total": 6,
  "exitCode": 0,
  "duration": 22
}
```

</td>
</tr>
</table>

## Error -- Access Denied

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~25 tokens

```
$ mysql --batch -e "SHOW DATABASES" -u baduser
ERROR 1045 (28000): Access denied for user 'baduser'@'localhost' (using password: NO)
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "total": 0,
  "exitCode": 1,
  "duration": 15,
  "error": "ERROR 1045 (28000): Access denied for user 'baduser'@'localhost' (using password: NO)"
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
  "total": 0,
  "exitCode": 1,
  "duration": 15,
  "error": "ERROR 1045 (28000): Access denied for user 'baduser'@'localhost' (using password: NO)"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| 6 databases   | ~40        | ~50       | ~10          | 0-75%   |
| Access denied | ~25        | ~25       | ~25          | 0%      |

## Notes

- MySQL database entries only include the `name` field (unlike PostgreSQL which includes owner, encoding, etc.)
- Compact mode drops the `databases` array, keeping only the `total` count and metadata
- The structured output format is consistent with `psql-list-databases` for cross-database tooling
