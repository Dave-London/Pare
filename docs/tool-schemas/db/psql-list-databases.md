# db > psql-list-databases

Lists all PostgreSQL databases via psql with owner, encoding, and size info.

**Command**: `psql -l -A`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `host`    | string  | --      | Database host                                              |
| `port`    | number  | `5432`  | Database port                                              |
| `user`    | string  | --      | Database user                                              |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Databases Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ psql -l -A
Name|Owner|Encoding|Collate|Ctype|Access privileges
postgres|postgres|UTF8|en_US.UTF-8|en_US.UTF-8|
myapp_dev|appuser|UTF8|en_US.UTF-8|en_US.UTF-8|
myapp_test|appuser|UTF8|en_US.UTF-8|en_US.UTF-8|
template0|postgres|UTF8|en_US.UTF-8|en_US.UTF-8|=c/postgres
+postgres=CTc/postgres
template1|postgres|UTF8|en_US.UTF-8|en_US.UTF-8|=c/postgres
+postgres=CTc/postgres
(5 rows)
```

</td>
<td>

~120 tokens

```json
{
  "success": true,
  "databases": [
    { "name": "postgres", "owner": "postgres", "encoding": "UTF8", "collation": "en_US.UTF-8", "ctype": "en_US.UTF-8", "size": "7 MB" },
    { "name": "myapp_dev", "owner": "appuser", "encoding": "UTF8", "collation": "en_US.UTF-8", "ctype": "en_US.UTF-8", "size": "12 MB" },
    { "name": "myapp_test", "owner": "appuser", "encoding": "UTF8", "collation": "en_US.UTF-8", "ctype": "en_US.UTF-8", "size": "8 MB" },
    { "name": "template0", "owner": "postgres", "encoding": "UTF8", "collation": "en_US.UTF-8", "ctype": "en_US.UTF-8", "size": "7 MB" },
    { "name": "template1", "owner": "postgres", "encoding": "UTF8", "collation": "en_US.UTF-8", "ctype": "en_US.UTF-8", "size": "7 MB" }
  ],
  "total": 5,
  "exitCode": 0,
  "duration": 38
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
  "total": 5,
  "exitCode": 0,
  "duration": 38
}
```

</td>
</tr>
</table>

## Error -- Authentication Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~35 tokens

```
$ psql -l -A -U baduser
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  password authentication failed for user "baduser"
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "total": 0,
  "exitCode": 2,
  "duration": 85,
  "error": "FATAL:  password authentication failed for user \"baduser\""
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
  "exitCode": 2,
  "duration": 85,
  "error": "FATAL:  password authentication failed for user \"baduser\""
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| 5 databases listed     | ~200       | ~120      | ~10          | 40-95%  |
| Authentication failure | ~35        | ~25       | ~25          | 29%     |

## Notes

- Each database entry includes optional `owner`, `encoding`, `collation`, `ctype`, and `size` fields
- Compact mode drops the `databases` array, keeping only the `total` count and metadata
- Token savings scale with the number of databases on the server
